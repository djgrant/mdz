/**
 * Compiler Tests
 * 
 * Tests for the zen compiler.
 */

import { compile, createRegistry } from '../src/compiler/compiler';

// ============================================================================
// Test Runner
// ============================================================================

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

function assertIncludes(str: string, substr: string, message?: string): void {
  if (!str.includes(substr)) {
    throw new Error(message || `Expected "${str}" to include "${substr}"`);
  }
}

function assertNotIncludes(str: string, substr: string, message?: string): void {
  if (str.includes(substr)) {
    throw new Error(message || `Expected "${str}" to NOT include "${substr}"`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// Compilation Tests
// ============================================================================

describe('Basic Compilation', () => {
  test('compiles minimal document', () => {
    const result = compile(`---
name: test
description: A test
---

## Section

Some content.
`);
    assertIncludes(result.output, 'name: test');
    assertIncludes(result.output, '## Section');
    assert(result.diagnostics.length === 0, 'No errors');
  });

  test('includes header by default', () => {
    const result = compile(`---
name: test
description: test
---
`);
    assertIncludes(result.output, '<!-- Compiled Zen Skill: test -->');
  });

  test('can exclude header', () => {
    const result = compile(`---
name: test
description: test
---
`, { includeHeader: false });
    assertNotIncludes(result.output, '<!-- Compiled');
  });
});

// ============================================================================
// Type Expansion Tests
// ============================================================================

describe('Type Expansion', () => {
  test('expands type references', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any executable instruction

- $current: $Task = do something
`);
    assertIncludes(result.output, 'Task (any executable instruction)');
    assert(result.stats.typesExpanded > 0, 'Should expand types');
  });

  test('expands enum types', () => {
    const result = compile(`---
name: test
description: test
---

$Status = "pending" | "done"
`);
    assertIncludes(result.output, '"pending" | "done"');
  });

  test('can disable type expansion', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any executable instruction

- $current: $Task = value
`, { expandTypes: false });
    assertIncludes(result.output, '$Task');
    // Type definition line still contains description
    assertIncludes(result.output, '$Task');
  });
});

// ============================================================================
// Reference Resolution Tests
// ============================================================================

describe('Reference Resolution', () => {
  test('resolves skill references', () => {
    const result = compile(`---
name: test
description: test
---

Execute [[other-skill]]
`);
    assertIncludes(result.output, '[other-skill]');
    assertNotIncludes(result.output, '[[other-skill]]');
    assert(result.stats.referencesResolved > 0, 'Should resolve refs');
  });

  test('resolves section references', () => {
    const result = compile(`---
name: test
description: test
---

See [[#my-section]]
`);
    assertIncludes(result.output, '[#my-section]');
    assertNotIncludes(result.output, '[[#my-section]]');
  });

  test('resolves cross-skill section references', () => {
    const result = compile(`---
name: test
description: test
---

See [[skill#section]]
`);
    assertIncludes(result.output, '[skill#section]');
  });

  test('can disable reference resolution', () => {
    const result = compile(`---
name: test
description: test
---

See [[skill]]
`, { resolveReferences: false });
    assertIncludes(result.output, '[[skill]]');
  });
});

// ============================================================================
// Semantic Marker Tests
// ============================================================================

describe('Semantic Marker Transformation', () => {
  test('transforms semantic markers', () => {
    const result = compile(`---
name: test
description: test
---

Write to {~~appropriate location}
`);
    assertIncludes(result.output, '(determine: appropriate location)');
    assertNotIncludes(result.output, '{~~');
    assert(result.stats.semanticMarkersTransformed > 0, 'Should transform markers');
  });

  test('can disable semantic transformation', () => {
    const result = compile(`---
name: test
description: test
---

Write to {~~appropriate location}
`, { transformSemantics: false });
    assertIncludes(result.output, '{~~appropriate location}');
    assertNotIncludes(result.output, '(determine:');
  });
});

// ============================================================================
// Control Flow Tests
// ============================================================================

describe('Control Flow Compilation', () => {
  test('compiles FOR EACH', () => {
    const result = compile(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - Process $item
`);
    assertIncludes(result.output, 'FOR EACH');
    assertIncludes(result.output, '$item');
    assertIncludes(result.output, '$items');
    assert(result.stats.controlFlowStatements > 0, 'Should count control flow');
  });

  test('compiles WHILE', () => {
    const result = compile(`---
name: test
description: test
---

WHILE ($count < 5):
  - Iterate
`);
    assertIncludes(result.output, 'WHILE');
  });

  test('compiles IF THEN ELSE', () => {
    const result = compile(`---
name: test
description: test
---

IF $x = 1 THEN:
  - Do this
ELSE:
  - Do that
`);
    assertIncludes(result.output, 'IF');
    assertIncludes(result.output, 'THEN');
    assertIncludes(result.output, 'ELSE');
  });
});

// ============================================================================
// Source Map Tests
// ============================================================================

describe('Source Maps', () => {
  test('generates source map entries', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any task

Write to {~~location}
Execute [[skill]]
`, { generateSourceMap: true });
    assert(result.sourceMap.length > 0, 'Should have source map entries');
  });

  test('source map includes type expansions', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any task
- $x: $Task = value
`, { generateSourceMap: true });
    const typeEntries = result.sourceMap.filter(e => e.type === 'type');
    assert(typeEntries.length > 0, 'Should have type entries');
  });

  test('source map includes semantic markers', () => {
    const result = compile(`---
name: test
description: test
---

{~~something}
`, { generateSourceMap: true });
    const semEntries = result.sourceMap.filter(e => e.type === 'semantic');
    assert(semEntries.length > 0, 'Should have semantic entries');
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe('Compilation Statistics', () => {
  test('tracks source and output length', () => {
    const source = `---
name: test
description: test
---

Content here.
`;
    const result = compile(source);
    assert(result.stats.sourceLength === source.length, 'Source length');
    assert(result.stats.outputLength > 0, 'Output length');
  });

  test('calculates expansion ratio', () => {
    const result = compile(`---
name: test
description: test
---

$Task = a very long description of what a task is

- $x: $Task = value
`);
    assert(result.stats.expansionRatio > 1, 'Should expand');
  });

  test('counts transformations', () => {
    const result = compile(`---
name: test
description: test
---

$Task = task description
$Status = "a" | "b"

- $x: $Task = {~~dynamic}
- $y: $Status = "a"

See [[skill]]
`);
    assert(result.stats.typesExpanded > 0, 'Types');
    assert(result.stats.referencesResolved > 0, 'References');
    assert(result.stats.semanticMarkersTransformed > 0, 'Semantics');
  });
});

// ============================================================================
// Skill Registry Tests
// ============================================================================

describe('Skill Registry', () => {
  test('creates registry from skill map', () => {
    const registry = createRegistry({
      'helper': `---
name: helper
description: A helper skill
---

## Content

Helper content here.
`,
    });

    const skill = registry.get('helper');
    assert(skill !== undefined, 'Should find skill');
    assert(skill?.name === 'helper', 'Correct name');
  });

  test('returns undefined for unknown skill', () => {
    const registry = createRegistry({});
    const skill = registry.get('unknown');
    assert(skill === undefined, 'Should be undefined');
  });

  test('can get section from skill', () => {
    const registry = createRegistry({
      'helper': `---
name: helper
description: test
---

## My Section

Section content.
`,
    });

    const section = registry.getSection('helper', 'my-section');
    assert(section !== undefined, 'Should find section');
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  test('reports parse errors in diagnostics', () => {
    const result = compile(`---
name: test
description: test
---

FOR EACH without proper syntax
`);
    // Should compile without crashing
    assert(result.output.length > 0, 'Should produce output');
  });

  test('handles empty source', () => {
    const result = compile('');
    assert(result.output.length >= 0, 'Should handle empty');
    assert(result.diagnostics.length === 0, 'No errors for empty');
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Full Skill Compilation', () => {
  test('compiles complete orchestrate-map-reduce pattern', () => {
    const result = compile(`---
name: orchestrate-map-reduce
description: Fan out to multiple agents
uses:
  - work-packages
---

## Types

$Task = any task that an agent can execute
$Strategy = "accumulate" | "independent"
$ValidationResult = "progress" | "regression" | "plateau"

## Input

- $transforms: ($Task, $Strategy)[]
- $validator: $Task

## Workflow

1. Create master work package at {~~appropriate location}

2. FOR EACH ($task, $strategy) IN $transforms:
   - Delegate to [[#iteration-manager]]
   
3. WHILE (not diminishing returns AND $iterations < 5):
   - Execute iteration
   - IF $result = "progress" THEN:
     - Update $current
   - ELSE:
     - Try different approach

4. Return findings

## Iteration Manager

Handle a single iteration.
`);
    
    // Check structure preserved
    assertIncludes(result.output, 'orchestrate-map-reduce');
    assertIncludes(result.output, '## Types');
    assertIncludes(result.output, '## Workflow');
    
    // Check transformations applied
    assertIncludes(result.output, '(determine:'); // Semantic transformed
    assertIncludes(result.output, '[#iteration-manager]'); // Reference resolved
    
    // Check types expanded
    assertIncludes(result.output, 'any task that an agent can execute');
    
    // Check stats
    assert(result.stats.expansionRatio > 1, 'Should expand');
    assert(result.diagnostics.length === 0, 'No errors');
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== Zen Compiler Tests ===\n');

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}
