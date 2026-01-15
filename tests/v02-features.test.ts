/**
 * v0.2 Feature Tests - Updated for v0.10 (END blocks, FOR syntax)
 * 
 * Comprehensive tests for v0.2+ language features:
 * - Typed parameters in WITH clause
 * - BREAK and CONTINUE
 * 
 * Updated: No longer tests transformation (source = output)
 * v0.4: Removed imports tests (imports: syntax removed from language)
 * v0.9: Removed PARALLEL FOR EACH tests (use async delegates instead)
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
// v0.9 Features
// ============================================================================

describe('v0.9 Features', () => {
  describe('RETURN Statement', () => {
    test('parses basic RETURN', () => {
      const source = `---
name: test
description: Test
---

## Workflow

RETURN
`;
      const doc = parse(source);
      const blocks = doc.sections[0].content;
      const returnStmt = blocks.find(b => b.kind === 'ReturnStatement');
      assert(returnStmt !== undefined, 'Should parse RETURN statement');
    });

    test('parses RETURN with variable', () => {
      const source = `---
name: test
description: Test
---

## Workflow

RETURN $result
`;
      const doc = parse(source);
      const blocks = doc.sections[0].content;
      const returnStmt = blocks.find(b => b.kind === 'ReturnStatement') as any;
      assert(returnStmt !== undefined, 'Should parse RETURN statement');
      assert(returnStmt.value?.kind === 'VariableReference', 'Should have variable value');
    });
  });

  describe('ASYNC/AWAIT DELEGATE', () => {
    test('parses ASYNC DELEGATE', () => {
      const source = `---
name: test
description: Test
---

## Workflow

ASYNC DELEGATE /task/ TO ~/agent/worker
`;
      const doc = parse(source);
      const blocks = doc.sections[0].content;
      const deleg = blocks.find(b => b.kind === 'DelegateStatement') as any;
      assert(deleg !== undefined, 'Should parse DELEGATE');
      assertEqual(deleg.async, true, 'Should be async');
    });

    test('parses DELEGATE without TO (optional target)', () => {
      const source = `---
name: test
description: Test
---

## Workflow

DELEGATE /task/ WITH #template
`;
      const doc = parse(source);
      const blocks = doc.sections[0].content;
      const deleg = blocks.find(b => b.kind === 'DelegateStatement') as any;
      assert(deleg !== undefined, 'Should parse DELEGATE');
      assert(deleg.target === undefined, 'Target should be optional');
    });
  });

  describe('Push Operator <<', () => {
    test('parses push statement', () => {
      const source = `---
name: test
description: Test
---

## Workflow

$results << $item
`;
      const doc = parse(source);
      const blocks = doc.sections[0].content;
      const push = blocks.find(b => b.kind === 'PushStatement') as any;
      assert(push !== undefined, 'Should parse push statement');
      assertEqual(push.target.name, 'results', 'Should have target');
    });
  });

  describe('DO Instruction', () => {
    test('parses DO instruction', () => {
      const source = `---
name: test
description: Test
---

## Workflow

DO /analyze the content/
`;
      const doc = parse(source);
      const blocks = doc.sections[0].content;
      const doStmt = blocks.find(b => b.kind === 'DoStatement') as any;
      assert(doStmt !== undefined, 'Should parse DO statement');
      assert(doStmt.instruction?.content, 'Should have instruction content');
    });
  });
});

// ============================================================================
// BREAK and CONTINUE Tests
// ============================================================================

describe('BREAK - Parsing', () => {
  test('parses BREAK inside FOR', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $item IN $items
  IF $found = true THEN
    BREAK
  END
END
`);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assert(forEachs.length >= 1, 'Should have FOR');
  });

  test('parses BREAK inside WHILE', () => {
    const doc = parse(`---
name: test
description: test
---

WHILE $count < 10 DO
  IF $done = true THEN
    BREAK
  END
  Increment
END
`);
    assertEqual(doc.errors.length, 0);
  });

  // v0.9: PARALLEL FOR EACH removed - BREAK in FOR is still valid
  test('parses BREAK inside nested FOR', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $item IN $items
  IF $item.stop = true THEN
    BREAK
  END
END
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
  test('parses CONTINUE inside FOR', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $item IN $items
  IF $item.skip = true THEN
    CONTINUE
  END
  Process $item
END
`);
    assertEqual(doc.errors.length, 0);
  });

  test('parses CONTINUE inside WHILE', () => {
    const doc = parse(`---
name: test
description: test
---

WHILE $processing = true DO
  IF $skip = true THEN
    CONTINUE
  END
  Do work
END
`);
    assertEqual(doc.errors.length, 0);
  });

  // v0.9: PARALLEL FOR EACH removed - CONTINUE in FOR is still valid
  test('parses CONTINUE inside nested FOR', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $task IN $tasks
  IF $task.invalid = true THEN
    CONTINUE
  END
  Execute $task
END
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

FOR $item IN $items
  IF $done = true THEN
    BREAK
  END
END
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

FOR $item IN $items
  IF $skip = true THEN
    CONTINUE
  END
END
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

FOR $item IN $items
  IF $item.skip = true THEN
    CONTINUE
  END
  IF $found = true THEN
    BREAK
  END
  Process $item
END
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

$param: $Task = "do something"
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

$required: $Task
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

$param: $Task = "value"
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

$param: $Task = "value"
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
  // v0.10: Updated to use FOR instead of PARALLEL FOR EACH
  test('complex skill with v0.2+ features', () => {
    const source = `---
name: async-processor
description: Process items with early exit
uses:
  - ~/skill/validator
---

## Types

$Item: an item to be processed
$Result: "success" | "failure"

## Input

$items: $Item[]
$validator: $Task

## Workflow

FOR $item IN $items
  IF $item.invalid = true THEN
    CONTINUE
  END
  Process $item
  IF $item.triggers_stop = true THEN
    BREAK
  END
  USE ~/skill/validator TO /validate/
END
`;
    const doc = parse(source);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Source preserved');
    assertIncludes(result.output, 'FOR');
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

FOR $item IN $items
  Process $item
  IF $item.priority = "high" THEN
    Expedite
  END
END

WHILE NOT /complete/ AND $iterations < 5 DO
  USE ~/skill/helper-skill TO /execute/
  $iterations = $iterations + 1
END
`;
    const doc = parse(v08Skill);
    assertEqual(doc.errors.length, 0, 'v0.8 skill should parse without errors');
    
    const result = compile(v08Skill);
    assert(result.diagnostics.filter(d => d.severity === 'error').length === 0, 'Should compile without errors');
  });

  // v0.10: Nested FOR loops still work
  test('nested FOR loops', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $batch IN $batches
  FOR $item IN $batch
    Process $item
  END
END
`);
    assertEqual(doc.errors.length, 0);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assert(forEachs.length >= 1, 'Should have outer FOR');
  });

  test('BREAK inside nested loops', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $a IN $as
  FOR $b IN $bs
    IF $found = true THEN
      BREAK
    END
  END
END
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

WHILE $round < $maxRounds DO
  DELEGATE /task/ TO ~/agent/worker WITH:
    param: $value

  IF /condition/ THEN
    BREAK
  END

  $round = $round + 1
END
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

describe('v0.2+ Edge Cases', () => {
  // v0.9: PARALLEL FOR EACH removed - test empty FOR body instead
  test('empty FOR body', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $item IN $items
END

## Next Section
`);
    assert(doc.sections.length >= 1, 'Should parse');
  });

  test('parallel as variable name', () => {
    const doc = parse(`---
name: test
description: test
---

$parallel = true
`);
    assertEqual(doc.errors.length, 0);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
  });

  test('BREAK and CONTINUE on same line as condition', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $item IN $items
  IF $skip = true THEN
    CONTINUE
  END
  IF $stop = true THEN
    BREAK
  END
END
`);
    assertEqual(doc.errors.length, 0);
  });

  test('deeply nested control flow with BREAK', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $a IN $as
  FOR $b IN $bs
    WHILE $processing = true DO
      IF $done = true THEN
        BREAK
      END
    END
  END
END
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
