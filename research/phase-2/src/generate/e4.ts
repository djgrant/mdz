/**
 * E4 — real-world procedure vs goal.
 *
 * Ten handwritten tasks (see e4-tasks.ts). Arm A gets the procedure as MDZ
 * plus the input; arm B gets the goal only plus the same input. Both arms are
 * scored by the deterministic checker named in `expected.checkerId`
 * (phase-2/src/score/checkers.ts), plus an LLM judge downstream.
 *
 * 10 tasks x 2 arms = 20 manifest entries.
 */

import { join } from "node:path";

import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";
import { E4_TASKS } from "./e4-tasks.ts";

function procedurePrompt(procedure: string, input: string): string {
  return `You are executing an MDZ procedure. MDZ is a simple imperative
notation: keywords are written in capitals, $variables hold values, and plain
prose lines are instructions to carry out. Follow the procedure EXACTLY as
written, step by step, even where your own judgement would differ. Do not add
steps, skip steps, or soften the outcome the procedure produces.

Apply the procedure to the input and reply with the output the procedure
produces. Reply with the output only — no commentary about the procedure.

Procedure:
--- BEGIN PROCEDURE ---
${procedure}
--- END PROCEDURE ---

Input:
--- BEGIN INPUT ---
${input}
--- END INPUT ---`;
}

function goalPrompt(goal: string, input: string): string {
  return `Complete the following task.

${goal}

Input:
--- BEGIN INPUT ---
${input}
--- END INPUT ---

Produce the best result you can. Respond with your answer directly.`;
}

export function buildE4(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e4");
  const entries: ManifestEntry[] = [];

  for (const task of E4_TASKS) {
    const procPath = join(dir, `${task.id}.procedure.mdz`);
    writeText(procPath, task.procedure);
    assertValid(task.procedure, `e4 ${task.id} procedure`);

    const goalPath = join(dir, `${task.id}.goal.md`);
    writeText(goalPath, `# Goal\n\n${task.goal}\n\n## Input\n\n${task.input}\n`);

    const expected = {
      checkerId: task.checkerId,
      checkerArgs: task.checkerArgs,
      procedureText: task.procedure,
    };
    const variant = { task: task.id, statements: 1, scoring: "checker+judge" };

    entries.push({
      id: `e4-${task.id}-A`,
      experiment: "e4",
      runMode: "single-turn",
      programPath: rel(procPath),
      tracePath: null,
      prompt: procedurePrompt(task.procedure, task.input),
      variant,
      arm: "A-procedure",
      expected,
    });

    entries.push({
      id: `e4-${task.id}-B`,
      experiment: "e4",
      runMode: "single-turn",
      programPath: rel(goalPath),
      tracePath: null,
      prompt: goalPrompt(task.goal, task.input),
      variant,
      arm: "B-goal",
      expected,
    });
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
