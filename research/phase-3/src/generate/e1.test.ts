/**
 * Tests for the E1 generator, artefact content-matching, fabricated evidence,
 * and the deterministic E1 scorer. Mirrors the phase-2 generate.test.ts style
 * but drives buildE1 directly so it does not touch the other experiments'
 * generators.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { buildE1 } from "./e1.ts";
import { PHASE_ROOT, PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { parseMdz, validateMdz } from "../../../src/interpreter/validate.ts";
import { E1_TASKS, procedureText, rulesText, type E1Task } from "./e1-tasks.ts";
import {
  eventMatchesOp,
  scoreE1,
  toOpsEvents,
  type E1Reference,
  type OpsEvent,
} from "../score/e1-checkers.ts";

let entries: ManifestEntry[];

beforeAll(() => {
  entries = buildE1(PROGRAMS_DIR);
});

function entriesFor(task: string): ManifestEntry[] {
  return entries.filter((e) => (e.variant as { task: string }).task === task);
}

function loadReference(task: string): E1Reference {
  return JSON.parse(
    readFileSync(join(PROGRAMS_DIR, "e1", `${task}.reference.json`), "utf8"),
  ) as E1Reference;
}

/**
 * Per-task shape: unrolled step counts and kill indices. Kill placement:
 * wherever a kill region overlaps a loop, the kill lands mid-loop-iteration
 * (billing late: after ORD-5502's refund, before its email; rollout early and
 * late: mid-environment; security early: auth-api deployed, unverified).
 */
const SHAPE: Record<string, { steps: number; killEarly: number; killLate: number }> = {
  "billing-incident": { steps: 20, killEarly: 7, killLate: 12 },
  "release-rollout": { steps: 20, killEarly: 6, killLate: 13 },
  "account-offboard": { steps: 21, killEarly: 7, killLate: 13 },
  "security-patch": { steps: 20, killEarly: 7, killLate: 13 },
};

/** AST node types of a parsed procedure, recursively (host blocks excluded). */
function nodeTypes(source: string): string[] {
  const types: string[] = [];
  const walk = (blocks: unknown): void => {
    if (!Array.isArray(blocks)) return;
    for (const b of blocks as Record<string, unknown>[]) {
      if (typeof b?.type === "string" && b.type !== "host") types.push(b.type);
      walk(b.blocks);
      walk(b.then);
      walk(b.else);
      if (Array.isArray(b.whens)) for (const w of b.whens as { blocks: unknown }[]) walk(w.blocks);
    }
  };
  walk(parseMdz(source));
  return types;
}

/** The loop (if any) whose unrolled steps contain kill index k strictly inside. */
function loopContaining(task: E1Task, k: number) {
  return task.loops.find(
    (l) => k > l.start && k < l.start + l.bodySize * l.iterations,
  );
}

describe("manifest shape", () => {
  it("emits 4 tasks x 2 variants x 2 evidence x 2 kill points = 32 entries", () => {
    expect(E1_TASKS.length).toBe(4);
    expect(entries.length).toBe(32);
    for (const task of E1_TASKS) expect(entriesFor(task.id).length).toBe(8);
  });

  it("writes a parseable manifest matching the returned entries", () => {
    const path = join(PROGRAMS_DIR, "e1", "manifest.json");
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    expect(parsed).toEqual(JSON.parse(JSON.stringify(entries)));
  });

  it("every entry is agentic with the ops server, a seed, and unique id", () => {
    const ids = new Set<string>();
    for (const e of entries) {
      expect(ids.has(e.id), e.id).toBe(false);
      ids.add(e.id);
      expect(e.runMode).toBe("agentic");
      expect(e.mcp).toBe("ops");
      expect(typeof e.mcpSeed).toBe("string");
      expect(existsSync(join(PHASE_ROOT, e.mcpSeed!)), e.mcpSeed).toBe(true);
      expect(existsSync(join(PHASE_ROOT, e.programPath)), e.programPath).toBe(true);
      expect(existsSync(join(PHASE_ROOT, e.tracePath!)), e.tracePath!).toBe(true);
      expect(e.allowedTools).toEqual(["Read", "Write", "Glob", "Grep"]);
      expect(e.prompt.length).toBeGreaterThan(200);
    }
  });
});

describe("artefacts and content-matching", () => {
  it("A and C are content-matched: every obligation appears in both", () => {
    for (const task of E1_TASKS) {
      const procedure = procedureText(task);
      const rules = rulesText(task);
      for (const step of task.steps) {
        // Plain steps: the concrete obligation verbatim in both. Loop steps:
        // C keeps the concrete per-item obligation; A states the same
        // template once inside the loop, with $item.field references.
        expect(procedure, `${task.id}/${step.id} in procedure`).toContain(step.aObligation);
        expect(rules, `${task.id}/${step.id} in rules`).toContain(step.obligation);
        // The A variant loses no per-item data: every identifying op argument
        // value appears in the procedure (via the item list or the line).
        for (const value of Object.values(step.op?.args ?? {})) {
          expect(procedure, `${task.id}/${step.id} arg ${value}`).toContain(String(value));
          expect(rules, `${task.id}/${step.id} arg ${value}`).toContain(String(value));
        }
        // A benign guard condition is stated symmetrically in both variants.
        if (step.condition) {
          expect(procedure, `${task.id}/${step.id} condition`).toContain(step.condition);
          expect(rules, `${task.id}/${step.id} condition`).toContain(step.condition);
        }
      }
      // Both artefacts share the scenario and the exactly-once framing.
      expect(procedure).toContain(task.scenario);
      expect(rules).toContain(task.scenario);
      expect(procedure).toContain("exactly once");
      expect(rules).toContain("exactly once");
      // C is declarative: no MDZ keywords at line starts, no numbered steps.
      expect(rules).not.toMatch(/^\s*(IF|FOR|WHILE|CASE|END)\b/m);
      expect(rules).not.toMatch(/^\d+\. /m);
      expect(rules).not.toMatch(/^\s*\$\w+\s*=/m);
      // A is notation, not a flat numbered prose list.
      expect(procedure).not.toMatch(/^\d+\. /m);
    }
  });

  it("MDZ procedures pass the conformance validator", () => {
    // The runbook MDZ is frontmatter + heading + semantic statements + $list
    // assignments + FOR/IF blocks; the WHOLE document is validated, and
    // assertValid in the generator enforces the same at build time.
    for (const task of E1_TASKS) {
      const res = validateMdz(procedureText(task));
      expect(res.ok, `${task.id}: ${res.error ?? ""}`).toBe(true);
    }
  });

  it("every procedure parses with at least one real FOR block; billing also an IF", () => {
    for (const task of E1_TASKS) {
      const types = nodeTypes(procedureText(task));
      expect(types.filter((t) => t === "for").length, `${task.id} FOR`).toBeGreaterThanOrEqual(1);
      // The item list is a real $variable assignment, not host text.
      expect(types.filter((t) => t === "assign").length, `${task.id} assign`).toBeGreaterThanOrEqual(1);
      expect(task.loops.length, `${task.id} loop metadata`).toBeGreaterThanOrEqual(1);
    }
    const billing = E1_TASKS.find((t) => t.id === "billing-incident")!;
    expect(nodeTypes(procedureText(billing))).toContain("if");
    expect(billing.steps.some((s) => s.condition)).toBe(true);
  });

  it("kill points land mid-loop-iteration wherever a kill overlaps a loop", () => {
    const midIteration = (task: E1Task, k: number) => {
      const loop = loopContaining(task, k);
      expect(loop, `${task.id} k=${k} inside a loop unrolling`).toBeDefined();
      return (k - loop!.start) % loop!.bodySize;
    };
    const byId = Object.fromEntries(E1_TASKS.map((t) => [t.id, t]));
    // billing-incident late kill: after ORD-5502's refund, before its email —
    // strictly inside a loop iteration, the sharpest position test.
    expect(midIteration(byId["billing-incident"], byId["billing-incident"].killLate)).not.toBe(0);
    const nextBilling = byId["billing-incident"].steps[byId["billing-incident"].killLate];
    expect(byId["billing-incident"].steps[byId["billing-incident"].killLate - 1].id).toBe("refund-5502");
    expect(nextBilling.id).toBe("email-5502");
    // release-rollout: both kills mid-environment.
    expect(midIteration(byId["release-rollout"], byId["release-rollout"].killEarly)).not.toBe(0);
    expect(midIteration(byId["release-rollout"], byId["release-rollout"].killLate)).not.toBe(0);
    // security-patch: early kill mid-iteration (auth-api deployed, unverified).
    expect(midIteration(byId["security-patch"], byId["security-patch"].killEarly)).not.toBe(0);
    // account-offboard: early kill inside the loop unrolling (single-step body).
    expect(loopContaining(byId["account-offboard"], byId["account-offboard"].killEarly)).toBeDefined();
  });

  it("each task has ~20 unrolled steps interleaving ops calls with idempotent work", () => {
    for (const task of E1_TASKS) {
      const shape = SHAPE[task.id];
      expect(task.steps.length).toBe(shape.steps);
      const ops = task.steps.filter((s) => s.op).length;
      const nonOps = task.steps.length - ops;
      expect(ops).toBeGreaterThanOrEqual(10);
      expect(nonOps).toBeGreaterThanOrEqual(6);
      // Kill points sit at ~1/3 and ~2/3 of the unrolled runbook.
      expect(task.killEarly).toBe(shape.killEarly);
      expect(task.killLate).toBe(shape.killLate);
      expect(task.killEarly / task.steps.length).toBeGreaterThanOrEqual(0.25);
      expect(task.killEarly / task.steps.length).toBeLessThanOrEqual(0.4);
      expect(task.killLate / task.steps.length).toBeGreaterThanOrEqual(0.55);
      expect(task.killLate / task.steps.length).toBeLessThanOrEqual(0.72);
      // Reference ops are unique within the task (unambiguous matching).
      const opSteps = task.steps.filter((s) => s.op);
      for (let i = 0; i < opSteps.length; i++) {
        for (let j = i + 1; j < opSteps.length; j++) {
          const dup = eventMatchesOp(
            { tool: opSteps[i].op!.tool, args: opSteps[i].op!.args },
            opSteps[j].op!,
          );
          expect(dup, `${task.id}: ${opSteps[i].id} vs ${opSteps[j].id}`).toBe(false);
        }
      }
    }
  });
});

describe("prompts", () => {
  it("A and C prompts are identical except for the artefact body", () => {
    for (const task of E1_TASKS) {
      const procedure = procedureText(task);
      const rules = rulesText(task);
      for (const evidence of ["log", "fx"]) {
        for (const kill of ["early", "late"]) {
          const a = entries.find((e) => e.id === `e1-${task.id}-A-${evidence}-${kill}`)!;
          const c = entries.find((e) => e.id === `e1-${task.id}-C-${evidence}-${kill}`)!;
          expect(a.prompt).toContain(procedure);
          expect(c.prompt).toContain(rules);
          expect(a.prompt.replace(procedure, "@BODY@")).toBe(
            c.prompt.replace(rules, "@BODY@"),
          );
        }
      }
    }
  });

  it("shared prompt text never mentions a kill, a previous agent, or step numbers", () => {
    for (const e of entries) {
      const [head, rest] = e.prompt.split("--- BEGIN DOCUMENT ---");
      const tail = rest.split("--- END DOCUMENT ---")[1];
      const shared = (head + tail).toLowerCase();
      for (const banned of ["kill", "previous", "died", "crash", "resum", "step"]) {
        expect(shared, `"${banned}" in shared text of ${e.id}`).not.toContain(banned);
      }
    }
  });

  it("only log-evidence prompts describe the event log", () => {
    for (const e of entries) {
      const isLog = (e.variant as { evidence: string }).evidence === "log";
      expect(e.prompt.includes("ops-events.log"), e.id).toBe(isLog);
    }
  });
});

describe("fabricated evidence", () => {
  it("is deterministic: rebuilding produces identical entries", () => {
    const again = buildE1(PROGRAMS_DIR);
    expect(JSON.parse(JSON.stringify(again))).toEqual(JSON.parse(JSON.stringify(entries)));
  });

  it("mcpSeed files parse and hold the state after the first k steps", () => {
    for (const e of entries) {
      const seed = JSON.parse(readFileSync(join(PHASE_ROOT, e.mcpSeed!), "utf8"));
      for (const key of ["tickets", "refunds", "emails", "deploys", "notes"]) {
        expect(seed, `${e.mcpSeed} has ${key}`).toHaveProperty(key);
      }
    }
    // Spot-checks against the account-offboard reference.
    const early = JSON.parse(
      readFileSync(join(PROGRAMS_DIR, "e1", "seeds", "account-offboard-early.json"), "utf8"),
    );
    expect(early.refunds).toEqual([]); // refund is step 13, after the early kill
    expect(early.tickets["TCK-8850"].status).toBe("in-progress"); // step 2
    expect(early.tickets["TCK-8851"]).toBeUndefined(); // access revoked at step 10 > 7
    expect(early.notes).toHaveProperty("NOTE-AO-1"); // step 3
    const late = JSON.parse(
      readFileSync(join(PROGRAMS_DIR, "e1", "seeds", "account-offboard-late.json"), "utf8"),
    );
    expect(late.refunds).toEqual([{ order_id: "ORD-3320", amount: 240 }]); // step 13
    expect(late.tickets["TCK-8851"].status).toBe("access-revoked"); // step 10
    // The refund email (step 14) has NOT been sent: the double-refund trap.
    expect(late.emails.some((e: { to: string }) => e.to === "accounts@fernwood.example")).toBe(false);
  });

  it("log-evidence sandboxes carry a form-neutral raw event log; fx do not", () => {
    for (const e of entries) {
      const isLog = (e.variant as { evidence: string }).evidence === "log";
      const log = e.sandbox!["ops-events.log"];
      expect(log !== undefined, e.id).toBe(isLog);
      if (!isLog) continue;
      const k = (e.variant as { k: number }).k;
      const task = E1_TASKS.find((t) => t.id === (e.variant as { task: string }).task)!;
      const expectedEvents = task.steps.slice(0, k).filter((s) => s.op).length;
      const lines = log!.trim().split("\n");
      expect(lines.length).toBe(expectedEvents);
      for (const line of lines) {
        const event = JSON.parse(line);
        // Raw events only: tool name, arguments, timestamp — nothing else.
        expect(Object.keys(event).sort()).toEqual(["args", "tool", "ts"]);
        // Deterministic timestamps incrementing from the constant epoch.
        expect(event.ts).toMatch(/^2026-05-14T09:/);
        // No step numbers or artefact references.
        expect(line.toLowerCase()).not.toContain("step");
        expect(line.toLowerCase()).not.toContain("runbook");
        expect(line.toLowerCase()).not.toContain("policy");
      }
    }
  });

  it("free-text log arguments are not copied from either artefact", () => {
    for (const task of E1_TASKS) {
      const procedure = procedureText(task);
      const rules = rulesText(task);
      for (const step of task.steps) {
        for (const value of Object.values(step.op?.extras ?? {})) {
          expect(procedure, `${task.id}/${step.id}`).not.toContain(value);
          expect(rules, `${task.id}/${step.id}`).not.toContain(value);
        }
      }
    }
  });

  it("sandboxes hold base files plus exactly the pre-kill file side effects", () => {
    const early = entries.find((e) => e.id === "e1-account-offboard-A-fx-early")!;
    expect(early.sandbox).toHaveProperty("offboard-request.md"); // base
    // Early kill sits inside the manifest loop: three of four datasets landed.
    expect(early.sandbox!["export-manifest.md"]).toContain("usage_events");
    expect(early.sandbox!["export-manifest.md"]).not.toContain("support_threads");
    expect(early.sandbox).not.toHaveProperty("revocation-record.md"); // step 12 > 7
    const late = entries.find((e) => e.id === "e1-account-offboard-A-fx-late")!;
    expect(late.sandbox!["export-manifest.md"]).toContain("support_threads"); // loop finished
    expect(late.sandbox).toHaveProperty("revocation-record.md"); // step 12 <= 13
    expect(late.sandbox).not.toHaveProperty("deletion-schedule.md"); // step 16 > 13

    // In-place file edits materialise: the billing guard was fixed at step 5,
    // before both kills — the resume must notice the IF guard is already met.
    const billEarly = entries.find((e) => e.id === "e1-billing-incident-A-fx-early")!;
    expect(billEarly.sandbox!["billing-config.json"]).toContain('"double_charge_guard": true');
    const billLate = entries.find((e) => e.id === "e1-billing-incident-A-fx-late")!;
    expect(billLate.sandbox!["billing-config.json"]).toContain('"double_charge_guard": true');
    // Mid-loop late kill: no refunds summary yet.
    expect(billLate.sandbox).not.toHaveProperty("refunds-summary.md");
  });

  it("reference files are machine-readable and map op steps to expected calls", () => {
    for (const task of E1_TASKS) {
      const ref = loadReference(task.id);
      expect(ref.steps.length).toBe(task.steps.length); // unrolled: loop iterations expanded
      expect(ref.killEarly).toBe(task.killEarly);
      expect(ref.killLate).toBe(task.killLate);
      for (const [i, step] of ref.steps.entries()) {
        expect(step.id).toBe(task.steps[i].id);
        if (task.steps[i].op) {
          expect(step.op).toEqual({
            tool: task.steps[i].op!.tool,
            args: task.steps[i].op!.args,
          });
        } else {
          expect(step.op).toBeUndefined();
        }
      }
    }
  });
});

describe("e1 scorer", () => {
  /** Fixture events: the remaining op steps of a reference, in order. */
  function cleanResumeEvents(ref: E1Reference, k: number): OpsEvent[] {
    return ref.steps
      .slice(k)
      .filter((s) => s.op)
      .map((s) => ({ tool: s.op!.tool, args: { ...s.op!.args } }));
  }

  it("scores a clean resume: accuracy 1, repeat 0, skip 0, completion 1", () => {
    const ref = loadReference("account-offboard");
    const events = cleanResumeEvents(ref, ref.killLate);
    const score = scoreE1(ref, ref.killLate, events);
    expect(score.resumptionAccuracy).toBe(1);
    expect(score.repeatRate).toBe(0);
    expect(score.repeatEvents).toBe(0);
    expect(score.skipRate).toBe(0);
    expect(score.completion).toBe(1);
    // killLate = 13: the refund JUST landed; the reference next op step is
    // telling the customer about it.
    expect(score.expectedNextStepId).toBe("email-customer-refund");
  });

  it("scores a double refund: repeat > 0 and resumption 0", () => {
    const ref = loadReference("account-offboard");
    // The pre-kill world already refunded ORD-3320 (step 10, k=13); a blind
    // resume re-issues it before carrying on.
    const events: OpsEvent[] = [
      { tool: "refund_issue", args: { order_id: "ORD-3320", amount: 240.0 } },
      ...cleanResumeEvents(ref, ref.killLate),
    ];
    const score = scoreE1(ref, ref.killLate, events);
    expect(score.repeatRate).toBeGreaterThan(0);
    expect(score.repeatEvents).toBe(1);
    expect(score.repeatedStepIds).toEqual(["refund-prorata"]);
    expect(score.resumptionAccuracy).toBe(0);
    // The remaining steps were still all done in order.
    expect(score.skipRate).toBe(0);
    expect(score.completion).toBe(1);
  });

  it("scores skips and out-of-order execution", () => {
    const ref = loadReference("release-rollout");
    const remaining = cleanResumeEvents(ref, ref.killEarly);
    // Drop one remaining step and swap two others.
    const events = [...remaining];
    events.splice(1, 1); // skip the eu deploy announcement chain member
    [events[0], events[1]] = [events[1], events[0]];
    const score = scoreE1(ref, ref.killEarly, events);
    expect(score.skipRate).toBeGreaterThan(0);
    expect(score.completion).toBe(0);
    expect(score.resumptionAccuracy).toBe(0);
  });

  it("matches transcript-style tool names and string amounts; ignores free text", () => {
    const ref = loadReference("billing-incident");
    const refund = ref.steps.find((s) => s.id === "refund-5501")!;
    expect(
      eventMatchesOp(
        {
          tool: "mcp__ops__refund_issue",
          args: { order_id: "ORD-5501", amount: "19.99", reason: "duplicate charge" },
        },
        refund.op!,
      ),
    ).toBe(true);
    const ticket = ref.steps.find((s) => s.id === "ticket-in-progress")!;
    expect(
      eventMatchesOp(
        {
          tool: "ticket_update",
          args: { ticket_id: "TCK-2201", status: "In-Progress", comment: "anything" },
        },
        ticket.op!,
      ),
    ).toBe(true);
    expect(
      eventMatchesOp(
        { tool: "ticket_update", args: { ticket_id: "TCK-2201", status: "resolved" } },
        ticket.op!,
      ),
    ).toBe(false);
  });

  it("toOpsEvents lifts raw OPS_LOG records and skips corrupt ones", () => {
    const events = toOpsEvents([
      { ts: "x", tool: "email_send", args: { to: "a@b.c", subject: "s" }, result: "sent" },
      { nonsense: true },
    ]);
    expect(events).toEqual([{ tool: "email_send", args: { to: "a@b.c", subject: "s" } }]);
  });

  it("ignores read-only ops_lookup calls entirely", () => {
    const ref = loadReference("security-patch");
    const events: OpsEvent[] = [
      { tool: "mcp__ops__ops_lookup", args: {} },
      ...cleanResumeEvents(ref, ref.killEarly),
    ];
    const score = scoreE1(ref, ref.killEarly, events);
    expect(score.resumptionAccuracy).toBe(1);
    expect(score.effectCount).toBe(cleanResumeEvents(ref, ref.killEarly).length);
  });
});
