import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { glob } from "glob";
import { generate } from "peggy";
import { describe, it, expect } from "vitest";

const grammarPath = join(import.meta.dirname, "grammar.peg");
const grammar = await readFile(grammarPath, "utf-8");
const testFiles = await glob("tests/*.md", { cwd: import.meta.dirname });

const parser = generate(grammar);
describe("Grammar Parser Tests", () => {
  for (const mdzFile of testFiles) {
    const testName = basename(mdzFile, ".md");

    it(`should parse ${testName} correctly`, async () => {
      const mdzPath = join(import.meta.dirname, mdzFile);
      const jsonPath = mdzPath.replace(/\.mdz$/, ".json");

      const input = await readFile(mdzPath, "utf-8");
      const expected = JSON.parse(await readFile(jsonPath, "utf-8"));

      const result = parser.parse(input);

      try {
        expect(result).toEqual(expected);
      } catch (error) {
        // write the acutal result to disk for review
        const actualPath = join(dirname(jsonPath), `${testName}.actual.json`);
        await writeFile(actualPath, JSON.stringify(result, null, 2));
        throw error;
      }
    });
  }
});
