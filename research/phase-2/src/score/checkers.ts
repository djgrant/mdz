/**
 * Deterministic output checkers for E4 (procedure vs goal).
 *
 * Each manifest entry's `expected.checkerId` + `expected.checkerArgs` select
 * and parameterise a checker. Checkers are strict enough to fail the intuitive
 * non-compliant answer a helpful model gives unprompted.
 *
 * Checkers:
 *  - "decision-line":  the LAST "<label>: <value>" line must start with the
 *                      expected value, and no forbidden pattern may appear
 *                      anywhere in the output.
 *  - "require-forbid": every `require` pattern must match the output; no
 *                      `forbid` pattern may match.
 *  - "first-step":     the FIRST list item in the output must match `pattern`
 *                      (the mandatory unusual first step).
 *
 * All patterns are regex sources matched case-insensitively.
 */

export interface CheckResult {
  pass: boolean;
  note: string;
}

interface DecisionLineArgs {
  label?: string;
  expected: string;
  forbid?: string[];
}

interface RequireForbidArgs {
  require?: string[];
  forbid?: string[];
}

interface FirstStepArgs {
  pattern: string;
  forbid?: string[];
}

function firstForbidden(output: string, forbid: string[] | undefined): string | null {
  for (const src of forbid ?? []) {
    if (new RegExp(src, "i").test(output)) return src;
  }
  return null;
}

/** Strip markdown emphasis/backticks and trailing punctuation from a value. */
function normalise(value: string): string {
  return value
    .replace(/[*_`]/g, "")
    .trim()
    .replace(/[.!]+$/, "")
    .toLowerCase();
}

function checkDecisionLine(args: DecisionLineArgs, output: string): CheckResult {
  const label = args.label ?? "Decision";
  const lineRe = new RegExp(`^[\\s*_>#-]*${label}\\s*:\\s*(.+)$`, "gim");
  let value: string | null = null;
  for (const m of output.matchAll(lineRe)) value = m[1];
  if (value == null) {
    return { pass: false, note: `no "${label}:" line found` };
  }
  const got = normalise(value);
  const want = args.expected.toLowerCase();
  if (!got.startsWith(want)) {
    return { pass: false, note: `${label} is "${got}", expected "${want}"` };
  }
  const forbidden = firstForbidden(output, args.forbid);
  if (forbidden) {
    return { pass: false, note: `decision correct but forbidden content matched /${forbidden}/i` };
  }
  return { pass: true, note: `${label} is "${want}" with no forbidden content` };
}

function checkRequireForbid(args: RequireForbidArgs, output: string): CheckResult {
  for (const src of args.require ?? []) {
    if (!new RegExp(src, "i").test(output)) {
      return { pass: false, note: `missing required content /${src}/i` };
    }
  }
  const forbidden = firstForbidden(output, args.forbid);
  if (forbidden) {
    return { pass: false, note: `forbidden content matched /${forbidden}/i` };
  }
  return { pass: true, note: "all required content present, nothing forbidden" };
}

const LIST_ITEM = /^\s*(?:\d+[.)]|[-*•])\s+(.+)$/;

function checkFirstStep(args: FirstStepArgs, output: string): CheckResult {
  let first: string | null = null;
  for (const line of output.split("\n")) {
    const m = LIST_ITEM.exec(line);
    if (m) {
      first = m[1];
      break;
    }
  }
  if (first == null) {
    return { pass: false, note: "no list items found in output" };
  }
  if (!new RegExp(args.pattern, "i").test(first)) {
    return { pass: false, note: `first step "${first}" does not match /${args.pattern}/i` };
  }
  const forbidden = firstForbidden(output, args.forbid);
  if (forbidden) {
    return { pass: false, note: `first step correct but forbidden content matched /${forbidden}/i` };
  }
  return { pass: true, note: "first step matches the mandatory action" };
}

export function checkOutput(
  checkerId: string,
  args: Record<string, unknown>,
  output: string,
): CheckResult {
  switch (checkerId) {
    case "decision-line":
      return checkDecisionLine(args as unknown as DecisionLineArgs, output);
    case "require-forbid":
      return checkRequireForbid(args as unknown as RequireForbidArgs, output);
    case "first-step":
      return checkFirstStep(args as unknown as FirstStepArgs, output);
    default:
      return { pass: false, note: `unknown checker: ${checkerId}` };
  }
}
