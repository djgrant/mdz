/**
 * E1 checker bridge: applies the deterministic E1 scorer to every e1 result
 * record and writes phase-3/results/e1-checks.jsonl for the analysis to
 * consume. Mirrors phase-2/src/score/run-checkers.ts.
 *
 * Usage (from research/): npx tsx phase-3/src/score/run-e1-checkers.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scoreE1, toOpsEvents, type E1Reference } from "./e1-checkers.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PHASE = resolve(HERE, "..", "..");

interface ManifestEntry {
  id: string;
  variant?: Record<string, unknown>;
  expected?: { referencePath?: string; k?: number; killPoint?: string; evidence?: string };
}

const manifest: ManifestEntry[] = JSON.parse(
  readFileSync(join(PHASE, "programs/e1/manifest.json"), "utf8"),
);
const byId = new Map(manifest.map((e) => [e.id, e]));

const references = new Map<string, E1Reference>();
function loadReference(relPath: string): E1Reference {
  let ref = references.get(relPath);
  if (!ref) {
    ref = JSON.parse(readFileSync(join(PHASE, relPath), "utf8")) as E1Reference;
    references.set(relPath, ref);
  }
  return ref;
}

const resultsPath = join(PHASE, "results/e1.jsonl");
if (!existsSync(resultsPath)) {
  console.error("no e1 results yet");
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
  const { referencePath, k } = entry.expected ?? {};
  if (!referencePath || typeof k !== "number") continue;
  const ref = loadReference(referencePath);
  const opsLog = toOpsEvents((rec.opsLog ?? []) as Record<string, unknown>[]);
  const score = scoreE1(ref, k, opsLog);
  out.push(
    JSON.stringify({
      id: rid,
      entryId,
      task: entry.variant?.task ?? null,
      arm: entry.variant?.arm ?? null,
      evidence: entry.variant?.evidence ?? null,
      killPoint: entry.variant?.killPoint ?? null,
      model: rec.model,
      runError: rec.error ?? null,
      ...score,
    }),
  );
}

writeFileSync(join(PHASE, "results/e1-checks.jsonl"), out.join("\n") + "\n");
console.log(`wrote ${out.length} checker verdicts to results/e1-checks.jsonl`);
