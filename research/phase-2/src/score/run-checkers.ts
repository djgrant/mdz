/**
 * E4 checker bridge: applies the deterministic checkers to every e4 result record and
 * writes phase-2/results/e4-checks.jsonl for the Python analysis to consume.
 *
 * Usage (from research/): npx tsx phase-2/src/score/run-checkers.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkOutput } from "./checkers.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PHASE = resolve(HERE, "..", "..");

interface ManifestEntry {
  id: string;
  arm?: string;
  expected?: { checkerId?: string; checkerArgs?: Record<string, unknown> };
}

const manifest: ManifestEntry[] = JSON.parse(
  readFileSync(join(PHASE, "programs/e4/manifest.json"), "utf8"),
);
const byId = new Map(manifest.map((e) => [e.id, e]));

const resultsPath = join(PHASE, "results/e4.jsonl");
if (!existsSync(resultsPath)) {
  console.error("no e4 results yet");
  process.exit(1);
}

const records = new Map<string, any>();
for (const line of readFileSync(resultsPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const r = JSON.parse(line);
  records.set(r.id, r); // last wins
}

const out: string[] = [];
for (const [rid, rec] of records) {
  const entryId = [...byId.keys()].find((k) => rid.startsWith(k));
  if (!entryId) continue;
  const entry = byId.get(entryId)!;
  const { checkerId, checkerArgs } = entry.expected ?? {};
  if (!checkerId) continue;
  const output = rec.rawOutput ?? "";
  const verdict = rec.error
    ? { pass: false, note: `run error: ${rec.error}` }
    : checkOutput(checkerId, checkerArgs ?? {}, output);
  out.push(
    JSON.stringify({ id: rid, entryId, arm: entry.arm, model: rec.model, ...verdict }),
  );
}

writeFileSync(join(PHASE, "results/e4-checks.jsonl"), out.join("\n") + "\n");
console.log(`wrote ${out.length} checker verdicts to results/e4-checks.jsonl`);
