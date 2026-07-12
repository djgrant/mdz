/**
 * Scoring for MDZ execution traces (see benchmark/DESIGN.md).
 *
 * A trace is a JSON array of step objects, each one of:
 *   { step, action: "emit",   value }
 *   { step, action: "assign", var,  value }
 *   { step, action: "call",   target, args }
 *
 * Only emit/assign/call steps are scored. Normalisation: strings are trimmed,
 * numbers compared numerically, numeric-looking strings ("7") equal numbers (7).
 */

export type Action = "emit" | "assign" | "call";

export interface Step {
  step?: number;
  action: Action;
  value?: unknown;
  var?: string;
  target?: string;
  args?: Record<string, unknown>;
}

export interface Scores {
  exact: number; // 1 | 0
  stepAccuracy: number; // LCS(model, ref) / ref.length, in [0,1]
  firstDivergence: number | null; // index of first positional mismatch, else null
  paramFidelity?: number; // q4: fraction of ref call steps matched exactly
}

// ---------------------------------------------------------------------------
// Value normalisation
// ---------------------------------------------------------------------------

/** A canonical comparable form for a scalar trace value. */
function normValue(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim();
    // numeric-looking strings compare as numbers
    if (t !== "" && /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) return Number(t);
    return t;
  }
  // objects/arrays: stable stringify (used for args)
  return stableStringify(v);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  return normValue(a) === normValue(b);
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") {
    const nv = normValue(v);
    return typeof nv === "number" || typeof nv === "boolean" || nv === null
      ? String(nv)
      : JSON.stringify(nv);
  }
  if (Array.isArray(v)) {
    return "[" + v.map(stableStringify).join(",") + "]";
  }
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") +
    "}"
  );
}

function argsEqual(a: Record<string, unknown> = {}, b: Record<string, unknown> = {}): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!(k in b)) return false;
    if (!valuesEqual(a[k], b[k])) return false;
  }
  return true;
}

/** Two steps are equal ignoring the (advisory) step index. */
export function stepsEqual(a: Step, b: Step): boolean {
  if (a.action !== b.action) return false;
  switch (a.action) {
    case "emit":
      return valuesEqual(a.value, b.value);
    case "assign":
      return a.var?.trim() === b.var?.trim() && valuesEqual(a.value, b.value);
    case "call":
      return (
        a.target?.trim() === b.target?.trim() &&
        argsEqual(a.args ?? {}, b.args ?? {})
      );
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Trace extraction from raw model output
// ---------------------------------------------------------------------------

/**
 * Pull a trace array out of raw model output. Strategy:
 *  1. Prefer the LAST fenced ```json (or plain ```) block that parses to an array.
 *  2. Fall back to the last balanced top-level [ ... ] array in the text.
 * Returns null if nothing usable is found.
 */
export function extractTrace(raw: string): Step[] | null {
  if (!raw) return null;

  const fenceRe = /```(?:json|jsonc|JSON)?\s*([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(raw)) !== null) {
    blocks.push(m[1]);
  }
  // Try fenced blocks last-first (the final trace is what we want).
  for (let i = blocks.length - 1; i >= 0; i--) {
    const arr = parseTraceArray(blocks[i]);
    if (arr) return arr;
  }

  // Fallback: scan for balanced [ ... ] arrays, prefer the last.
  const arrays = balancedArrays(raw);
  for (let i = arrays.length - 1; i >= 0; i--) {
    const arr = parseTraceArray(arrays[i]);
    if (arr) return arr;
  }
  return null;
}

function parseTraceArray(s: string): Step[] | null {
  const trimmed = s.trim();
  // Try direct array parse.
  const direct = tryParseArray(trimmed);
  if (direct) return coerceSteps(direct);

  // Maybe wrapped: { "trace": [...] } or { "steps": [...] }
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      for (const key of ["trace", "steps", "result", "output"]) {
        if (Array.isArray((obj as any)[key])) {
          return coerceSteps((obj as any)[key]);
        }
      }
    }
  } catch {
    /* ignore */
  }

  // JSONL: one object per line.
  const lines = trimmed
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{") && l.endsWith("}"));
  if (lines.length) {
    const steps: unknown[] = [];
    for (const l of lines) {
      try {
        steps.push(JSON.parse(l));
      } catch {
        return null;
      }
    }
    return coerceSteps(steps);
  }
  return null;
}

function tryParseArray(s: string): unknown[] | null {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** Validate/normalise a raw array into Step[], dropping non-scored entries. */
function coerceSteps(raw: unknown[]): Step[] | null {
  const steps: Step[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const action = o.action;
    if (action === "emit" || action === "assign" || action === "call") {
      steps.push(o as unknown as Step);
    }
    // silently ignore control-flow / commentary entries the model may add
  }
  return steps.length || raw.length === 0 ? steps : null;
}

/** Find balanced top-level [ ... ] arrays in text. */
function balancedArrays(s: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "[") {
      i++;
      continue;
    }
    let depth = 0;
    let inStr = false;
    let esc = false;
    let j = i;
    for (; j < s.length; j++) {
      const ch = s[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          out.push(s.slice(i, j + 1));
          break;
        }
      }
    }
    i = j + 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// LCS + scoring
// ---------------------------------------------------------------------------

/** Longest common subsequence length using stepsEqual. */
export function lcsLength(a: Step[], b: Step[]): number {
  const n = a.length;
  const mLen = b.length;
  if (n === 0 || mLen === 0) return 0;
  let prev = new Array<number>(mLen + 1).fill(0);
  let curr = new Array<number>(mLen + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= mLen; j++) {
      curr[j] = stepsEqual(a[i - 1], b[j - 1])
        ? prev[j - 1] + 1
        : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[mLen];
}

/** Index of the first positionally-mismatching step, or null if a prefix of ref. */
export function firstDivergence(model: Step[], ref: Step[]): number | null {
  const len = Math.min(model.length, ref.length);
  for (let i = 0; i < len; i++) {
    if (!stepsEqual(model[i], ref[i])) return i;
  }
  if (model.length !== ref.length) return len;
  return null;
}

export interface ScoreOptions {
  /** Include paramFidelity over call steps (q4). */
  paramFidelity?: boolean;
}

/** Score a model trace against the reference trace. */
export function scoreTrace(
  model: Step[],
  ref: Step[],
  opts: ScoreOptions = {},
): Scores {
  const lcs = lcsLength(model, ref);
  const stepAccuracy = ref.length === 0 ? (model.length === 0 ? 1 : 0) : lcs / ref.length;
  const fd = firstDivergence(model, ref);
  const exact = fd === null && model.length === ref.length ? 1 : 0;

  const scores: Scores = {
    exact,
    stepAccuracy,
    firstDivergence: fd,
  };

  if (opts.paramFidelity) {
    scores.paramFidelity = computeParamFidelity(model, ref);
  }
  return scores;
}

/**
 * Fraction of reference `call` steps whose args match a model call step with
 * the same target and args exactly. Greedy left-to-right pairing.
 */
function computeParamFidelity(model: Step[], ref: Step[]): number {
  const refCalls = ref.filter((s) => s.action === "call");
  if (refCalls.length === 0) return 1;
  const modelCalls = model.filter((s) => s.action === "call");
  const used = new Array<boolean>(modelCalls.length).fill(false);
  let matched = 0;
  for (const rc of refCalls) {
    for (let j = 0; j < modelCalls.length; j++) {
      if (used[j]) continue;
      const mc = modelCalls[j];
      if (
        mc.target?.trim() === rc.target?.trim() &&
        argsEqual(mc.args ?? {}, rc.args ?? {})
      ) {
        used[j] = true;
        matched++;
        break;
      }
    }
  }
  return matched / refCalls.length;
}

// ---------------------------------------------------------------------------
// q1: malformed-program behaviour classification
// ---------------------------------------------------------------------------

export type MalformedBehaviour = "halt" | "repair" | "improvise" | "unknown";

/**
 * Classify how a model handled a malformed program.
 *  - halt:      explicitly reported an error and stopped (little/no trace).
 *  - repair:    produced a trace matching the reference (fixed the program).
 *  - improvise: produced a substantive trace that does not match the reference.
 *  - unknown:   no trace and no clear error signal.
 *
 * `ref` is the interpreter's trace for the intended (repaired) program, or null
 * if the program is unrepairably broken.
 */
export function classifyMalformed(
  raw: string,
  model: Step[] | null,
  ref: Step[] | null,
): MalformedBehaviour {
  const errorSignalled = /\b(error|invalid|malformed|cannot|can't|syntax|unable|halt|abort|refuse)\b/i.test(
    raw,
  );
  const hasTrace = !!model && model.length > 0;

  if (!hasTrace) {
    return errorSignalled ? "halt" : "unknown";
  }
  if (ref && model && firstDivergence(model, ref) === null && model.length === ref.length) {
    return "repair";
  }
  // A trace was produced that isn't the intended one.
  return "improvise";
}
