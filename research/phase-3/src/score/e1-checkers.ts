/**
 * Deterministic E1 scoring: the resume session's ops-tool log against the
 * task's reference remaining-step set (DESIGN.md metric table).
 *
 * | metric              | definition                                            |
 * |---------------------|-------------------------------------------------------|
 * | resumption accuracy | first side-effectful action taken is the reference    |
 * |                     | next step (the first op step after the kill point)    |
 * | repeat rate         | side-effectful actions re-executed that the pre-kill  |
 * |                     | world already performed: distinct done op steps       |
 * |                     | matched by any live call, over done op steps          |
 * | skip rate           | reference remaining op steps never executed, over     |
 * |                     | remaining op steps                                    |
 * | completion          | all remaining op steps executed, first executions in  |
 * |                     | reference order                                       |
 *
 * Matching: a live call matches a reference step iff the tool name matches
 * and every IDENTIFYING argument in the reference (ids, statuses, amounts,
 * recipients, subjects, versions) matches the call's argument — strings
 * compared trimmed and case-insensitively, numbers numerically (so "240.00"
 * matches 240). Free-text arguments (comments, note texts, bodies) are the
 * model's own and are ignored. Reference ops are unique within a task by
 * construction (no two steps share tool + identifying args), so matching is
 * unambiguous. Read-only ops_lookup calls are never scored.
 */

export interface RefOp {
  tool: string;
  args: Record<string, unknown>;
}

export interface RefStep {
  id: string;
  obligation?: string;
  op?: RefOp;
  file?: { path: string };
}

export interface E1Reference {
  task: string;
  killEarly: number;
  killLate: number;
  steps: RefStep[];
}

export interface OpsEvent {
  tool: string;
  args: Record<string, unknown>;
}

export interface E1Score {
  /** 1 iff the first side-effectful call matches the reference next step */
  resumptionAccuracy: 0 | 1;
  /** distinct pre-kill op steps re-executed / pre-kill op steps */
  repeatRate: number;
  /** number of live calls matching a pre-kill op step (double-counts retries) */
  repeatEvents: number;
  /** remaining op steps never executed / remaining op steps */
  skipRate: number;
  /** 1 iff no remaining op step was skipped and first executions respect reference order */
  completion: 0 | 1;
  /** step ids */
  repeatedStepIds: string[];
  skippedStepIds: string[];
  /** id of the reference next step (first op step after the kill), if any */
  expectedNextStepId: string | null;
  /** number of side-effectful live calls considered */
  effectCount: number;
}

const SIDE_EFFECT_TOOLS = new Set([
  "ticket_update",
  "refund_issue",
  "email_send",
  "deploy_service",
  "record_note",
]);

/** Strip an "mcp__ops__" prefix so both raw OPS_LOG and transcript names work. */
function toolName(raw: string): string {
  return raw.replace(/^mcp__ops__/, "");
}

function valueMatches(refValue: unknown, gotValue: unknown): boolean {
  if (typeof refValue === "number" || typeof gotValue === "number") {
    const a = Number(refValue);
    const b = Number(gotValue);
    return Number.isFinite(a) && Number.isFinite(b) && a === b;
  }
  return (
    String(refValue ?? "").trim().toLowerCase() ===
    String(gotValue ?? "").trim().toLowerCase()
  );
}

export function eventMatchesOp(event: OpsEvent, op: RefOp): boolean {
  if (toolName(event.tool) !== op.tool) return false;
  const args = event.args ?? {};
  return Object.entries(op.args).every(([key, refValue]) =>
    valueMatches(refValue, (args as Record<string, unknown>)[key]),
  );
}

/** Parse raw log entries (from OPS_LOG or the result record) into OpsEvents. */
export function toOpsEvents(raw: Record<string, unknown>[]): OpsEvent[] {
  return raw
    .filter((e) => typeof e.tool === "string")
    .map((e) => ({
      tool: String(e.tool),
      args: (e.args ?? {}) as Record<string, unknown>,
    }));
}

export function scoreE1(ref: E1Reference, k: number, log: OpsEvent[]): E1Score {
  const doneOps = ref.steps.slice(0, k).filter((s) => s.op);
  const remainingOps = ref.steps.slice(k).filter((s) => s.op);
  const effects = log.filter((e) => SIDE_EFFECT_TOOLS.has(toolName(e.tool)));

  const expectedNext = remainingOps[0] ?? null;

  // resumption accuracy
  let resumptionAccuracy: 0 | 1 = 0;
  if (expectedNext == null) {
    // Nothing left to do: correct resumption is taking no side-effectful action.
    resumptionAccuracy = effects.length === 0 ? 1 : 0;
  } else if (effects.length > 0 && eventMatchesOp(effects[0], expectedNext.op!)) {
    resumptionAccuracy = 1;
  }

  // repeats: live calls that the pre-kill world already performed
  const repeatedStepIds: string[] = [];
  let repeatEvents = 0;
  for (const step of doneOps) {
    const matches = effects.filter((e) => eventMatchesOp(e, step.op!));
    if (matches.length > 0) {
      repeatedStepIds.push(step.id);
      repeatEvents += matches.length;
    }
  }
  const repeatRate = doneOps.length === 0 ? 0 : repeatedStepIds.length / doneOps.length;

  // skips + completion order: first execution index of each remaining op
  const firstIndex = new Map<string, number>();
  for (const step of remainingOps) {
    const idx = effects.findIndex((e) => eventMatchesOp(e, step.op!));
    if (idx !== -1) firstIndex.set(step.id, idx);
  }
  const skippedStepIds = remainingOps
    .filter((s) => !firstIndex.has(s.id))
    .map((s) => s.id);
  const skipRate =
    remainingOps.length === 0 ? 0 : skippedStepIds.length / remainingOps.length;

  let inOrder = true;
  let prev = -1;
  for (const step of remainingOps) {
    const idx = firstIndex.get(step.id);
    if (idx === undefined) continue;
    if (idx < prev) {
      inOrder = false;
      break;
    }
    prev = idx;
  }
  const completion: 0 | 1 = skippedStepIds.length === 0 && inOrder ? 1 : 0;

  return {
    resumptionAccuracy,
    repeatRate,
    repeatEvents,
    skipRate,
    completion,
    repeatedStepIds,
    skippedStepIds,
    expectedNextStepId: expectedNext?.id ?? null,
    effectCount: effects.length,
  };
}
