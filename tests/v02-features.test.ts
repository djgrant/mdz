/**
 * v0.2 Feature Tests
 * 
 * Comprehensive tests for new v0.2 language features:
 * - PARALLEL FOR EACH
 * - Extended imports in frontmatter
 * - Typed parameters in WITH clause
 * - BREAK and CONTINUE
 */

import { parse } from '../src/parser/parser';
import { compile } from '../src/compiler/compiler';
import * as AST from '../src/parser/ast';

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

describe('PARALLEL FOR EACH - Compilation', () => {
  test('compiles basic PARALLEL FOR EACH', () => {
    const result = compile(`---
name: test
description: test
---

PARALLEL FOR EACH $item IN $items:
  - Process $item
`);
    assertIncludes(result.output, 'PARALLEL FOR EACH');
    assertIncludes(result.output, '$item');
    assertIncludes(result.output, '$items');
    assert(result.stats.parallelStatements > 0, 'Should count parallel statements');
  });

  test('includes parallel execution comment', () => {
    const result = compile(`---
name: test
description: test
---

PARALLEL FOR EACH $task IN $tasks:
  - Execute $task
`);
    assertIncludes(result.output, 'concurrently');
  });

  test('counts control flow correctly', () => {
    const result = compile(`---
name: test
description: test
---

PARALLEL FOR EACH $a IN $as:
  - Process $a

FOR EACH $b IN $bs:
  - Process $b
`);
    assertEqual(result.stats.controlFlowStatements, 2);
    assertEqual(result.stats.parallelStatements, 1);
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

WHILE ($count < 10):
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

WHILE ($processing):
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

describe('BREAK and CONTINUE - Compilation', () => {
  test('compiles BREAK statement', () => {
    const result = compile(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $done THEN:
    - BREAK
`);
    assertIncludes(result.output, 'BREAK');
    assert(result.stats.breakStatements > 0, 'Should count BREAK');
  });

  test('compiles CONTINUE statement', () => {
    const result = compile(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - IF $skip THEN:
    - CONTINUE
`);
    assertIncludes(result.output, 'CONTINUE');
    assert(result.stats.continueStatements > 0, 'Should count CONTINUE');
  });

  test('compiles both BREAK and CONTINUE', () => {
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
// Extended Imports Tests
// ============================================================================

describe('Extended Imports - Parsing', () => {
  test('parses simple imports array', () => {
    const doc = parse(`---
name: test
description: test
imports:
  - path: "./skills/"
    skills: [simplify, work-packages]
---
`);
    assert(doc.frontmatter !== null, 'Should have frontmatter');
    assert(doc.frontmatter?.imports.length === 1, 'Should have 1 import');
    assertEqual(doc.frontmatter?.imports[0].path, './skills/');
    assertEqual(doc.frontmatter?.imports[0].skills, ['simplify', 'work-packages']);
  });

  test('parses imports with aliases', () => {
    const doc = parse(`---
name: test
description: test
imports:
  - path: "@zen/stdlib"
    alias:
      orchestrate-map-reduce: omr
---
`);
    assert(doc.frontmatter !== null, 'Should have frontmatter');
    assert(doc.frontmatter?.imports.length === 1, 'Should have 1 import');
    assertEqual(doc.frontmatter?.imports[0].path, '@zen/stdlib');
    assert(doc.frontmatter?.imports[0].aliases.get('orchestrate-map-reduce') === 'omr', 'Should have alias');
  });

  test('parses multiple imports', () => {
    const doc = parse(`---
name: test
description: test
imports:
  - path: "./local/"
    skills: [skill-a, skill-b]
  - path: "@zen/core"
    skills: [orchestrate]
---
`);
    assert(doc.frontmatter !== null, 'Should have frontmatter');
    assertEqual(doc.frontmatter?.imports.length, 2);
  });

  test('parses document without imports', () => {
    const doc = parse(`---
name: test
description: test
---
`);
    assert(doc.frontmatter !== null, 'Should have frontmatter');
    assertEqual(doc.frontmatter?.imports.length, 0);
  });
});

describe('Extended Imports - Compilation', () => {
  test('compiles imports in frontmatter', () => {
    const result = compile(`---
name: test
description: test
imports:
  - path: "./skills/"
    skills: [simplify]
---
`);
    assertIncludes(result.output, 'imports:');
    assertIncludes(result.output, './skills/');
    assert(result.stats.importDeclarations === 1, 'Should count imports');
  });

  test('preserves aliases in compiled output', () => {
    const result = compile(`---
name: test
description: test
imports:
  - path: "@zen/stdlib"
    alias:
      orchestrate-map-reduce: omr
---
`);
    assertIncludes(result.output, 'alias:');
    assertIncludes(result.output, 'orchestrate-map-reduce');
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
    assertEqual(vars[0].typeAnnotation?.name, 'Task');
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
    assertEqual(vars[0].typeAnnotation?.name, 'Task');
    assertEqual(vars[0].value, null);
  });
});

describe('Typed Parameters - Compilation', () => {
  test('compiles typed parameter with value', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any task

- $param: $Task = "value"
`);
    assertIncludes(result.output, 'param');
    assertIncludes(result.output, 'Task');
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
imports:
  - path: "./helpers/"
    skills: [validator]
---

## Types

$Item = an item to be processed
$Result = "success" | "failure"

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
  - Validate with [[validator]]
`;
    const doc = parse(source);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    
    const result = compile(source);
    assertIncludes(result.output, 'PARALLEL FOR EACH');
    assertIncludes(result.output, 'CONTINUE');
    assertIncludes(result.output, 'BREAK');
    assertIncludes(result.output, 'imports:');
  });

  test('backward compatibility with v0.1 skill', () => {
    const v01Skill = `---
name: legacy-skill
description: A v0.1 compatible skill
uses:
  - helper-skill
---

## Types

$Task = any task
$Strategy = "fast" | "thorough"

## Workflow

FOR EACH $item IN $items:
  - Process $item
  - IF $item.priority = "high" THEN:
    - Expedite

WHILE (not complete AND $iterations < 5):
  - Execute [[helper-skill]]
  - Update $iterations
`;
    const doc = parse(v01Skill);
    assertEqual(doc.errors.length, 0, 'v0.1 skill should parse without errors');
    
    const result = compile(v01Skill);
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

  test('imports with empty skills array', () => {
    const doc = parse(`---
name: test
description: test
imports:
  - path: "./empty/"
    skills: []
---
`);
    assert(doc.frontmatter?.imports.length === 1, 'Should have import');
    assertEqual(doc.frontmatter?.imports[0].skills.length, 0);
  });

  test('deeply nested control flow with BREAK', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $a IN $as:
  - FOR EACH $b IN $bs:
    - WHILE ($processing):
      - IF $done THEN:
        - BREAK
`);
    assertEqual(doc.errors.length, 0);
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== Zen v0.2 Feature Tests ===\n');

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
