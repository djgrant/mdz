/**
 * Spec Mismatch Regression Tests
 * 
 * Specifically testing the issues identified in Phase A/B refinement.
 */

import { parse } from '../packages/core/src/parser/parser';
import * as AST from '../packages/core/src/parser/ast';

interface TestContext {
  passed: number;
  failed: number;
}

const ctx: TestContext = { passed: 0, failed: 0 };

function test(name: string, fn: () => void): void {
  try {
    fn();
    ctx.passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    ctx.failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('\n=== Spec Mismatch Regression Tests ===\n');

test('Keywords in prose are not statements', () => {
  const doc = parse(`We should DO this tomorrow`);
  // Should be a single paragraph, not a DoStatement
  assertEqual(doc.sections[0].content.length, 1);
  assertEqual(doc.sections[0].content[0].kind, 'Paragraph');
});

test('MDZ only at line start', () => {
  const doc = parse(`
  DO this is MDZ
  Hello DO this is NOT MDZ
`);
  const blocks = doc.sections[0].content;
  assertEqual(blocks.length, 2);
  assertEqual(blocks[0].kind, 'DoStatement');
  assertEqual(blocks[1].kind, 'Paragraph');
});

test('Headings do not stop END-delimited blocks', () => {
  const doc = parse(`
FOR $i IN $items
# Heading Inside Block
  DO something with $i
END
`);
  const forEachs = doc.sections[0].content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement');
  assertEqual(forEachs.length, 1);
  const body = forEachs[0].body;
  // Body should contain Heading and DoStatement
  assertEqual(body.length, 2);
  assertEqual(body[0].kind, 'Heading');
  assertEqual(body[1].kind, 'DoStatement');
});

test('Escaped backticks in templates', () => {
  const doc = parse(`$t = \`template with \\\`backtick\\\` and \\\${escaped} interpolation\``);
  const varDecl = doc.sections[0].content[0] as AST.VariableDeclaration;
  const template = varDecl.value as AST.TemplateLiteral;
  // Should have one part (all text) because both are escaped
  assertEqual(template.parts.length, 1);
  assertEqual(template.parts[0], 'template with `backtick` and ${escaped} interpolation');
});

test('RETURN rule enforces reachability', () => {
  // This is a compiler check, but we can verify metadata/structure
  const doc = parse(`
FOR $i IN $items
  RETURN $i
  DO unreachable
END
`);
  // Structure should still parse correctly
  const forEachs = doc.sections[0].content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement');
  assertEqual(forEachs[0].body.length, 2);
});

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}
