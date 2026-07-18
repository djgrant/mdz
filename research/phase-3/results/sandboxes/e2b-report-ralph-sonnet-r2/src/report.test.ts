// Test suite for the report module. Run with: npx tsx --test <this file>
import { test } from "node:test";
import assert from "node:assert/strict";

import { formatReport, type ReportInput } from "./report.ts";

const SAMPLE: ReportInput = {
  title: "Sprint 4",
  tasks: [
    { title: "Write the parser", done: true, hours: 6 },
    { title: "Fix the flaky test", done: false, hours: 2 },
    { title: "Ship the release", done: true, hours: 3 },
  ],
};

test("formats a full report", () => {
  assert.equal(
    formatReport(SAMPLE),
    [
      "Sprint 4",
      "========",
      "- [x] Write the parser (6h)",
      "- [ ] Fix the flaky test (2h)",
      "- [x] Ship the release (3h)",
      "2/3 done, 11h total",
    ].join("\n"),
  );
});

test("underlines the title to its exact length", () => {
  const out = formatReport({ title: "Ops", tasks: [] });
  assert.equal(out.split("\n")[1], "===");
});

test("marks done tasks with [x] and open tasks with [ ]", () => {
  const lines = formatReport(SAMPLE).split("\n");
  assert.equal(lines[2].startsWith("- [x]"), true);
  assert.equal(lines[3].startsWith("- [ ]"), true);
});

test("totals hours and done counts in the footer", () => {
  const lines = formatReport(SAMPLE).split("\n");
  assert.equal(lines[lines.length - 1], "2/3 done, 11h total");
});

test("handles an empty task list", () => {
  assert.equal(
    formatReport({ title: "Empty", tasks: [] }),
    ["Empty", "=====", "0/0 done, 0h total"].join("\n"),
  );
});

test("honours a custom bullet and separator", () => {
  assert.equal(
    formatReport(SAMPLE, { bullet: "*", separator: "-" }),
    [
      "Sprint 4",
      "--------",
      "* [x] Write the parser (6h)",
      "* [ ] Fix the flaky test (2h)",
      "* [x] Ship the release (3h)",
      "2/3 done, 11h total",
    ].join("\n"),
  );
});

test("renders the summary section when requested", () => {
  assert.equal(
    formatReport(SAMPLE, { sections: ["header", "summary", "tasks", "footer"] }),
    [
      "Sprint 4",
      "========",
      "Done: 2",
      "Open: 1",
      "Hours: 11h",
      "- [x] Write the parser (6h)",
      "- [ ] Fix the flaky test (2h)",
      "- [x] Ship the release (3h)",
      "2/3 done, 11h total",
    ].join("\n"),
  );
});

test("renders sections in the requested order", () => {
  assert.equal(
    formatReport(SAMPLE, { sections: ["footer", "header"] }),
    ["2/3 done, 11h total", "Sprint 4", "========"].join("\n"),
  );
});

test("rejects an unknown section", () => {
  assert.throws(
    () => formatReport(SAMPLE, { sections: ["appendix"] }),
    /no renderer for section: appendix/,
  );
});
