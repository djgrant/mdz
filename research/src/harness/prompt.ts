/**
 * Prompt construction for the MDZ execution benchmark.
 *
 * The model is cast as a deterministic MDZ interpreter. It must execute the
 * given program by hand and emit a canonical trace (see benchmark/DESIGN.md).
 *
 * Variants:
 *  - "standard": plain execution, output a single fenced json trace.
 *  - "ledger" (q5 arm B): rewrite a full STATE: ledger line after every step,
 *    then emit the trace at the end.
 *  - "goal" (q3 arm B): only the task goal is given, no program, free-form
 *    output, no trace expected.
 *
 * For q1 malformed programs the preamble deliberately says NOTHING about how to
 * handle errors: we measure whether the model halts, repairs, or improvises.
 */

export type PromptVariant = "standard" | "ledger" | "goal";

export interface BuildPromptOptions {
  /** The MDZ program source (omitted / ignored for the "goal" variant). */
  program?: string;
  /** Variant selector. */
  variant: PromptVariant;
  /** For the "goal" variant: the natural-language task goal. */
  goal?: string;
  /**
   * q1: when true the program may be malformed and the preamble stays silent
   * about error handling. Purely informational here (the standard preamble is
   * already silent), kept explicit so callers self-document intent.
   */
  malformed?: boolean;
}

const TRACE_CONTRACT = `The trace is a JSON array of step objects. Only three actions are recorded:
- emit:   { "step": <n>, "action": "emit", "value": <scalar> }   for every observable output line
- assign: { "step": <n>, "action": "assign", "var": "<name>", "value": <scalar> }
- call:   { "step": <n>, "action": "call", "target": "<path>", "args": { ... } }
Control flow (IF/ELSE, FOR, WHILE, CASE) is NOT recorded directly; it only
determines which observable steps occur and in what order. "step" numbers the
observable steps sequentially starting at 1. Values are JSON scalars: strings
for text, numbers for integers. Compare strings trimmed of surrounding
whitespace.`;

const FEW_SHOT = `Worked example.

Program:
  $x = 3
  $y = $x + 4
  Say the value of $y
  IF $y > 5
    Say "big"
  END

Trace:
\`\`\`json
[
  { "step": 1, "action": "assign", "var": "x", "value": 3 },
  { "step": 2, "action": "assign", "var": "y", "value": 7 },
  { "step": 3, "action": "emit", "value": "7" },
  { "step": 4, "action": "emit", "value": "big" }
]
\`\`\``;

const NO_TOOLS = `You must not use any tools, code execution, web access, or external
resources. Execute the program purely by reasoning, in your head.`;

function standardPreamble(): string {
  return `You are an MDZ interpreter. MDZ is a simple imperative notation for
procedures. Your job is to execute the given MDZ program EXACTLY as written,
step by step, and report the resulting trace. Do not optimise, summarise,
skip, or "improve" the program — follow it literally.

${NO_TOOLS}

${TRACE_CONTRACT}

${FEW_SHOT}

Output ONLY the final trace as a single fenced \`\`\`json code block containing
the array of step objects. Do not output any other prose.`;
}

function ledgerPreamble(): string {
  return `You are an MDZ interpreter with an EXTERNAL STATE LEDGER. MDZ is a
simple imperative notation for procedures. Execute the given MDZ program
EXACTLY as written, step by step. Follow it literally; do not optimise or skip.

${NO_TOOLS}

Externalise your working memory. Before executing each observable step, write a
single ledger line of the form:
  STATE: { "<var>": <value>, ... }
listing EVERY variable currently in scope and its current value (rewrite the
whole ledger each time, do not abbreviate). Then perform the step. This keeps
the full program state visible in context at all times.

${TRACE_CONTRACT}

${FEW_SHOT}

Work through the program writing a STATE: line before each step. When finished,
output the final trace as a single fenced \`\`\`json code block containing the
array of step objects. The fenced json trace is REQUIRED as the last thing you
output.`;
}

function goalPreamble(goal: string): string {
  return `Complete the following task.

${goal}

Produce the best result you can. Respond with your answer directly.`;
}

/** Build the full prompt string sent to a model runner. */
export function buildPrompt(opts: BuildPromptOptions): string {
  if (opts.variant === "goal") {
    const goal = opts.goal ?? opts.program ?? "";
    return goalPreamble(goal);
  }

  const preamble =
    opts.variant === "ledger" ? ledgerPreamble() : standardPreamble();

  const program = opts.program ?? "";
  return `${preamble}

Program to execute:
--- BEGIN PROGRAM ---
${program}
--- END PROGRAM ---`;
}
