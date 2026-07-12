/**
 * Seeded random generator for flat MDZ programs (q1/q2/q3/q5).
 *
 * Programs are self-contained: integer/string literals, arithmetic, string
 * concatenation, IF/ELSE, FOR over literal arrays, WHILE with a counter, CASE,
 * assignments and observable "Say ..." emit steps. Values are kept small and
 * unambiguous so the reference trace is fully determined.
 */

import type { Cond, Expr, FlatProgram, Scalar, Stmt } from "./ast.ts";
import { Rng } from "./rng.ts";

export interface GenerateParams {
  seed: number;
  /** target number of observable source statements (assign + emit) */
  statements: number;
  /** maximum control-flow nesting depth */
  depth: number;
  /** trip counts for FOR arrays and WHILE counters */
  iterations: number;
  title?: string;
}

const STRINGS = ["draft", "ok", "done", "red", "blue", "next", "hold"] as const;

interface Scope {
  num: string[];
  str: string[];
}

class Generator {
  private rng: Rng;
  private counter = 0; // observable statements produced so far
  private target: number;
  private varSeq = 0;
  private iterations: number;
  private maxDepth: number;

  constructor(params: GenerateParams) {
    this.rng = new Rng(params.seed);
    this.target = Math.max(2, params.statements);
    this.iterations = Math.max(1, params.iterations);
    this.maxDepth = Math.max(0, params.depth);
  }

  private freshVar(): string {
    return `v${this.varSeq++}`;
  }

  private smallInt(): number {
    return this.rng.int(0, 9);
  }

  // --- expression builders ------------------------------------------------

  private numExpr(scope: Scope): Expr {
    if (scope.num.length > 0 && this.rng.chance(0.6)) {
      const left: Expr = { kind: "var", name: this.rng.pick(scope.num) };
      const op = this.rng.pick(["+", "-", "*"] as const);
      const right: Expr = { kind: "num", value: this.rng.int(1, 5) };
      return { kind: "arith", op, left, right };
    }
    return { kind: "num", value: this.smallInt() };
  }

  private strExpr(scope: Scope): Expr {
    if (scope.str.length > 0 && this.rng.chance(0.5)) {
      return {
        kind: "concat",
        parts: [
          { kind: "var", name: this.rng.pick(scope.str) },
          { kind: "str", value: this.rng.pick(STRINGS) },
        ],
      };
    }
    return { kind: "str", value: this.rng.pick(STRINGS) };
  }

  // --- statement builders -------------------------------------------------

  private assign(scope: Scope, forceType?: "num" | "str"): Stmt {
    const type = forceType ?? (this.rng.chance(0.6) ? "num" : "str");
    const name = this.freshVar();
    const expr = type === "num" ? this.numExpr(scope) : this.strExpr(scope);
    if (type === "num") scope.num.push(name);
    else scope.str.push(name);
    this.counter++;
    return { kind: "assign", var: name, expr };
  }

  private emit(scope: Scope): Stmt {
    const all = [...scope.num, ...scope.str];
    this.counter++;
    if (all.length > 0 && this.rng.chance(0.85)) {
      return { kind: "emit", expr: { kind: "var", name: this.rng.pick(all) } };
    }
    return { kind: "emit", expr: { kind: "str", value: this.rng.pick(STRINGS) } };
  }

  private condFor(scope: Scope): Cond {
    if (scope.num.length > 0) {
      return {
        kind: "compare",
        op: this.rng.pick(["=", "!=", "<", ">"] as const),
        left: { kind: "var", name: this.rng.pick(scope.num) },
        right: { kind: "num", value: this.smallInt() },
      };
    }
    return { kind: "compare", op: "=", left: { kind: "num", value: 1 }, right: { kind: "num", value: 1 } };
  }

  /**
   * A short body of simple statements at the given depth.
   *
   * Runs in an isolated child scope (copied arrays): the interpreter's env is
   * flat and control-flow bodies may not execute, so variables declared here
   * must never leak to statements that follow the enclosing block, or a later
   * reference could resolve to an unbound variable at runtime.
   */
  private simpleBody(outer: Scope, depth: number, min = 1, max = 2): Stmt[] {
    const scope: Scope = { num: [...outer.num], str: [...outer.str] };
    const body: Stmt[] = [];
    const n = this.rng.int(min, max);
    for (let i = 0; i < n && this.counter < this.target; i++) {
      body.push(this.rng.chance(0.5) ? this.assign(scope, "num") : this.emit(scope));
    }
    // ensure a non-empty body
    if (body.length === 0) body.push(this.emit(scope));
    return body;
  }

  private ifBlock(scope: Scope, depth: number, inner?: Stmt): Stmt {
    const then: Stmt[] = inner ? [inner] : this.simpleBody(scope, depth);
    const els: Stmt[] = this.rng.chance(0.4) ? this.simpleBody(scope, depth) : [];
    return { kind: "if", cond: this.condFor(scope), then, else: els };
  }

  private forBlock(scope: Scope, depth: number): Stmt {
    const loopVar = this.freshVar();
    const items: Scalar[] = [];
    for (let i = 0; i < this.iterations; i++) items.push(this.smallInt());
    const body: Stmt[] = [{ kind: "emit", expr: { kind: "var", name: loopVar } }];
    this.counter += this.iterations; // emits once per trip in the trace
    return { kind: "for", var: loopVar, items, body };
  }

  private caseBlock(scope: Scope, depth: number): Stmt {
    const subject: Expr =
      scope.str.length > 0
        ? { kind: "var", name: this.rng.pick(scope.str) }
        : { kind: "str", value: this.rng.pick(STRINGS) };
    const whens = [
      { matches: [this.rng.pick(STRINGS)] as Scalar[], body: this.simpleBody(scope, depth) },
      { matches: [this.rng.pick(STRINGS)] as Scalar[], body: this.simpleBody(scope, depth) },
    ];
    const els = this.simpleBody(scope, depth);
    return { kind: "case", subject, whens, else: els };
  }

  /** Build a chain of nested IF blocks to guarantee the requested depth. */
  private nestedChain(scope: Scope, depth: number): Stmt {
    let inner: Stmt = this.emit(scope);
    for (let d = 0; d < depth; d++) {
      inner = { kind: "if", cond: this.condFor(scope), then: [inner], else: [] };
    }
    return inner;
  }

  generate(title = "program"): FlatProgram {
    const scope: Scope = { num: [], str: [] };
    const body: Stmt[] = [];

    // Seed base variables.
    body.push(this.assign(scope, "num"));
    body.push(this.assign(scope, "num"));
    body.push(this.assign(scope, "str"));

    // Guarantee the requested nesting depth exactly once.
    if (this.maxDepth >= 1) {
      body.push(this.nestedChain(scope, this.maxDepth));
    }

    // Fill remaining budget with flat units at depth 1.
    while (this.counter < this.target) {
      const roll = this.rng.next();
      if (this.maxDepth >= 1 && roll < 0.18) {
        body.push(this.ifBlock(scope, 1));
      } else if (this.maxDepth >= 1 && roll < 0.3) {
        body.push(this.forBlock(scope, 1));
      } else if (this.maxDepth >= 1 && roll < 0.4) {
        const counterInit = this.freshVarInit(scope);
        body.push(counterInit.stmt);
        body.push(this.whileBlockFrom(counterInit.name));
      } else if (this.maxDepth >= 1 && roll < 0.48 && scope.str.length > 0) {
        body.push(this.caseBlock(scope, 1));
      } else if (roll < 0.72) {
        body.push(this.assign(scope));
      } else {
        body.push(this.emit(scope));
      }
    }

    return { kind: "flat", title, body };
  }

  // WHILE with an explicit, caller-visible counter initialisation.
  private freshVarInit(scope: Scope): { name: string; stmt: Stmt } {
    const name = this.freshVar();
    scope.num.push(name);
    this.counter++;
    return { name, stmt: { kind: "assign", var: name, expr: { kind: "num", value: this.iterations } } };
  }

  private whileBlockFrom(counter: string): Stmt {
    const body: Stmt[] = [
      { kind: "emit", expr: { kind: "var", name: counter } },
      { kind: "assign", var: counter, expr: { kind: "arith", op: "-", left: { kind: "var", name: counter }, right: { kind: "num", value: 1 } } },
    ];
    this.counter += this.iterations * 2;
    return { kind: "while", counter, body };
  }
}

export function generateProgram(params: GenerateParams): FlatProgram {
  return new Generator(params).generate(params.title ?? "program");
}
