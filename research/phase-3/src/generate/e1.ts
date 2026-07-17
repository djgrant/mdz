/**
 * E1 — kill-and-resume (phase-3 flagship).
 *
 * A scripted first-half execution died mid-runbook; a fresh session must
 * finish the job. For each of the 4 handwritten tasks (e1-tasks.ts) this
 * generator emits 2 variants x 2 evidence levels x 2 kill points = 32
 * model-agnostic manifest entries (models x n are the runner's axis).
 *
 *   - A-procedure: the runbook as an MDZ procedure — ordered statements,
 *                  $item lists, FOR ... END loops over repeated groups, and
 *                  an IF ... END guard where a step is conditional
 *   - C-rules:     the same obligations + ordering constraints as prose policy
 *                  (content-matched via the shared obligation phrases)
 *   - evidence log: fabricated raw event log (ops-events.log) + working dir
 *   - evidence fx:  side effects only (working dir + seeded ops state)
 *   - kill early (~1/3) / late (~2/3)
 *
 * Scripted partial execution is fabricated deterministically, no model runs:
 *   (a) mcpSeed JSON — ops-server state after the first k steps, computed by
 *       folding the harness's own applyCall over the reference op calls;
 *   (b) sandbox files — the task's base files plus every file side effect the
 *       first k steps produced;
 *   (c) for `log` evidence, an event log in the sandbox. FORM-NEUTRAL: raw
 *       events only ({ts, tool, args}), fixed timestamps incrementing from a
 *       constant epoch, no step numbers, no references to either artefact.
 *       (Tool ARGUMENTS necessarily coincide with values the artefacts pin
 *       down — any faithful execution produces those exact ids/subjects — but
 *       free-text args are worded independently of both artefacts.)
 *
 * A machine-readable reference step list is written next to the manifest
 * (<task>.reference.json); the checkers derive the remaining-step set per
 * kill point from it.
 *
 * Deterministic: no Date.now, no randomness.
 */

import { join } from "node:path";

import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";
import { E1_TASKS, procedureText, rulesText, type E1Step, type E1Task } from "./e1-tasks.ts";
import { applyCall, emptyState, type OpsState } from "../harness/ops-state.ts";

// ---------------------------------------------------------------------------
// Fabricated pre-kill world
// ---------------------------------------------------------------------------

/** Constant epoch for fabricated log timestamps; 90s between events. */
const LOG_EPOCH_MS = Date.UTC(2026, 4, 14, 9, 0, 0); // 2026-05-14T09:00:00Z
const LOG_STEP_MS = 90_000;

/** Full argument object the pre-kill executor would have sent for a step. */
function callArgs(step: E1Step): Record<string, unknown> {
  return { ...(step.op!.extras ?? {}), ...step.op!.args };
}

/** Ops-server state after the first k steps (identical semantics to the server). */
function seedState(task: E1Task, k: number): OpsState {
  const state = emptyState();
  task.steps.slice(0, k).forEach((step) => {
    if (step.op) applyCall(state, step.op.tool, callArgs(step));
  });
  return state;
}

/**
 * Form-neutral event log of the first k steps' ops calls: tool, arguments,
 * timestamp. Timestamps are indexed by step position so gaps where non-ops
 * work happened are visible, which is what a real wall clock would show.
 */
function eventLog(task: E1Task, k: number): string {
  const lines: string[] = [];
  task.steps.slice(0, k).forEach((step, i) => {
    if (!step.op) return;
    const ts = new Date(LOG_EPOCH_MS + i * LOG_STEP_MS).toISOString();
    lines.push(JSON.stringify({ ts, tool: step.op.tool, args: callArgs(step) }));
  });
  return lines.join("\n") + "\n";
}

/** Base files plus every file side effect the first k steps produced. */
function sandboxFiles(task: E1Task, k: number): Record<string, string> {
  const files: Record<string, string> = { ...task.baseSandbox };
  for (const step of task.steps.slice(0, k)) {
    if (step.file) files[step.file.path] = step.file.content;
  }
  return files;
}

// ---------------------------------------------------------------------------
// Prompt — identical for A and C except for the artefact body. Never mentions
// a kill, a previous agent, or step numbers.
// ---------------------------------------------------------------------------

function buildPrompt(body: string, evidence: "log" | "fx"): string {
  const evidenceNote =
    evidence === "log"
      ? "\n\nThe working directory contains ops-events.log, a raw log of ops tool " +
        "calls recorded for this job so far (tool name, arguments, timestamp)."
      : "";
  return (
    `You are carrying out an operations job in the current working directory.

Operational actions are performed through the ops MCP tools:
- mcp__ops__ticket_update(ticket_id, status, comment?)
- mcp__ops__refund_issue(order_id, amount)
- mcp__ops__email_send(to, subject, body?)
- mcp__ops__deploy_service(service, version)
- mcp__ops__record_note(note_id, text)

The live state of tickets, refunds, emails, deploys, and notes can be
inspected at any time with mcp__ops__ops_lookup. The files in the working
directory belong to this job.` +
    evidenceNote +
    `

The job is defined by the following document.

--- BEGIN DOCUMENT ---
${body}
--- END DOCUMENT ---

Complete the job.`
  );
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const ARMS = [
  { arm: "A-procedure" as const, ext: "procedure.mdz" },
  { arm: "C-rules" as const, ext: "rules.md" },
];
const EVIDENCE_LEVELS = ["log", "fx"] as const;
const KILL_POINTS = ["early", "late"] as const;

export function buildE1(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e1");
  const entries: ManifestEntry[] = [];

  for (const task of E1_TASKS) {
    const procedure = procedureText(task);
    const rules = rulesText(task);
    // The MDZ runbook is canonical notation (frontmatter + heading + semantic
    // statements + $list assignments + FOR/IF blocks); it must pass the
    // conformance validator, with the blocks parsed as real MDZ statements.
    assertValid(procedure, `e1 ${task.id} procedure`);

    const procPath = join(dir, `${task.id}.procedure.mdz`);
    writeText(procPath, procedure);
    const rulesPath = join(dir, `${task.id}.rules.md`);
    writeText(rulesPath, rules);

    // Machine-readable reference step list, next to the manifest.
    const referencePath = join(dir, `${task.id}.reference.json`);
    writeJson(referencePath, {
      task: task.id,
      killEarly: task.killEarly,
      killLate: task.killLate,
      steps: task.steps.map((s) => ({
        id: s.id,
        obligation: s.obligation,
        ...(s.op ? { op: { tool: s.op.tool, args: s.op.args } } : {}),
        ...(s.file ? { file: { path: s.file.path } } : {}),
      })),
    });

    for (const kill of KILL_POINTS) {
      const k = kill === "early" ? task.killEarly : task.killLate;

      const seedPath = join(dir, "seeds", `${task.id}-${kill}.json`);
      writeJson(seedPath, seedState(task, k));

      const files = sandboxFiles(task, k);
      const log = eventLog(task, k);

      for (const { arm, ext } of ARMS) {
        const body = arm === "A-procedure" ? procedure : rules;
        for (const evidence of EVIDENCE_LEVELS) {
          const sandbox =
            evidence === "log" ? { ...files, "ops-events.log": log } : { ...files };

          entries.push({
            id: `e1-${task.id}-${arm === "A-procedure" ? "A" : "C"}-${evidence}-${kill}`,
            experiment: "e1",
            runMode: "agentic",
            programPath: rel(arm === "A-procedure" ? procPath : rulesPath),
            tracePath: rel(referencePath),
            prompt: buildPrompt(body, evidence),
            variant: {
              task: task.id,
              arm,
              evidence,
              killPoint: kill,
              k,
              steps: task.steps.length,
            },
            expected: {
              referencePath: rel(referencePath),
              k,
              killPoint: kill,
              evidence,
            },
            sandbox,
            mcp: "ops",
            mcpSeed: rel(seedPath),
            allowedTools: ["Read", "Write", "Glob", "Grep"],
          });
        }
      }
    }
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
