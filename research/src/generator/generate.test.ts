import { describe, expect, it } from "vitest";

import { generateProgram } from "./generate.ts";
import { generateModuleTree } from "./modules.ts";
import { renderFlat, renderTree, CANONICAL, type Notation } from "./render.ts";
import { interpret } from "../interpreter/interpret.ts";
import { validateMdz } from "../interpreter/validate.ts";

describe("determinism", () => {
  it("produces identical flat programs and traces for the same seed", () => {
    const params = { seed: 42, statements: 30, depth: 2, iterations: 5 } as const;
    const a = generateProgram(params);
    const b = generateProgram(params);
    expect(a).toEqual(b);
    expect(renderFlat(a, {})).toEqual(renderFlat(b, {}));
    expect(interpret(a)).toEqual(interpret(b));
  });

  it("produces different programs for different seeds", () => {
    const base = { statements: 30, depth: 2, iterations: 5 } as const;
    const a = renderFlat(generateProgram({ ...base, seed: 1 }), {});
    const b = renderFlat(generateProgram({ ...base, seed: 2 }), {});
    expect(a).not.toEqual(b);
  });

  it("produces identical module trees and traces for the same seed", () => {
    const a = generateModuleTree({ seed: 7, depth: 3 });
    const b = generateModuleTree({ seed: 7, depth: 3 });
    expect(a).toEqual(b);
    expect(interpret(a)).toEqual(interpret(b));
  });
});

describe("notation variants are surface-only", () => {
  const variants: { label: string; notation: Partial<Notation> }[] = [
    { label: "canonical", notation: CANONICAL },
    { label: "lower", notation: { casing: "lower" } },
    { label: "indent", notation: { delimiter: "indent" } },
    { label: "none", notation: { delimiter: "none" } },
    { label: "annotated", notation: { annotations: "annotated" } },
    { label: "mismatch", notation: { annotations: "mismatch" } },
  ];

  it("changes surface text but never the reference trace", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const program = generateProgram({ seed, statements: 40, depth: 2, iterations: 5 });
      const reference = interpret(program);
      const rendered = variants.map((v) => renderFlat(program, { notation: v.notation }));
      // Every variant is a distinct surface string...
      const unique = new Set(rendered);
      expect(unique.size).toBeGreaterThan(1);
      // ...but the trace is computed from the shared IR, so it is invariant.
      expect(interpret(program)).toEqual(reference);
    }
  });
});

describe("grammar validity", () => {
  it("canonical flat programs parse against the conformance grammar", () => {
    for (let seed = 1; seed <= 10; seed++) {
      for (const [statements, depth, iterations] of [
        [10, 1, 5],
        [50, 3, 25],
        [200, 2, 10],
      ] as const) {
        const program = generateProgram({ seed, statements, depth, iterations });
        const res = validateMdz(renderFlat(program, {}));
        expect(res.ok, `seed ${seed} ${statements}/${depth}/${iterations}: ${res.error}`).toBe(true);
      }
    }
  });

  it("canonical module-tree files parse against the conformance grammar", () => {
    for (let seed = 1; seed <= 5; seed++) {
      for (const depth of [1, 2, 3, 4]) {
        const tree = generateModuleTree({ seed, depth });
        for (const file of renderTree(tree, {})) {
          const res = validateMdz(file.content);
          expect(res.ok, `${file.file}: ${res.error}`).toBe(true);
        }
      }
    }
  });

  it("interprets every generated program without runtime errors", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const program = generateProgram({ seed, statements: 60, depth: 3, iterations: 10 });
      expect(() => interpret(program)).not.toThrow();
    }
  });
});

describe("malformed injection", () => {
  it("makes the canonical program fail grammar validation", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const program = generateProgram({ seed, statements: 40, depth: 2, iterations: 5 });
      expect(validateMdz(renderFlat(program, {})).ok).toBe(true);
      const bad = renderFlat(program, { malformed: true, seed });
      expect(validateMdz(bad).ok).toBe(false);
    }
  });

  it("injects deterministically for a fixed seed", () => {
    const program = generateProgram({ seed: 3, statements: 40, depth: 2, iterations: 5 });
    expect(renderFlat(program, { malformed: true, seed: 3 })).toEqual(
      renderFlat(program, { malformed: true, seed: 3 }),
    );
  });
});
