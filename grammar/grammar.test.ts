import { readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { glob } from "glob";
import { generate } from "peggy";
import { describe, it, expect } from "vitest";
import { normalizePeggyError } from "./diagnostics";

const grammarPath = join(import.meta.dirname, "grammar.peg");
const grammar = await readFile(grammarPath, "utf-8");
const validFiles = (await glob("tests/*.{md,mdz}", { cwd: import.meta.dirname }))
  .filter((file) => !file.includes(".invalid."));
const invalidFiles = await glob("tests/*.invalid.{md,mdz}", {
  cwd: import.meta.dirname
});

const parser = generate(grammar);
describe("Grammar Parser Tests", () => {
  for (const mdzFile of validFiles) {
    const testName = basename(mdzFile, extname(mdzFile));

    it(`should parse ${testName} correctly`, async () => {
      const mdzPath = join(import.meta.dirname, mdzFile);
      const jsonPath = mdzPath.replace(/\.(md|mdz)$/, ".json");

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

  for (const mdzFile of invalidFiles) {
    const testName = basename(mdzFile, extname(mdzFile));

    it(`should reject ${testName} correctly`, async () => {
      const mdzPath = join(import.meta.dirname, mdzFile);
      const jsonPath = mdzPath.replace(/\.(md|mdz)$/, ".json");

      const input = await readFile(mdzPath, "utf-8");
      const expected = JSON.parse(await readFile(jsonPath, "utf-8"));

      try {
        parser.parse(input);
      } catch (error) {
        const actual = normalizePeggyError(error);

        try {
          expect(actual).toMatchObject(expected);
        } catch (compareError) {
          const actualPath = join(dirname(jsonPath), `${testName}.actual.json`);
          await writeFile(actualPath, JSON.stringify(actual, null, 2));
          throw compareError;
        }
        return;
      }

      throw new Error("Expected parse to fail but it succeeded.");
    });
  }
});
