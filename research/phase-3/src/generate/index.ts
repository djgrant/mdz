/**
 * Phase-3 program/task generator entry point.
 *
 * Usage (from research/):  npx tsx phase-3/src/generate/index.ts
 *
 * Deterministic: regenerating always produces identical artefacts. Writes
 * programs, skills, fixtures, reference traces, and one manifest.json per
 * experiment under phase-3/programs/<exp>/.
 */

import { mkdirSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { buildE1 } from "./e1.ts";
import { buildE2a } from "./e2a.ts";
import { buildE2a2 } from "./e2a2.ts";
import { buildE2b } from "./e2b.ts";
import { buildE2b2 } from "./e2b2.ts";
import { buildE3 } from "./e3.ts";

export function buildAll(): Record<string, ManifestEntry[]> {
  rmSync(PROGRAMS_DIR, { recursive: true, force: true });
  mkdirSync(PROGRAMS_DIR, { recursive: true });
  return {
    e1: buildE1(PROGRAMS_DIR),
    e2a: buildE2a(PROGRAMS_DIR),
    e2a2: buildE2a2(PROGRAMS_DIR),
    e2b: buildE2b(PROGRAMS_DIR),
    e2b2: buildE2b2(PROGRAMS_DIR),
    e3: buildE3(PROGRAMS_DIR),
  };
}

function main(): void {
  const manifests = buildAll();
  console.log(`Generated phase-3 programs into ${PROGRAMS_DIR}`);
  for (const [exp, entries] of Object.entries(manifests)) {
    console.log(`  ${exp}: ${entries.length} manifest entries`);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
