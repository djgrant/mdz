/**
 * Seeded generator for MDZ module trees (q4: cross-module binding).
 *
 * A root program computes three parameter values and passes them across a
 * chain of USE/SPAWN boundaries. At every boundary three params are bound,
 * and each param flows through arithmetic that affects emitted values and the
 * values passed to the next level. Call depth is parameterisable 1..4.
 */

import type { CallParam, Module, ModuleTree, Stmt } from "./ast.ts";
import { Rng } from "./rng.ts";

export interface ModuleTreeParams {
  seed: number;
  /** call depth: number of module boundaries crossed (1..4) */
  depth: number;
  /** params per boundary (default 3) */
  params?: number;
  title?: string;
  /** verb used at boundaries */
  verb?: "USE" | "SPAWN";
}

const PARAM_NAMES = ["p", "q", "r", "s", "t"] as const;

export function generateModuleTree(params: ModuleTreeParams): ModuleTree {
  const rng = new Rng(params.seed);
  const depth = Math.min(4, Math.max(1, params.depth));
  const nParams = Math.min(PARAM_NAMES.length, params.params ?? 3);
  const verb = params.verb ?? "USE";
  const names = PARAM_NAMES.slice(0, nParams);

  // Root: compute the initial parameter values from small literals.
  const rootVars = names.map((_, i) => `a${i}`);
  const root: Stmt[] = [];
  for (let i = 0; i < names.length; i++) {
    root.push({ kind: "assign", var: rootVars[i], expr: { kind: "num", value: rng.int(1, 5) } });
  }
  root.push({
    kind: "call",
    verb,
    target: "~/skills/level1",
    params: names.map((n, i): CallParam => ({ name: n, expr: { kind: "var", name: rootVars[i] } })),
  });

  // Levels 1..depth. Each level emits its params, derives new values, and
  // (unless it is the last) passes them to the next level.
  const modules: Module[] = [];
  for (let k = 1; k <= depth; k++) {
    const body: Stmt[] = [];
    // Emit each incoming param so binding fidelity is observable.
    for (const n of names) body.push({ kind: "emit", expr: { kind: "var", name: n } });

    // Derive new values that depend on the incoming params.
    const derived = names.map((n) => `d_${n}`);
    for (let i = 0; i < names.length; i++) {
      const op = (["+", "*", "-"] as const)[i % 3];
      const operand = 1 + ((k + i) % 3);
      body.push({
        kind: "assign",
        var: derived[i],
        expr: { kind: "arith", op, left: { kind: "var", name: names[i] }, right: { kind: "num", value: operand } },
      });
      body.push({ kind: "emit", expr: { kind: "var", name: derived[i] } });
    }

    if (k < depth) {
      body.push({
        kind: "call",
        verb,
        target: `~/skills/level${k + 1}`,
        params: names.map((n, i): CallParam => ({ name: n, expr: { kind: "var", name: derived[i] } })),
      });
    }

    modules.push({
      path: `~/skills/level${k}`,
      file: `skills/level${k}.mdz`,
      params: [...names],
      body,
    });
  }

  return {
    kind: "tree",
    title: params.title ?? `moduletree-depth${depth}`,
    root,
    modules,
  };
}
