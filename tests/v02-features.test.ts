/**
 * v0.2 Feature Tests - Updated for v0.4 (imports removed)
 * 
 * Comprehensive tests for v0.2 language features:
 * - PARALLEL FOR EACH
 * - Typed parameters in WITH clause
 * - BREAK and CONTINUE
 * 
 * Updated: No longer tests transformation (source = output)
 * v0.4: Removed imports tests (imports: syntax removed from language)
 */

import { parse } from '../packages/core/src/parser/parser';
import { compile } from '../packages/core/src/compiler/compiler';
import * as AST from '../packages/core/src/parser/ast';

// ============================================================================
// Test Runner
// ============================================================================

interface TestContext {
  passed: number;
  failed: number;
  errors: string[];
}

const ctx: TestContext = { passed: 0, failed: 0, errors: [] };

function test(name: string, fn: () => void): void {
  try {
    fn();
    ctx.passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    ctx.failed++;
    ctx.errors.push(`${name}: ${err}`);
    console.log(`  ✗ ${name}`);
    console.log(`    ${err}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(str: string, substr: string, message?: string): void {
  if (!str.includes(substr)) {
    throw new Error(message || `Expected "${str.slice(0, 100)}..." to include "${substr}"`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// PARALLEL FOR EACH Tests
// ============================================================================

describe('PARALLEL FOR EACH - Parsing', () => {
  test('parses basic PARALLEL FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH $item IN $items:
  - Process $item
`);
    const parallels = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ParallelForEachStatement => b.kind === 'ParallelForEachStatement')
    );
    assertEqual(parallels.length, 1);
    assert(parallels[0].pattern.kind === 'SimplePattern', 'Should have simple pattern');
    if (parallels[0].pattern.kind === 'SimplePattern') {
      assertEqual(parallels[0].pattern.name, 'item');
    }
  });

  test('parses PARALLEL FOR EACH with destructuring', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH ($task, $priority) IN $jobs:
  - Execute $task with $priority
`);
    const parallels = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ParallelForEachStatement => b.kind === 'ParallelForEachStatement')
    );
    assertEqual(parallels.length, 1);
    assert(parallels[0].pattern.kind === 'DestructuringPattern', 'Should have destructuring');
    if (parallels[0].pattern.kind === 'DestructuringPattern') {
      assertEqual(parallels[0].pattern.names, ['task', 'priority']);
    }
  });

  test('parses PARALLEL FOR EACH with complex collection', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH $agent IN $agents.available:
  - Spawn $agent
`);
    const parallels = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ParallelForEachStatement => b.kind === 'ParallelForEachStatement')
    );
    assertEqual(parallels.length, 1);
    assert(parallels[0].collection.kind === 'MemberAccess', 'Should have member access');
  });

  test('parses nested control flow inside PARALLEL FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH $item IN $items:
  - IF $item.ready THEN:
    - Process $item
`);
    const parallels = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ParallelForEachStatement => b.kind === 'ParallelForEachStatement')
    );
    assertEqual(parallels.length, 1);
    assert(parallels[0].body.length > 0, 'Should have body');
  });

  test('parses multiple PARALLEL FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH $a IN $as:
  - Process $a

PARALLEL FOR EACH $b IN $bs:
  - Process $b
`);
    const parallels = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ParallelForEachStatement => b.kind === 'ParallelForEachStatement')
    );
    assertEqual(parallels.length, 2);
  });
});

describe('PARALLEL FOR EACH - Compilation (Validator-First)', () => {
  test('preserves PARALLEL FOR EACH in output', () => {
    const source = `---
name: test
description: test
---

PARALLEL FOR EACH $item IN $items:
  - Process $item
`;
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Source should be preserved');
    assertIncludes(result.output, 'PARALLEL FOR EACH');
    assertIncludes(result.output, '$item');
    assertIncludes(result.output, '$items');
  });

  test('tracks PARALLEL FOR EACH in source map', () => {
    const result = compile(`---
name: test
description: test
---

PARALLEL FOR EACH $task IN $tasks:
  - Execute $task
`);
    const cfEntries = result.sourceMap.filter(e => e.type === 'control-flow');
    assert(cfEntries.length > 0, 'Should track in source map');
  });

  test('extracts multiple control flow constructs', () => {
    const result = compile(`---
name: test
description: test
---

PARALLEL FOR EACH $a IN $as:
  - Process $a

FOR EACH $b IN $bs:
  - Process $b
`);
    const cfEntries = result.sourceMap.filter(e => e.type === 'control-flow');
    assert(cfEntries.length >= 2, 'Should track both loops');
  });
});

// ============================================================================
// BREAK and CONTINUE Tests
// ============================================================================

describe('BREAK - Parsing', () => {
  test('parses BREAK inside FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $found THEN:
    - BREAK
`);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assert(forEachs.length >= 1, 'Should have FOR EACH');
  });

  test('parses BREAK inside WHILE', () => {
    const doc = parse(`---
name: test
description: test
---

WHILE $count < 10 DO:
  - IF $done THEN:
    - BREAK
  - Increment
`);
    assertEqual(doc.errors.length, 0);
  });

  test('parses BREAK inside PARALLEL FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH $item IN $items:
  - IF $item.stop THEN:
    - BREAK
`);
    assertEqual(doc.errors.length, 0);
  });

  test('errors on BREAK outside loop', () => {
    const doc = parse(`---
name: test
description: test
---

BREAK
`);
    const breakErrors = doc.errors.filter(e => e.code === 'E016');
    assert(breakErrors.length > 0, 'Should error on BREAK outside loop');
  });
});

describe('CONTINUE - Parsing', () => {
  test('parses CONTINUE inside FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $item.skip THEN:
    - CONTINUE
  - Process $item
`);
    assertEqual(doc.errors.length, 0);
  });

  test('parses CONTINUE inside WHILE', () => {
    const doc = parse(`---
name: test
description: test
---

WHILE $processing DO:
  - IF $skip THEN:
    - CONTINUE
  - Do work
`);
    assertEqual(doc.errors.length, 0);
  });

  test('parses CONTINUE inside PARALLEL FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH $task IN $tasks:
  - IF $task.invalid THEN:
    - CONTINUE
  - Execute $task
`);
    assertEqual(doc.errors.length, 0);
  });

  test('errors on CONTINUE outside loop', () => {
    const doc = parse(`---
name: test
description: test
---

CONTINUE
`);
    const continueErrors = doc.errors.filter(e => e.code === 'E017');
    assert(continueErrors.length > 0, 'Should error on CONTINUE outside loop');
  });
});

describe('BREAK and CONTINUE - Compilation (Validator-First)', () => {
  test('preserves BREAK statement', () => {
    const source = `---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $done THEN:
    - BREAK
`;
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Source preserved');
    assertIncludes(result.output, 'BREAK');
  });

  test('preserves CONTINUE statement', () => {
    const source = `---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $skip THEN:
    - CONTINUE
`;
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Source preserved');
    assertIncludes(result.output, 'CONTINUE');
  });

  test('preserves both BREAK and CONTINUE', () => {
    const result = compile(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $item.skip THEN:
    - CONTINUE
  - IF $found THEN:
    - BREAK
  - Process $item
`);
    assertIncludes(result.output, 'BREAK');
    assertIncludes(result.output, 'CONTINUE');
  });
});



// ============================================================================
// Typed Parameters in WITH Clause Tests
// ============================================================================

describe('Typed Parameters - Parsing', () => {
  test('parses typed parameter with value', () => {
    const doc = parse(`---
name: test
description: test
---

- $param: $Task = "do something"
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'param');
    assert(vars[0].typeAnnotation?.kind === 'TypeReference', 'Type annotation should be TypeReference');
    assertEqual((vars[0].typeAnnotation as AST.TypeReference).name, 'Task');
    assert(vars[0].value !== null, 'Should have value');
  });

  test('parses required parameter (no default)', () => {
    const doc = parse(`---
name: test
description: test
---

- $required: $Task
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'required');
    assert(vars[0].typeAnnotation?.kind === 'TypeReference', 'Type annotation should be TypeReference');
    assertEqual((vars[0].typeAnnotation as AST.TypeReference).name, 'Task');
    assertEqual(vars[0].value, null);
  });
});

describe('Typed Parameters - Compilation (Validator-First)', () => {
  test('preserves typed parameters in output', () => {
    const source = `---
name: test
description: test
---

$Task: any task

- $param: $Task = "value"
`;
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Source preserved');
  });

  test('extracts typed parameters into metadata', () => {
    const result = compile(`---
name: test
description: test
---

$Task: any task

- $param: $Task = "value"
`);
    const paramVar = result.metadata.variables.find(v => v.name === 'param');
    assert(paramVar !== undefined, 'Should find param');
    assertEqual(paramVar?.type, 'Task');
    assertEqual(paramVar?.hasDefault, true);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('v0.2 Integration', () => {
  test('complex skill with all v0.2 features', () => {
    const source = `---
name: parallel-processor
description: Process items in parallel with early exit
uses:
  - ~validator
---

## Types

$Item: an item to be processed
$Result: "success" | "failure"

## Input

- $items: $Item[]
- $validator: $Task

## Workflow

PARALLEL FOR EACH $item IN $items:
  - IF $item.invalid THEN:
    - CONTINUE
  - Process $item
  - IF $item.triggers_stop THEN:
    - BREAK
  - Validate with ~/skill/validator
`;
    const doc = parse(source);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Source preserved');
    assertIncludes(result.output, 'PARALLEL FOR EACH');
    assertIncludes(result.output, 'CONTINUE');
    assertIncludes(result.output, 'BREAK');
  });

  test('v0.8 style skill with links', () => {
    // v0.8: Use ~/skill/name syntax instead of (~skill) and uses:
    const v08Skill = `---
name: modern-skill
description: A v0.8 compatible skill
---

## Types

$Task: any task
$Strategy: "fast" | "thorough"

## Workflow

FOR EACH $item IN $items:
  - Process $item
  - IF $item.priority = "high" THEN:
    - Expedite

WHILE NOT complete AND $iterations < 5 DO:
  - Execute ~/skill/helper-skill
  - Update $iterations
`;
    const doc = parse(v08Skill);
    assertEqual(doc.errors.length, 0, 'v0.8 skill should parse without errors');
    
    const result = compile(v08Skill);
    assert(result.diagnostics.filter(d => d.severity === 'error').length === 0, 'Should compile without errors');
  });

  test('nested PARALLEL FOR EACH inside regular FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $batch IN $batches:
  - PARALLEL FOR EACH $item IN $batch:
    - Process $item
`);
    assertEqual(doc.errors.length, 0);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assert(forEachs.length >= 1, 'Should have outer FOR EACH');
  });

  test('BREAK inside nested loops', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $a IN $as:
  - FOR EACH $b IN $bs:
    - IF $found THEN:
      - BREAK
`);
    assertEqual(doc.errors.length, 0, 'BREAK in nested loop should be valid');
  });

  test('BREAK inside WHILE > IF with delegation (issue: loop depth tracking)', () => {
    // This tests the fix for BREAK inside IF blocks nested in WHILE loops
    // when a Delegation with WITH clause precedes the IF
    // v0.8: Use #task anchor syntax instead of (#task)
    const doc = parse(`---
name: test
description: test
---

WHILE $round < $maxRounds DO:

  Delegate to #task WITH:
    - $param = $value

  IF /condition/ THEN:
    BREAK

  $round = $round + 1
`);
    assertEqual(doc.errors.length, 0, `BREAK should be valid inside WHILE > IF. Errors: ${doc.errors.map(e => e.message)}`);
    
    // Verify the AST structure is correct
    const whiles = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.WhileStatement => b.kind === 'WhileStatement')
    );
    assertEqual(whiles.length, 1, 'Should have one WHILE');
    
    // The IF with BREAK should be inside the WHILE body
    const ifStmts = whiles[0].body.filter((b): b is AST.IfStatement => b.kind === 'IfStatement');
    assert(ifStmts.length >= 1, 'IF should be inside WHILE body');
    
    // Check that BREAK is in the IF body
    const breaks = ifStmts[0].thenBody.filter((b): b is AST.BreakStatement => b.kind === 'BreakStatement');
    assertEqual(breaks.length, 1, 'BREAK should be inside IF body');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('v0.2 Edge Cases', () => {
  test('empty PARALLEL FOR EACH body', () => {
    const doc = parse(`---
name: test
description: test
---

PARALLEL FOR EACH $item IN $items:

## Next Section
`);
    assert(doc.sections.length >= 1, 'Should parse');
  });

  test('PARALLEL keyword as variable name (should work differently)', () => {
    const doc = parse(`---
name: test
description: test
---

- $parallel = true
`);
    assertEqual(doc.errors.length, 0);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    // Note: $parallel is lowercase, so it's a variable, not the keyword
    assertEqual(vars.length, 1);
  });

  test('BREAK and CONTINUE on same line as condition', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $skip THEN:
    - CONTINUE
  - IF $stop THEN:
    - BREAK
`);
    assertEqual(doc.errors.length, 0);
  });

  test('deeply nested control flow with BREAK', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $a IN $as:
  - FOR EACH $b IN $bs:
    - WHILE $processing DO:
      - IF $done THEN:
        - BREAK
`);
    assertEqual(doc.errors.length, 0);
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ v0.2 Feature Tests (Validator-First) ===\n');

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.errors.length > 0) {
  console.log('\nFailed tests:');
  ctx.errors.forEach(e => console.log(`  - ${e}`));
}

if (ctx.failed > 0) {
  process.exit(1);
}
