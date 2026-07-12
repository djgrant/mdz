/**
 * Reference interpreter.
 *
 * Executes a generated program IR deterministically and produces the canonical
 * trace defined in benchmark/DESIGN.md: a JSON array of emit/assign/call steps.
 * Control-flow decisions are implicit in which observable steps occur, so they
 * are not emitted as steps.
 */

import type {
  Cond,
  Expr,
  Module,
  ModuleTree,
  Program,
  Scalar,
  Stmt,
} from "../generator/ast.ts";

export type TraceStep =
  | { step: number; action: "emit"; value: string }
  | { step: number; action: "assign"; var: string; value: Scalar }
  | { step: number; action: "call"; target: string; args: Record<string, Scalar> };

export type Trace = TraceStep[];

const WHILE_ITERATION_CAP = 100_000;

class BreakSignal {}
class ContinueSignal {}

interface Ctx {
  trace: TraceStep[];
  step: number;
  modules: Map<string, Module>;
}

function stringify(value: Scalar): string {
  return typeof value === "number" ? String(value) : value;
}

function evalExpr(expr: Expr, env: Map<string, Scalar>): Scalar {
  switch (expr.kind) {
    case "num":
      return expr.value;
    case "str":
      return expr.value;
    case "var": {
      if (!env.has(expr.name)) {
        throw new Error(`unbound variable $${expr.name}`);
      }
      return env.get(expr.name)!;
    }
    case "arith": {
      const l = evalExpr(expr.left, env);
      const r = evalExpr(expr.right, env);
      if (typeof l !== "number" || typeof r !== "number") {
        throw new Error("arithmetic on non-number operand");
      }
      switch (expr.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "concat":
      return expr.parts.map((p) => stringify(evalExpr(p, env))).join("");
  }
}

function truthy(value: Scalar): boolean {
  if (typeof value === "number") return value !== 0;
  return value.length > 0;
}

function evalCond(cond: Cond, env: Map<string, Scalar>): boolean {
  switch (cond.kind) {
    case "compare": {
      const l = evalExpr(cond.left, env);
      const r = evalExpr(cond.right, env);
      switch (cond.op) {
        case "=":
          return l === r;
        case "!=":
          return l !== r;
        case "<":
          return Number(l) < Number(r);
        case ">":
          return Number(l) > Number(r);
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "and":
      return evalCond(cond.left, env) && evalCond(cond.right, env);
    case "or":
      return evalCond(cond.left, env) || evalCond(cond.right, env);
    case "not":
      return !evalCond(cond.operand, env);
  }
}

function runBlock(body: Stmt[], env: Map<string, Scalar>, ctx: Ctx): void {
  for (const stmt of body) {
    runStmt(stmt, env, ctx);
  }
}

function runStmt(stmt: Stmt, env: Map<string, Scalar>, ctx: Ctx): void {
  switch (stmt.kind) {
    case "assign": {
      const value = evalExpr(stmt.expr, env);
      env.set(stmt.var, value);
      ctx.trace.push({ step: ++ctx.step, action: "assign", var: stmt.var, value });
      return;
    }
    case "emit": {
      const value = stringify(evalExpr(stmt.expr, env));
      ctx.trace.push({ step: ++ctx.step, action: "emit", value });
      return;
    }
    case "if": {
      if (evalCond(stmt.cond, env)) runBlock(stmt.then, env, ctx);
      else runBlock(stmt.else, env, ctx);
      return;
    }
    case "for": {
      for (const item of stmt.items) {
        env.set(stmt.var, item);
        try {
          runBlock(stmt.body, env, ctx);
        } catch (sig) {
          if (sig instanceof BreakSignal) break;
          if (sig instanceof ContinueSignal) continue;
          throw sig;
        }
      }
      return;
    }
    case "while": {
      let guard = 0;
      while (truthy(env.get(stmt.counter)!)) {
        if (++guard > WHILE_ITERATION_CAP) {
          throw new Error("while loop exceeded iteration cap (non-terminating?)");
        }
        try {
          runBlock(stmt.body, env, ctx);
        } catch (sig) {
          if (sig instanceof BreakSignal) break;
          if (sig instanceof ContinueSignal) continue;
          throw sig;
        }
      }
      return;
    }
    case "case": {
      const subject = evalExpr(stmt.subject, env);
      for (const when of stmt.whens) {
        if (when.matches.some((m) => m === subject)) {
          runBlock(when.body, env, ctx);
          return;
        }
      }
      runBlock(stmt.else, env, ctx);
      return;
    }
    case "call": {
      const args: Record<string, Scalar> = {};
      for (const p of stmt.params) args[p.name] = evalExpr(p.expr, env);
      ctx.trace.push({ step: ++ctx.step, action: "call", target: stmt.target, args });
      const mod = ctx.modules.get(stmt.target);
      if (mod) {
        const childEnv = new Map<string, Scalar>();
        for (const name of mod.params) {
          if (name in args) childEnv.set(name, args[name]);
        }
        runBlock(mod.body, childEnv, ctx);
      }
      return;
    }
  }
}

/** Execute a program and return its canonical trace. */
export function interpret(program: Program): Trace {
  const ctx: Ctx = { trace: [], step: 0, modules: new Map() };
  const env = new Map<string, Scalar>();

  if (program.kind === "tree") {
    const tree: ModuleTree = program;
    for (const mod of tree.modules) ctx.modules.set(mod.path, mod);
    runBlock(tree.root, env, ctx);
  } else {
    runBlock(program.body, env, ctx);
  }
  return ctx.trace;
}
