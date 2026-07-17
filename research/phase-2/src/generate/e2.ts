/**
 * E2 — map-reduce higher-order skill.
 *
 * A handwritten skills/map-reduce.mdz takes $items, $map, $reduce, fans out
 * one SPAWN per item and reduces the worker outputs. Four consumer programs
 * exercise it; every item carries a unique canary token. Runs are agentic:
 * the runner writes the sandbox files into the cwd and allows the Task tool.
 *
 * 4 manifest entries.
 */

import { join } from "node:path";

import { assertValid, rel, writeJson, writeText, type ManifestEntry } from "./shared.ts";

// ---------------------------------------------------------------------------
// The higher-order skill (shared by all variants)
// ---------------------------------------------------------------------------

const MAP_REDUCE_SKILL = `---
name: map-reduce
input: $items, $map, $reduce
---

# Map reduce

A higher-order skill. Apply the $map instruction to every item in $items,
delegating each item to its own worker, then combine the worker outputs with
the $reduce instruction.

FOR $item IN $items
  SPAWN ~/agents/worker
  WITH
    instruction: $map
    item: $item
END

$results = every worker output, in the same order as $items
$final = the result of applying $reduce to $results

Say $final
`;

// The exact wording that must reach each worker in the lambda-fidelity variant.
// The original marker (PATTERN-BLUE-VERIFICATION, a codephrase with no referent)
// read as an injection marker and haiku's workers refused, confounding binding
// fidelity with worker compliance. The variant is kept for contrast; the
// neutral variant uses an innocuous editorial tag instead.
const LAMBDA_PHRASE =
  "Classify the item as URGENT or ROUTINE, citing the exact phrase PATTERN-BLUE-VERIFICATION";
const LAMBDA_PHRASE_NEUTRAL =
  "Classify the item as URGENT or ROUTINE, citing the exact phrase reviewed-for-the-weekly-digest";

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

function canary(variant: string, i: number): string {
  return `CANARY-E2-${variant}-${i}`;
}

const INLINE_ITEM_TEXTS = [
  "The northern warehouse reports a stock surplus of 400 units.",
  "The Bristol office lease is due for renewal in March.",
  "Customer churn rose by two points in the last quarter.",
  "The payments team shipped the new reconciliation job.",
  "A supplier has asked to renegotiate delivery terms.",
];

function inlineItems(variant: string, n: number): string[] {
  return Array.from(
    { length: n },
    (_, i) => `${INLINE_ITEM_TEXTS[i]} ${canary(variant, i + 1)}`,
  );
}

function itemsLiteral(items: string[]): string {
  return `[${items.map((s) => JSON.stringify(s)).join(", ")}]`;
}

function inlineConsumer(variant: string, items: string[]): string {
  return `---
name: e2-${variant}
---

# Summarise the items

$items = ${itemsLiteral(items)}

USE ~/skills/map-reduce WITH
  items: $items
  map: Summarise the item in one short sentence and include the item's CANARY token verbatim
  reduce: Produce a numbered list with one line per item, each line ending with that item's CANARY token verbatim
`;
}

const HEURISTICS = [
  "Prefer the reversible decision when two options look equally good.",
  "Estimate the cost of delay before optimising the cost of work.",
  "Write the announcement first, then build what it describes.",
  "If a meeting has no decision to make, make it an email.",
];

function anchorConsumer(variant: string): string {
  const bullets = HEURISTICS.map(
    (h, i) => `- ${h} ${canary(variant, i + 1)}`,
  ).join("\n");
  return `---
name: e2-${variant}
---

# Simplify the heuristics

USE ~/skills/simplify WITH
  items: #heuristics

## Heuristics

${bullets}
`;
}

const SIMPLIFY_SKILL = `---
name: simplify
input: $items
---

# Simplify

Rewrite each item in plainer words.

USE ~/skills/map-reduce WITH
  items: $items
  map: Rewrite the heuristic in plainer words, keeping its CANARY token verbatim at the end
  reduce: Return the rewritten heuristics as a bullet list, one per item, each ending with its CANARY token verbatim
`;

function lambdaConsumer(variant: string, items: string[], phrase: string): string {
  return `---
name: e2-${variant}
---

# Classify the items

$items = ${itemsLiteral(items)}

$map = item => "${phrase}, and quote the item's CANARY token. Item: #{item}"

USE ~/skills/map-reduce WITH
  items: $items
  map: $map
  reduce: Produce one line per item in the form <verdict> -- <CANARY token>
`;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function e2Prompt(program: string): string {
  return `You are an MDZ executor. MDZ is a simple imperative notation for
procedures. Execute the root program below EXACTLY as written, step by step.
Do not optimise, summarise, skip, or "improve" the program.

You are running agentically in a working directory that contains the skill
files the program references (for example ./skills/map-reduce.mdz). Read a
skill file to resolve any USE target before executing it.

Execution rules:
- Every SPAWN statement MUST be performed as a real Task tool call: exactly
  one Task call per spawned worker, one worker per item.
- Each worker's Task prompt must contain the full WITH payload for its item:
  the map instruction verbatim, and the item text including its CANARY token
  verbatim.
- Do not simulate, merge, or skip spawns, and do not answer on a worker's
  behalf yourself.
- After all workers return, apply the reduce step to their outputs.

When finished, print the final reduced result as your answer.

Root program (also available as ./program.mdz):
--- BEGIN PROGRAM ---
${program}
--- END PROGRAM ---`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

interface E2Variant {
  name: string;
  program: string;
  extraSkills: Record<string, string>;
  canaries: string[];
  spawnCount: number;
  lambda: string | null;
}

export function buildE2(outDir: string): ManifestEntry[] {
  const dir = join(outDir, "e2");

  const inline3Items = inlineItems("inline-3", 3);
  const inline5Items = inlineItems("inline-5", 5);
  const lambdaItems = inlineItems("lambda-fidelity", 3);
  const lambdaNeutralItems = inlineItems("lambda-fidelity-neutral", 3);

  const variants: E2Variant[] = [
    {
      name: "inline-3",
      program: inlineConsumer("inline-3", inline3Items),
      extraSkills: {},
      canaries: inline3Items.map((_, i) => canary("inline-3", i + 1)),
      spawnCount: 3,
      lambda: null,
    },
    {
      name: "inline-5",
      program: inlineConsumer("inline-5", inline5Items),
      extraSkills: {},
      canaries: inline5Items.map((_, i) => canary("inline-5", i + 1)),
      spawnCount: 5,
      lambda: null,
    },
    {
      name: "anchor-heuristics",
      program: anchorConsumer("anchor-heuristics"),
      extraSkills: { "skills/simplify.mdz": SIMPLIFY_SKILL },
      canaries: HEURISTICS.map((_, i) => canary("anchor-heuristics", i + 1)),
      spawnCount: 4,
      lambda: null,
    },
    {
      name: "lambda-fidelity",
      program: lambdaConsumer("lambda-fidelity", lambdaItems, LAMBDA_PHRASE),
      extraSkills: {},
      canaries: lambdaItems.map((_, i) => canary("lambda-fidelity", i + 1)),
      spawnCount: 3,
      lambda: LAMBDA_PHRASE,
    },
    {
      name: "lambda-fidelity-neutral",
      program: lambdaConsumer("lambda-fidelity-neutral", lambdaNeutralItems, LAMBDA_PHRASE_NEUTRAL),
      extraSkills: {},
      canaries: lambdaNeutralItems.map((_, i) => canary("lambda-fidelity-neutral", i + 1)),
      spawnCount: 3,
      lambda: LAMBDA_PHRASE_NEUTRAL,
    },
  ];

  const entries: ManifestEntry[] = [];
  for (const v of variants) {
    const folder = join(dir, v.name);
    const programPath = join(folder, "program.mdz");
    writeText(programPath, v.program);
    assertValid(v.program, `e2 ${v.name} program`);

    const sandbox: Record<string, string> = {
      "program.mdz": v.program,
      "skills/map-reduce.mdz": MAP_REDUCE_SKILL,
      ...v.extraSkills,
    };
    for (const [relPath, content] of Object.entries(sandbox)) {
      if (relPath === "program.mdz") continue;
      writeText(join(folder, relPath), content);
      assertValid(content, `e2 ${v.name} ${relPath}`);
    }

    entries.push({
      id: `e2-${v.name}`,
      experiment: "e2",
      runMode: "agentic",
      programPath: rel(programPath),
      tracePath: null,
      prompt: e2Prompt(v.program),
      variant: { variant: v.name, statements: v.spawnCount, items: v.spawnCount },
      expected: { spawnCount: v.spawnCount, canaries: v.canaries, lambda: v.lambda },
      sandbox,
      allowedTools: ["Task"],
    });
  }

  writeJson(join(dir, "manifest.json"), entries);
  return entries;
}
