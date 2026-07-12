import { describe, expect, it } from "vitest";

import type { FlatProgram, ModuleTree } from "../generator/ast.ts";
import { interpret, type Trace } from "./interpret.ts";

function flat(body: FlatProgram["body"]): FlatProgram {
  return { kind: "flat", title: "t", body };
}

describe("hand-checked traces", () => {
  it("assignments and arithmetic", () => {
    const p = flat([
      { kind: "assign", var: "x", expr: { kind: "num", value: 2 } },
      { kind: "assign", var: "y", expr: { kind: "arith", op: "+", left: { kind: "var", name: "x" }, right: { kind: "num", value: 3 } } },
      { kind: "emit", expr: { kind: "var", name: "y" } },
    ]);
    expect(interpret(p)).toEqual<Trace>([
      { step: 1, action: "assign", var: "x", value: 2 },
      { step: 2, action: "assign", var: "y", value: 5 },
      { step: 3, action: "emit", value: "5" },
    ]);
  });

  it("string concat", () => {
    const p = flat([
      { kind: "assign", var: "a", expr: { kind: "str", value: "foo" } },
      { kind: "assign", var: "b", expr: { kind: "concat", parts: [{ kind: "var", name: "a" }, { kind: "str", value: "bar" }] } },
      { kind: "emit", expr: { kind: "var", name: "b" } },
    ]);
    expect(interpret(p)).toEqual<Trace>([
      { step: 1, action: "assign", var: "a", value: "foo" },
      { step: 2, action: "assign", var: "b", value: "foobar" },
      { step: 3, action: "emit", value: "foobar" },
    ]);
  });

  it("IF takes the true branch only", () => {
    const p = flat([
      { kind: "assign", var: "x", expr: { kind: "num", value: 1 } },
      {
        kind: "if",
        cond: { kind: "compare", op: "=", left: { kind: "var", name: "x" }, right: { kind: "num", value: 1 } },
        then: [{ kind: "emit", expr: { kind: "str", value: "yes" } }],
        else: [{ kind: "emit", expr: { kind: "str", value: "no" } }],
      },
    ]);
    expect(interpret(p)).toEqual<Trace>([
      { step: 1, action: "assign", var: "x", value: 1 },
      { step: 2, action: "emit", value: "yes" },
    ]);
  });

  it("FOR over a literal array", () => {
    const p = flat([
      { kind: "for", var: "i", items: [1, 2, 3], body: [{ kind: "emit", expr: { kind: "var", name: "i" } }] },
    ]);
    expect(interpret(p)).toEqual<Trace>([
      { step: 1, action: "emit", value: "1" },
      { step: 2, action: "emit", value: "2" },
      { step: 3, action: "emit", value: "3" },
    ]);
  });

  it("WHILE counts down", () => {
    const p = flat([
      { kind: "assign", var: "n", expr: { kind: "num", value: 2 } },
      {
        kind: "while",
        counter: "n",
        body: [
          { kind: "emit", expr: { kind: "var", name: "n" } },
          { kind: "assign", var: "n", expr: { kind: "arith", op: "-", left: { kind: "var", name: "n" }, right: { kind: "num", value: 1 } } },
        ],
      },
    ]);
    expect(interpret(p)).toEqual<Trace>([
      { step: 1, action: "assign", var: "n", value: 2 },
      { step: 2, action: "emit", value: "2" },
      { step: 3, action: "assign", var: "n", value: 1 },
      { step: 4, action: "emit", value: "1" },
      { step: 5, action: "assign", var: "n", value: 0 },
    ]);
  });

  it("CASE picks the first matching WHEN", () => {
    const p = flat([
      { kind: "assign", var: "s", expr: { kind: "str", value: "b" } },
      {
        kind: "case",
        subject: { kind: "var", name: "s" },
        whens: [
          { matches: ["a"], body: [{ kind: "emit", expr: { kind: "str", value: "one" } }] },
          { matches: ["b", "c"], body: [{ kind: "emit", expr: { kind: "str", value: "two" } }] },
        ],
        else: [{ kind: "emit", expr: { kind: "str", value: "other" } }],
      },
    ]);
    expect(interpret(p)).toEqual<Trace>([
      { step: 1, action: "assign", var: "s", value: "b" },
      { step: 2, action: "emit", value: "two" },
    ]);
  });
});

describe("module trees produce call steps with bound args", () => {
  it("params flow through two boundaries", () => {
    const tree: ModuleTree = {
      kind: "tree",
      title: "t",
      root: [
        { kind: "assign", var: "a", expr: { kind: "num", value: 5 } },
        { kind: "call", verb: "USE", target: "~/skills/level1", params: [{ name: "p", expr: { kind: "var", name: "a" } }] },
      ],
      modules: [
        {
          path: "~/skills/level1",
          file: "skills/level1.mdz",
          params: ["p"],
          body: [
            { kind: "emit", expr: { kind: "var", name: "p" } },
            { kind: "assign", var: "d", expr: { kind: "arith", op: "+", left: { kind: "var", name: "p" }, right: { kind: "num", value: 1 } } },
            { kind: "call", verb: "USE", target: "~/skills/level2", params: [{ name: "p", expr: { kind: "var", name: "d" } }] },
          ],
        },
        {
          path: "~/skills/level2",
          file: "skills/level2.mdz",
          params: ["p"],
          body: [{ kind: "emit", expr: { kind: "var", name: "p" } }],
        },
      ],
    };
    expect(interpret(tree)).toEqual<Trace>([
      { step: 1, action: "assign", var: "a", value: 5 },
      { step: 2, action: "call", target: "~/skills/level1", args: { p: 5 } },
      { step: 3, action: "emit", value: "5" },
      { step: 4, action: "assign", var: "d", value: 6 },
      { step: 5, action: "call", target: "~/skills/level2", args: { p: 6 } },
      { step: 6, action: "emit", value: "6" },
    ]);
  });
});
