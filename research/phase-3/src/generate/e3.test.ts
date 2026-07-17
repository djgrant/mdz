/**
 * Tests for the phase-3 E3 generator (external state at breakdown sizes):
 * entry counts, chunk balance and concatenation identity, chunk budget,
 * prompt containment, size fidelity, and determinism.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { buildE3, CHUNK_BUDGET, splitChunks } from "./e3.ts";
import { PHASE_ROOT, PROGRAMS_DIR, type ManifestEntry } from "./shared.ts";
import { generateProgram } from "../../../src/generator/generate.ts";
import { renderFlat } from "../../../src/generator/render.ts";
import { interpret } from "../../../src/interpreter/interpret.ts";
import { validateMdz } from "../../../src/interpreter/validate.ts";

let entries: ManifestEntry[];

beforeAll(() => {
  entries = buildE3(PROGRAMS_DIR);
});

interface E3Variant {
  notation: string;
  statements: number;
  depth: number;
  iterations: number;
  seed: number;
  chunks?: number;
  arm: string;
}

function variant(e: ManifestEntry): E3Variant {
  return e.variant as unknown as E3Variant;
}

function programSource(e: ManifestEntry): string {
  return readFileSync(join(PHASE_ROOT, e.programPath), "utf8");
}

function sortedChunks(e: ManifestEntry): string[] {
  return Object.entries(e.sandbox!)
    .filter(([k]) => k.startsWith("chunks/"))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

describe("e3 manifest shape", () => {
  it("has 12 entries: 2 sizes x 2 seeds x 3 arms", () => {
    expect(entries.length).toBe(12);
    for (const size of [400, 800]) {
      for (const arm of ["internal", "chunked-store", "chunked-nostore"]) {
        const cell = entries.filter(
          (e) => variant(e).statements === size && variant(e).arm === arm,
        );
        expect(cell.length, `size${size} ${arm}`).toBe(2);
        expect(new Set(cell.map((e) => variant(e).seed)).size).toBe(2);
      }
    }
  });

  it("writes a parseable manifest matching the returned entries", () => {
    const path = join(PROGRAMS_DIR, "e3", "manifest.json");
    expect(existsSync(path)).toBe(true);
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    expect(parsed).toEqual(JSON.parse(JSON.stringify(entries)));
  });

  it("every entry has unique id, existing program/trace, and a valid program", () => {
    const ids = new Set<string>();
    for (const e of entries) {
      expect(ids.has(e.id), e.id).toBe(false);
      ids.add(e.id);
      expect(e.experiment).toBe("e3");
      expect(e.prompt.length).toBeGreaterThan(50);
      expect(existsSync(join(PHASE_ROOT, e.programPath)), e.programPath).toBe(true);
      expect(e.tracePath).not.toBeNull();
      expect(existsSync(join(PHASE_ROOT, e.tracePath!)), e.tracePath!).toBe(true);
      expect(validateMdz(programSource(e)).ok).toBe(true);
    }
  });

  it("arms carry the phase-2 run configuration", () => {
    for (const e of entries) {
      const arm = variant(e).arm;
      if (arm === "internal") {
        expect(e.runMode).toBe("single-turn");
        expect(e.mcp).toBeUndefined();
        expect(e.sandbox).toBeUndefined();
      } else if (arm === "chunked-store") {
        expect(e.runMode).toBe("agentic");
        expect(e.mcp).toBe("state");
        expect(e.allowedTools).toEqual(["Task", "Read", "mcp__state__get", "mcp__state__set"]);
        expect(e.prompt).toContain("mcp__state__set");
      } else {
        expect(arm).toBe("chunked-nostore");
        expect(e.runMode).toBe("agentic");
        expect(e.mcp).toBeUndefined();
        expect(e.allowedTools).toEqual(["Task", "Read"]);
        expect(e.prompt).not.toContain("mcp__state__set");
      }
    }
  });
});

describe("e3 chunking", () => {
  const chunked = () => entries.filter((e) => variant(e).arm !== "internal");

  it("chunks are block-balanced and concatenate to the program body", () => {
    for (const e of chunked()) {
      const source = programSource(e);
      const body = source
        .split("\n")
        .slice(source.startsWith("---") ? source.split("\n").indexOf("---", 1) + 1 : 0)
        .filter((l) => !l.startsWith("# "))
        .join("\n")
        .replace(/\s+/g, " ")
        .trim();
      const chunks = sortedChunks(e);
      expect(chunks.length).toBe(variant(e).chunks);
      expect(chunks.length).toBe((e.expected as { chunkCount: number }).chunkCount);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      for (const c of chunks) {
        const opens = (c.match(/^\s*(?:FOR|IF|WHILE|CASE)\b/gm) ?? []).length;
        const closes = (c.match(/^\s*END\b/gm) ?? []).length;
        expect(opens).toBe(closes);
      }
      const joined = chunks.join("\n").replace(/\s+/g, " ").trim();
      expect(joined).toBe(body);
    }
  });

  it("every chunk respects the budget except where a single block overruns it", () => {
    for (const e of chunked()) {
      for (const c of sortedChunks(e)) {
        const lines = c.trimEnd().split("\n");
        // Walk the chunk: at every depth-0 boundary strictly before the final
        // line, the running statement count must still be UNDER budget —
        // splitChunks would have cut there otherwise. A chunk only exceeds
        // CHUNK_BUDGET when the block open at the boundary forced it on.
        let depth = 0;
        let statements = 0;
        lines.forEach((line, i) => {
          if (/^\s*(?:FOR|IF|WHILE|CASE)\b/.test(line)) depth++;
          else if (/^\s*END\b/.test(line)) depth--;
          if (line.trim() !== "") statements++;
          if (depth === 0 && i < lines.length - 1) {
            expect(statements, e.id).toBeLessThan(CHUNK_BUDGET);
          }
        });
      }
    }
  });

  it("internal prompts contain the full program; chunked prompts do not", () => {
    for (const e of entries) {
      const source = programSource(e);
      // A distinctive line from deep in the program body.
      const bodyLines = source
        .split("\n")
        .filter((l) => l.trim() !== "" && !l.startsWith("#") && !l.startsWith("---") && !/^name:/.test(l));
      const probe = bodyLines[Math.floor(bodyLines.length / 2)];
      if (variant(e).arm === "internal") {
        expect(e.prompt).toContain("--- BEGIN PROGRAM ---");
        for (const line of bodyLines) expect(e.prompt).toContain(line);
      } else {
        expect(e.prompt).not.toContain(probe);
        expect(e.prompt).toContain("--- BEGIN WORKER TEMPLATE ---");
        // Every chunk file listed in the prompt exists in the sandbox.
        for (const f of Object.keys(e.sandbox!)) expect(e.prompt).toContain(`./${f}`);
      }
    }
  });
});

describe("e3 sizes and determinism", () => {
  it("programs really are the 400/800-statement generator outputs", () => {
    const seen = new Set<string>();
    for (const e of entries) {
      const v = variant(e);
      expect([400, 800]).toContain(v.statements);
      const key = `${v.statements}-${v.seed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const regenerated = renderFlat(
        generateProgram({
          seed: v.seed,
          statements: v.statements,
          depth: v.depth,
          iterations: v.iterations,
          title: `e3-size${v.statements}-seed${v.seed}`,
        }),
        {},
      );
      const source = programSource(e);
      expect(source).toBe(regenerated);
      // The size parameter is the observable-statement budget: the reference
      // trace lands close beneath it (branches not taken cost budget).
      const trace = JSON.parse(readFileSync(join(PHASE_ROOT, e.tracePath!), "utf8"));
      expect(trace.length).toBeGreaterThan(v.statements * 0.8);
      expect(trace.length).toBeLessThanOrEqual(v.statements);
      // 800-statement programs are materially bigger than 400-statement ones.
      const bodyLines = source.split("\n").filter((l) => l.trim() !== "").length;
      expect(bodyLines).toBeGreaterThan(v.statements / 2);
    }
  });

  it("reference traces match the shared interpreter's emit/assign records", () => {
    for (const e of entries) {
      const trace = JSON.parse(readFileSync(join(PHASE_ROOT, e.tracePath!), "utf8"));
      expect(Array.isArray(trace)).toBe(true);
      for (const step of trace) {
        expect(["emit", "assign"]).toContain(step.action);
      }
      const v = variant(e);
      const fresh = interpret(
        generateProgram({
          seed: v.seed,
          statements: v.statements,
          depth: v.depth,
          iterations: v.iterations,
          title: `e3-size${v.statements}-seed${v.seed}`,
        }),
      );
      expect(trace).toEqual(JSON.parse(JSON.stringify(fresh)));
    }
  });

  it("regenerating produces identical entries", () => {
    const again = buildE3(PROGRAMS_DIR);
    expect(JSON.stringify(again)).toBe(JSON.stringify(entries));
  });

  it("splitChunks rejects programs too small to chunk", () => {
    expect(() => splitChunks("$a = 1\nSay $a\n")).toThrow(/too small/);
  });
});
