/**
 * Phase-2 program/task generator entry point.
 *
 * Usage (from research/):  npx tsx phase-2/src/generate/index.ts
 *
 * Deterministic: regenerating always produces identical artefacts. Writes
 * programs, skills, reference traces, and one manifest.json per experiment
 * under phase-2/programs/<exp>/.
 */

import { mkdirSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { buildE1 } from "./e1.ts";
import { buildE2 } from "./e2.ts";
import { buildE3 } from "./e3.ts";
import { buildE4 } from "./e4.ts";

export function buildAll(): Record<string, ManifestEntry[]> {
  rmSync(PROGRAMS_DIR, { recursive: true, force: true });
  mkdirSync(PROGRAMS_DIR, { recursive: true });
  return {
    e1: buildE1(PROGRAMS_DIR),
    e2: buildE2(PROGRAMS_DIR),
    e3: buildE3(PROGRAMS_DIR),
    e4: buildE4(PROGRAMS_DIR),
  };
}

function main(): void {
  const manifests = buildAll();
  console.log(`Generated phase-2 programs into ${PROGRAMS_DIR}`);
  for (const [exp, entries] of Object.entries(manifests)) {
    console.log(`  ${exp}: ${entries.length} manifest entries`);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
