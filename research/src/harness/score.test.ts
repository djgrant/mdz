import { describe, expect, it } from "vitest";
import {
  classifyMalformed,
  extractTrace,
  firstDivergence,
  lcsLength,
  scoreTrace,
  stepsEqual,
  type Step,
} from "./score.js";

const ref: Step[] = [
  { step: 1, action: "assign", var: "x", value: 3 },
  { step: 2, action: "assign", var: "y", value: 7 },
  { step: 3, action: "emit", value: "7" },
  { step: 4, action: "emit", value: "big" },
];

describe("normalisation / stepsEqual", () => {
  it("compares numeric string to number", () => {
    expect(stepsEqual({ action: "emit", value: "7" }, { action: "emit", value: 7 })).toBe(true);
  });
  it("trims strings", () => {
    expect(
      stepsEqual({ action: "emit", value: "  big " }, { action: "emit", value: "big" }),
    ).toBe(true);
  });
  it("distinguishes different actions", () => {
    expect(
      stepsEqual({ action: "emit", value: 1 }, { action: "assign", var: "a", value: 1 }),
    ).toBe(false);
  });
  it("ignores step index", () => {
    expect(
      stepsEqual({ step: 9, action: "emit", value: "a" }, { step: 1, action: "emit", value: "a" }),
    ).toBe(true);
  });
  it("compares call target + args order-independently", () => {
    expect(
      stepsEqual(
        { action: "call", target: "skills/f", args: { a: 1, b: "2" } },
        { action: "call", target: "skills/f", args: { b: 2, a: "1" } },
      ),
    ).toBe(true);
  });
  it("detects arg mismatch", () => {
    expect(
      stepsEqual(
        { action: "call", target: "skills/f", args: { a: 1 } },
        { action: "call", target: "skills/f", args: { a: 2 } },
      ),
    ).toBe(false);
  });
});

describe("scoreTrace", () => {
  it("exact match", () => {
    const s = scoreTrace(structuredClone(ref), ref);
    expect(s.exact).toBe(1);
    expect(s.stepAccuracy).toBe(1);
    expect(s.firstDivergence).toBeNull();
  });
  it("normalised exact match (string vs number)", () => {
    const model: Step[] = [
      { step: 1, action: "assign", var: "x", value: "3" },
      { step: 2, action: "assign", var: "y", value: "7" },
      { step: 3, action: "emit", value: 7 },
      { step: 4, action: "emit", value: "big " },
    ];
    expect(scoreTrace(model, ref).exact).toBe(1);
  });
  it("one wrong step lowers accuracy and sets firstDivergence", () => {
    const model = structuredClone(ref);
    model[2] = { step: 3, action: "emit", value: "8" };
    const s = scoreTrace(model, ref);
    expect(s.exact).toBe(0);
    expect(s.firstDivergence).toBe(2);
    expect(s.stepAccuracy).toBeCloseTo(3 / 4);
  });
  it("missing trailing step", () => {
    const model = ref.slice(0, 3);
    const s = scoreTrace(model, ref);
    expect(s.exact).toBe(0);
    expect(s.firstDivergence).toBe(3);
    expect(s.stepAccuracy).toBeCloseTo(3 / 4);
  });
  it("extra inserted step keeps LCS high", () => {
    const model = [...ref.slice(0, 2), { action: "emit", value: "noise" } as Step, ...ref.slice(2)];
    const s = scoreTrace(model, ref);
    expect(s.exact).toBe(0);
    expect(s.stepAccuracy).toBe(1); // all 4 ref steps are a subsequence
    expect(s.firstDivergence).toBe(2);
  });
  it("empty model trace", () => {
    const s = scoreTrace([], ref);
    expect(s.exact).toBe(0);
    expect(s.stepAccuracy).toBe(0);
    expect(s.firstDivergence).toBe(0);
  });
});

describe("paramFidelity", () => {
  const cref: Step[] = [
    { action: "call", target: "skills/a", args: { n: 1 } },
    { action: "call", target: "skills/b", args: { n: 2 } },
  ];
  it("all args correct", () => {
    expect(scoreTrace(structuredClone(cref), cref, { paramFidelity: true }).paramFidelity).toBe(1);
  });
  it("half correct", () => {
    const model: Step[] = [
      { action: "call", target: "skills/a", args: { n: 1 } },
      { action: "call", target: "skills/b", args: { n: 99 } },
    ];
    expect(scoreTrace(model, cref, { paramFidelity: true }).paramFidelity).toBe(0.5);
  });
});

describe("lcsLength / firstDivergence", () => {
  it("lcs of disjoint is 0", () => {
    expect(lcsLength([{ action: "emit", value: "a" }], [{ action: "emit", value: "b" }])).toBe(0);
  });
  it("firstDivergence null for exact prefix equality", () => {
    expect(firstDivergence(ref.slice(0, 2), ref.slice(0, 2))).toBeNull();
  });
});

describe("extractTrace", () => {
  const arr = `[{"step":1,"action":"emit","value":"7"}]`;

  it("plain fenced json", () => {
    const raw = "Here is the trace:\n```json\n" + arr + "\n```";
    expect(extractTrace(raw)).toEqual([{ step: 1, action: "emit", value: "7" }]);
  });
  it("prefers the LAST fenced block", () => {
    const raw =
      "```json\n[{\"step\":1,\"action\":\"emit\",\"value\":\"first\"}]\n```\n" +
      "reconsidering...\n```json\n[{\"step\":1,\"action\":\"emit\",\"value\":\"final\"}]\n```";
    expect(extractTrace(raw)).toEqual([{ step: 1, action: "emit", value: "final" }]);
  });
  it("tolerates trailing prose after the block", () => {
    const raw = "```json\n" + arr + "\n```\nThat completes the execution.";
    expect(extractTrace(raw)?.length).toBe(1);
  });
  it("bare fence without json tag", () => {
    const raw = "```\n" + arr + "\n```";
    expect(extractTrace(raw)?.length).toBe(1);
  });
  it("no fence, raw array in prose", () => {
    const raw = "The trace is " + arr + " and that's it.";
    expect(extractTrace(raw)?.length).toBe(1);
  });
  it("wrapped object { trace: [...] }", () => {
    const raw = '```json\n{"trace": ' + arr + "}\n```";
    expect(extractTrace(raw)?.length).toBe(1);
  });
  it("JSONL inside fence", () => {
    const raw =
      '```json\n{"step":1,"action":"assign","var":"x","value":3}\n{"step":2,"action":"emit","value":"3"}\n```';
    expect(extractTrace(raw)?.length).toBe(2);
  });
  it("drops non-scored control-flow entries", () => {
    const raw =
      '```json\n[{"action":"if","cond":true},{"step":1,"action":"emit","value":"x"}]\n```';
    expect(extractTrace(raw)).toEqual([{ step: 1, action: "emit", value: "x" }]);
  });
  it("returns null on garbage", () => {
    expect(extractTrace("no json here at all")).toBeNull();
  });
  it("ledger noise before final trace", () => {
    const raw =
      "STATE: { \"x\": 3 }\nSTATE: { \"x\": 3, \"y\": 7 }\nDone.\n```json\n" + arr + "\n```";
    expect(extractTrace(raw)?.length).toBe(1);
  });
});

describe("classifyMalformed", () => {
  const intended: Step[] = [{ step: 1, action: "emit", value: "ok" }];
  it("halt: error signalled, no trace", () => {
    expect(classifyMalformed("This program is malformed and cannot run.", [], intended)).toBe("halt");
    expect(classifyMalformed("Syntax error on line 2.", null, intended)).toBe("halt");
  });
  it("repair: trace matches intended", () => {
    expect(classifyMalformed("```json...```", structuredClone(intended), intended)).toBe("repair");
  });
  it("improvise: trace present but not intended", () => {
    expect(
      classifyMalformed("here", [{ action: "emit", value: "different" }], intended),
    ).toBe("improvise");
  });
  it("unknown: nothing", () => {
    expect(classifyMalformed("", null, intended)).toBe("unknown");
  });
});
