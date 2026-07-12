/**
 * Renders a program IR to MDZ source text in one of several notation variants.
 *
 * The notation variants are the surface-syntax dimensions of research question
 * q1. They never change the program's meaning, so the reference trace is
 * identical across every variant of the same IR.
 */

import type {
  CaseWhen,
  Cond,
  Expr,
  FlatProgram,
  ModuleTree,
  Program,
  Scalar,
  Stmt,
  TypeName,
} from "./ast.ts";
import { Rng } from "./rng.ts";

export interface Notation {
  /** keyword casing: canonical CAPS or lowercase */
  casing: "upper" | "lower";
  /** how blocks are closed: END keyword / indentation-only / neither */
  delimiter: "end" | "indent" | "none";
  /** type annotations on assignments */
  annotations: "none" | "annotated" | "mismatch";
}

export const CANONICAL: Notation = {
  casing: "upper",
  delimiter: "end",
  annotations: "none",
};

export interface RenderOptions {
  notation?: Partial<Notation>;
  /** inject exactly one syntax error (seeded) */
  malformed?: boolean;
  /** seed for malformed injection */
  seed?: number;
}

const KEYWORDS = [
  "FOR", "IN", "DO", "END", "IF", "THEN", "ELSE", "WHILE", "CASE", "WHEN",
  "USE", "SPAWN", "WITH", "TO", "AND", "OR", "NOT",
] as const;

function makeKw(casing: Notation["casing"]) {
  return (name: (typeof KEYWORDS)[number]): string =>
    casing === "upper" ? name : name.toLowerCase();
}

const INDENT_UNIT = "  ";

function scalarLiteral(v: Scalar): string {
  return typeof v === "number" ? String(v) : JSON.stringify(v);
}

function staticType(expr: Expr): TypeName | undefined {
  switch (expr.kind) {
    case "num":
    case "arith":
      return "Number";
    case "str":
    case "concat":
      return "String";
    case "var":
      return undefined;
  }
}

function renderExpr(expr: Expr): string {
  switch (expr.kind) {
    case "num":
      return String(expr.value);
    case "str":
      return JSON.stringify(expr.value);
    case "var":
      return `$${expr.name}`;
    case "arith":
      return `${renderExpr(expr.left)} ${expr.op} ${renderExpr(expr.right)}`;
    case "concat":
      return expr.parts.map(renderExpr).join(" + ");
  }
}

function renderCond(cond: Cond, kw: ReturnType<typeof makeKw>): string {
  switch (cond.kind) {
    case "compare":
      return `${renderExpr(cond.left)} ${cond.op} ${renderExpr(cond.right)}`;
    case "and":
      return `${renderCond(cond.left, kw)} ${kw("AND")} ${renderCond(cond.right, kw)}`;
    case "or":
      return `${renderCond(cond.left, kw)} ${kw("OR")} ${renderCond(cond.right, kw)}`;
    case "not":
      return `${kw("NOT")} ${renderCond(cond.operand, kw)}`;
  }
}

class Emitter {
  lines: string[] = [];
  constructor(
    private notation: Notation,
    private kw: ReturnType<typeof makeKw>,
  ) {}

  private pad(depth: number): string {
    return this.notation.delimiter === "none" ? "" : INDENT_UNIT.repeat(depth);
  }

  line(depth: number, text: string): void {
    this.lines.push(this.pad(depth) + text);
  }

  /** Close a block: emit END only in the "end" delimiter variant. */
  close(depth: number): void {
    if (this.notation.delimiter === "end") this.line(depth, this.kw("END"));
  }

  stmts(body: Stmt[], depth: number): void {
    for (const s of body) this.stmt(s, depth);
  }

  stmt(stmt: Stmt, depth: number): void {
    const kw = this.kw;
    switch (stmt.kind) {
      case "assign": {
        let ann = "";
        if (this.notation.annotations !== "none") {
          const t = staticType(stmt.expr) ?? stmt.annotation;
          if (t) {
            const declared =
              this.notation.annotations === "mismatch"
                ? t === "Number"
                  ? "String"
                  : "Number"
                : t;
            ann = `: ${declared}`;
          }
        }
        this.line(depth, `$${stmt.var}${ann} = ${renderExpr(stmt.expr)}`);
        return;
      }
      case "emit":
        this.line(depth, `Say ${renderExpr(stmt.expr)}`);
        return;
      case "if": {
        this.line(depth, `${kw("IF")} ${renderCond(stmt.cond, kw)} ${kw("THEN")}`);
        this.stmts(stmt.then, depth + 1);
        if (stmt.else.length) {
          this.line(depth, kw("ELSE"));
          this.stmts(stmt.else, depth + 1);
        }
        this.close(depth);
        return;
      }
      case "for": {
        const arr = `[${stmt.items.map(scalarLiteral).join(", ")}]`;
        this.line(depth, `${kw("FOR")} $${stmt.var} ${kw("IN")} ${arr}`);
        this.stmts(stmt.body, depth + 1);
        this.close(depth);
        return;
      }
      case "while": {
        this.line(depth, `${kw("WHILE")} $${stmt.counter} != 0`);
        this.stmts(stmt.body, depth + 1);
        this.close(depth);
        return;
      }
      case "case": {
        this.line(depth, `${kw("CASE")} ${renderExpr(stmt.subject)}`);
        for (const when of stmt.whens) this.caseWhen(when, depth);
        if (stmt.else.length) {
          this.line(depth, kw("ELSE"));
          this.stmts(stmt.else, depth + 1);
        }
        this.close(depth);
        return;
      }
      case "call": {
        const params = stmt.params.map((p) => ({ name: p.name, text: renderExpr(p.expr) }));
        if (stmt.verb === "USE") {
          this.line(depth, `${kw("USE")} ${stmt.target} ${kw("WITH")}`);
        } else {
          this.line(depth, `${kw("SPAWN")} ${stmt.target}`);
          this.line(depth, kw("WITH"));
        }
        for (const p of params) this.line(depth + 1, `${p.name}: ${p.text}`);
        return;
      }
    }
  }

  caseWhen(when: CaseWhen, depth: number): void {
    const matches = when.matches.map(scalarLiteral).join(` ${this.kw("OR")} `);
    this.line(depth, `${this.kw("WHEN")} ${matches}`);
    this.stmts(when.body, depth + 1);
  }
}

function resolveNotation(n?: Partial<Notation>): Notation {
  return { ...CANONICAL, ...n };
}

/**
 * Inject exactly one syntax error. Prefers deleting a block terminator; falls
 * back to prepending an unmatched END (a guaranteed parse error even for
 * keyword-free programs).
 */
function injectMalformed(lines: string[], rng: Rng, kw: string): string[] {
  const out = [...lines];
  const endIdx: number[] = [];
  const endRe = new RegExp(`^\\s*${kw}\\s*$`, "i");
  out.forEach((l, i) => {
    if (endRe.test(l)) endIdx.push(i);
  });
  if (endIdx.length > 0) {
    const victim = rng.pick(endIdx);
    out.splice(victim, 1);
    return out;
  }
  // No terminator to remove: introduce an unmatched END near the top.
  const at = out.length > 1 ? rng.int(1, out.length - 1) : out.length;
  out.splice(at, 0, kw);
  return out;
}

function frontmatter(name: string): string {
  return `---\nname: ${name}\n---\n\n# ${name}\n`;
}

/** Render a flat program to a single MDZ document. */
export function renderFlat(program: FlatProgram, opts: RenderOptions = {}): string {
  const notation = resolveNotation(opts.notation);
  const kw = makeKw(notation.casing);
  const emitter = new Emitter(notation, kw);
  emitter.stmts(program.body, 0);
  let lines = emitter.lines;
  if (opts.malformed) {
    lines = injectMalformed(lines, new Rng(opts.seed ?? 1), kw("END"));
  }
  return `${frontmatter(program.title)}\n${lines.join("\n")}\n`;
}

export interface RenderedFile {
  file: string;
  content: string;
}

/** Render a module tree to a root document plus one file per module. */
export function renderTree(tree: ModuleTree, opts: RenderOptions = {}): RenderedFile[] {
  const notation = resolveNotation(opts.notation);
  const kw = makeKw(notation.casing);

  const rootEmitter = new Emitter(notation, kw);
  rootEmitter.stmts(tree.root, 0);
  const files: RenderedFile[] = [
    { file: "root.mdz", content: `${frontmatter(tree.title)}\n${rootEmitter.lines.join("\n")}\n` },
  ];

  for (const mod of tree.modules) {
    const e = new Emitter(notation, kw);
    e.stmts(mod.body, 0);
    const name = mod.path.split("/").pop() ?? "module";
    const header = `---\nname: ${name}\ninput: ${mod.params.join(", ")}\n---\n\n# ${name}\n`;
    files.push({ file: mod.file, content: `${header}\n${e.lines.join("\n")}\n` });
  }
  return files;
}

/** Render either program shape; flat -> one file "root.mdz" for uniformity. */
export function render(program: Program, opts: RenderOptions = {}): RenderedFile[] {
  if (program.kind === "tree") return renderTree(program, opts);
  return [{ file: "program.mdz", content: renderFlat(program, opts) }];
}
