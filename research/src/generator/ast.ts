/**
 * Intermediate representation for generated MDZ programs.
 *
 * The generator builds this IR, the interpreter executes it to produce the
 * canonical trace, and the renderer serialises it to MDZ text (in one of
 * several notation variants). Because interpreter and renderer share this IR,
 * the reference trace is invariant across notation variants by construction.
 */

export type Scalar = number | string;

// ---------------------------------------------------------------------------
// Expressions (value position)
// ---------------------------------------------------------------------------

export type Expr =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "var"; name: string }
  | { kind: "arith"; op: "+" | "-" | "*"; left: Expr; right: Expr }
  | { kind: "concat"; parts: Expr[] };

// ---------------------------------------------------------------------------
// Conditions (only valid in IF / WHILE / CASE-WHEN positions)
// ---------------------------------------------------------------------------

export type Cond =
  | { kind: "compare"; op: "=" | "!=" | "<" | ">"; left: Expr; right: Expr }
  | { kind: "and"; left: Cond; right: Cond }
  | { kind: "or"; left: Cond; right: Cond }
  | { kind: "not"; operand: Cond };

// ---------------------------------------------------------------------------
// Statements
// ---------------------------------------------------------------------------

export type Stmt =
  | { kind: "assign"; var: string; expr: Expr; annotation?: TypeName }
  | { kind: "emit"; expr: Expr }
  | { kind: "if"; cond: Cond; then: Stmt[]; else: Stmt[] }
  | { kind: "for"; var: string; items: Scalar[]; body: Stmt[] }
  | { kind: "while"; counter: string; body: Stmt[] }
  | { kind: "case"; subject: Expr; whens: CaseWhen[]; else: Stmt[] }
  | { kind: "call"; verb: "USE" | "SPAWN"; target: string; params: CallParam[] };

export type TypeName = "Number" | "String";

export interface CaseWhen {
  matches: Scalar[];
  body: Stmt[];
}

export interface CallParam {
  name: string;
  expr: Expr;
}

// A flat, self-contained program (q1/q2/q3/q5).
export interface FlatProgram {
  kind: "flat";
  title: string;
  body: Stmt[];
}

// A skill/agent module reachable via USE/SPAWN.
export interface Module {
  // path used in USE/SPAWN targets, e.g. "~/skills/level1"
  path: string;
  // on-disk file name relative to the program folder, e.g. "skills/level1.mdz"
  file: string;
  params: string[];
  body: Stmt[];
}

// A module tree (q4): a root program plus reachable modules.
export interface ModuleTree {
  kind: "tree";
  title: string;
  root: Stmt[];
  modules: Module[];
}

export type Program = FlatProgram | ModuleTree;
