import { describe, it, expect } from "vitest";
import { parseDocument } from "./parser.js";
import {
  extractLinksFromAst,
  locateLinkOccurrences,
  collectAnchors,
  normalizeAnchorValue
} from "./links.js";

describe("links", () => {
  it("extracts link values from AST and locates occurrences", async () => {
    const text = ["USE ~/skill/debug", "SPAWN ~/agent/reporter WITH #note", "## Note"]
      .join("\n")
      .concat("\n");
    const result = await parseDocument(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const links = extractLinksFromAst(result.ast);
    const values = links.map((link) => link.value);
    expect(values).toContain("~/skill/debug");
    expect(values).toContain("~/agent/reporter");
    expect(values).toContain("#note");

    const occurrences = locateLinkOccurrences(text, links);
    const occurrenceValues = occurrences.map((occurrence) => occurrence.value);
    expect(occurrenceValues).toContain("#note");
  });

  it("collects anchors from headings and normalizes anchor values", () => {
    const text = ["# Overview", "## My_Anchor", "## My Anchor"].join("\n");
    const anchors = collectAnchors(text);
    expect(anchors.get("overview")).toBe(1);
    expect(anchors.get("my_anchor")).toBe(1);
    expect(anchors.get("my-anchor")).toBe(1);
    expect(normalizeAnchorValue("#my_anchor")).toBe("my_anchor");
  });
});
