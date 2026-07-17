/**
 * Tests for the E2a generator: entry shape, content matching between the MDZ
 * and prose commands, live fixture behaviour (tests + benchmark run in a
 * scratch dir via the real toolchain), and deterministic generation.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildE2a, E2A_TARGETS, PASSES, STRATEGIES } from "./e2a.ts";
import { PHASE_ROOT, type ManifestEntry } from "./shared.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "fixtures", "e2a");
const MAP_REDUCE_PATH = join(HERE, "..", "..", "..", "..", "examples", "skills", "map-reduce.mdz");

let outDir: string;
let entries: ManifestEntry[];

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "e2a-test-"));
  entries = buildE2a(outDir);
});

afterAll(() => {
  rmSync(outDir, { recursive: true, force: true });
});

function entry(id: string): ManifestEntry {
  const e = entries.find((x) => x.id === id);
  expect(e, id).toBeDefined();
  return e!;
}

describe("manifest shape", () => {
  it("emits 2 targets x 3 variants = 6 agentic entries", () => {
    expect(entries.length).toBe(6);
    expect(entries.map((e) => e.id).sort()).toEqual([
      "e2a-ledger-goal",
      "e2a-ledger-mdz",
      "e2a-ledger-ralph",
      "e2a-logscan-goal",
      "e2a-logscan-mdz",
      "e2a-logscan-ralph",
    ]);
    for (const e of entries) {
      expect(e.experiment).toBe("e2a");
      expect(e.runMode).toBe("agentic");
      expect(e.allowedTools).toContain("Task");
      expect(e.allowedTools).toContain("Bash");
      const form = (e.variant as { form: string }).form;
      // Ralph iterates by re-running, not by fanning out.
      expect((e.expected as { spawnCount: number }).spawnCount).toBe(
        form === "ralph" ? 0 : 5,
      );
    }
  });

  it("ralph entries run passes=3 fresh sessions; the others run one", () => {
    for (const target of ["ledger", "logscan"]) {
      expect(entry(`e2a-${target}-ralph`).passes).toBe(PASSES);
      expect(PASSES).toBe(3);
      expect(entry(`e2a-${target}-mdz`).passes).toBeUndefined();
      expect(entry(`e2a-${target}-goal`).passes).toBeUndefined();
    }
  });

  it("writes every sandbox file and the manifest under outDir", () => {
    expect(existsSync(join(outDir, "e2a", "manifest.json"))).toBe(true);
    for (const e of entries) {
      const folder = join(outDir, "e2a", `${(e.variant as { target: string }).target}-${(e.variant as { form: string }).form}`);
      for (const rel of Object.keys(e.sandbox!)) {
        expect(existsSync(join(folder, rel)), rel).toBe(true);
      }
    }
  });
});

describe("content matching", () => {
  it("all three command variants contain all five strategy hints verbatim", () => {
    expect(STRATEGIES.length).toBe(5);
    for (const target of ["ledger", "logscan"]) {
      const mdz = entry(`e2a-${target}-mdz`).sandbox!["commands/optimise.mdz"];
      const goal = entry(`e2a-${target}-goal`).sandbox!["commands/optimise-goal.md"];
      const ralph = entry(`e2a-${target}-ralph`).sandbox!["commands/optimise-ralph.md"];
      for (const hint of STRATEGIES) {
        expect(mdz, `${target} mdz missing hint`).toContain(hint);
        expect(goal, `${target} goal missing hint`).toContain(hint);
        expect(ralph, `${target} ralph missing hint`).toContain(hint);
      }
      // The prompt carries the command verbatim.
      expect(entry(`e2a-${target}-mdz`).prompt).toContain(mdz);
      expect(entry(`e2a-${target}-goal`).prompt).toContain(goal);
      expect(entry(`e2a-${target}-ralph`).prompt).toContain(ralph);
    }
  });

  it("the ralph command states a single-pass goal, no explore-then-select plan", () => {
    for (const target of ["ledger", "logscan"]) {
      const ralph = entry(`e2a-${target}-ralph`).sandbox!["commands/optimise-ralph.md"];
      expect(ralph).toContain("Improve the program's benchmark time");
      expect(ralph).not.toContain("candidate");
      expect(ralph).not.toContain("Explore five optimisation strategies");
      expect(ralph).not.toContain("winning strategy");
    }
  });

  it("only the MDZ variant carries the real map-reduce skill in its sandbox", () => {
    const skill = readFileSync(MAP_REDUCE_PATH, "utf8");
    for (const target of ["ledger", "logscan"]) {
      const mdz = entry(`e2a-${target}-mdz`);
      expect(mdz.sandbox!["skills/map-reduce.mdz"]).toBe(skill);
      expect(mdz.sandbox!["commands/optimise.mdz"]).toContain("USE ~/skills/map-reduce");
      for (const form of ["goal", "ralph"]) {
        const prose = entry(`e2a-${target}-${form}`);
        expect(prose.sandbox!["skills/map-reduce.mdz"]).toBeUndefined();
        expect(Object.values(prose.sandbox!).join("\n")).not.toContain("SPAWN");
      }
    }
  });

  it("all variants ship the identical target files", () => {
    for (const t of E2A_TARGETS) {
      for (const f of t.files) {
        const fixture = readFileSync(join(FIXTURES_DIR, t.name, f), "utf8");
        for (const form of ["mdz", "goal", "ralph"]) {
          expect(entry(`e2a-${t.name}-${form}`).sandbox![f]).toBe(fixture);
        }
      }
    }
  });
});

describe("target fixtures behave", () => {
  // Copy each fixture into a scratch dir and drive the real toolchain, exactly
  // as the scorer will. The ledger tests take <1s; each benchmark a few seconds.
  for (const t of E2A_TARGETS) {
    it(`${t.name}: tests pass and benchmark emits BENCH_MS`, () => {
      const scratch = mkdtempSync(join(tmpdir(), `e2a-fixture-${t.name}-`));
      try {
        for (const f of t.files) {
          cpSync(join(FIXTURES_DIR, t.name, f), join(scratch, f));
        }
        const [testBin, ...testArgs] = t.testCommand.split(" ");
        const tests = spawnSync(testBin, testArgs, {
          cwd: scratch,
          encoding: "utf8",
          timeout: 60_000,
        });
        expect(tests.status, tests.stdout + tests.stderr).toBe(0);

        const [benchBin, ...benchArgs] = t.benchCommand.split(" ");
        const bench = spawnSync(benchBin, benchArgs, {
          cwd: scratch,
          encoding: "utf8",
          timeout: 60_000,
        });
        expect(bench.status, bench.stdout + bench.stderr).toBe(0);
        const m = /^BENCH_MS:\s*(\d+)\s*$/m.exec(bench.stdout);
        expect(m, `no BENCH_MS in: ${bench.stdout}`).not.toBeNull();
        expect(parseInt(m![1], 10)).toBeGreaterThan(0);
      } finally {
        rmSync(scratch, { recursive: true, force: true });
      }
    }, 90_000);
  }
});

describe("determinism", () => {
  it("two builds produce identical manifest entries", () => {
    const again = mkdtempSync(join(tmpdir(), "e2a-test2-"));
    try {
      const rebuilt = buildE2a(again);
      // programPath embeds the outDir only when outDir is inside PHASE_ROOT;
      // compare everything else byte-for-byte.
      const strip = (e: ManifestEntry) => ({ ...e, programPath: e.programPath.replace(/^.*e2a\//, "e2a/") });
      expect(rebuilt.map(strip)).toEqual(entries.map(strip));
    } finally {
      rmSync(again, { recursive: true, force: true });
    }
  });
});

// Sanity: rel() in shared.ts assumes generation into phase-3/programs; the
// test builds into a temp dir, so just assert the real PHASE_ROOT resolves.
it("PHASE_ROOT points at phase-3", () => {
  expect(PHASE_ROOT.endsWith("phase-3")).toBe(true);
});
