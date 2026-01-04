/**
 * Compiler Tests - v0.3 Validator-First
 * 
 * Tests for the refactored zen compiler that validates rather than transforms.
 */

import { compile, createRegistry, buildFullDependencyGraph } from '../src/compiler/compiler';

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

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(str: string, substr: string, message?: string): void {
  if (!str.includes(substr)) {
    throw new Error(message || `Expected "${str}" to include "${substr}"`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// Core Principle: No Transformation
// ============================================================================

describe('No Transformation (Source = Output)', () => {
  test('output equals source (no header)', () => {
    const source = `---
name: test
description: A test
---

## Section

Some content with $variable and [[skill]] and {~~semantic marker}.
`;
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Output should equal source exactly');
  });

  test('$Type stays as $Type (no expansion)', () => {
    const source = `---
name: test
description: test
---

$Task = any executable instruction

- $current: $Task = do something
`;
    const result = compile(source, { includeHeader: false });
    assertIncludes(result.output, '$Task = any executable instruction');
    assertIncludes(result.output, '$current: $Task');
    assert(!result.output.includes('Task (any executable instruction)'), 
      'Types should NOT be expanded');
  });

  test('{~~marker} stays as {~~marker} (no transformation)', () => {
    const source = `---
name: test
description: test
---

Write to {~~appropriate location}
`;
    const result = compile(source, { includeHeader: false });
    assertIncludes(result.output, '{~~appropriate location}');
    assert(!result.output.includes('(determine:'), 
      'Semantic markers should NOT be transformed');
  });

  test('[[reference]] stays as [[reference]]', () => {
    const source = `---
name: test
description: test
---

Execute [[other-skill]]
`;
    const result = compile(source, { includeHeader: false });
    assertIncludes(result.output, '[[other-skill]]');
    assert(!result.output.includes('[other-skill]') || result.output.includes('[[other-skill]]'),
      'References should NOT be transformed');
  });
});

// ============================================================================
// Metadata Extraction
// ============================================================================

describe('Metadata Extraction', () => {
  test('extracts frontmatter metadata', () => {
    const result = compile(`---
name: test-skill
description: A test skill
uses:
  - helper
  - orchestrate
---

## Content
`);
    assertEqual(result.metadata.name, 'test-skill');
    assertEqual(result.metadata.description, 'A test skill');
    assertEqual(result.metadata.uses, ['helper', 'orchestrate']);
  });

  test('extracts type definitions', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any executable instruction
$Strategy = "fast" | "slow"
`);
    assertEqual(result.metadata.types.length, 2);
    assertEqual(result.metadata.types[0].name, 'Task');
    assertEqual(result.metadata.types[1].name, 'Strategy');
  });

  test('extracts variable declarations', () => {
    const result = compile(`---
name: test
description: test
---

- $count = 0
- $path: $FilePath = "output.md"
`);
    assertEqual(result.metadata.variables.length, 2);
    assertEqual(result.metadata.variables[0].name, 'count');
    assertEqual(result.metadata.variables[1].name, 'path');
    assertEqual(result.metadata.variables[1].type, 'FilePath');
  });

  test('extracts skill references', () => {
    const result = compile(`---
name: test
description: test
uses:
  - orchestrate
---

Execute [[orchestrate]]
See [[helper]]
`);
    const skillRefs = result.metadata.references.filter(r => r.kind === 'skill');
    assertEqual(skillRefs.length, 2);
    assertEqual(skillRefs[0].target, 'orchestrate');
    assertEqual(skillRefs[1].target, 'helper');
  });

  test('extracts section references', () => {
    const result = compile(`---
name: test
description: test
---

## My Section

See [[#my-section]]
See [[other-skill#other-section]]
`);
    const sectionRefs = result.metadata.references.filter(r => r.kind === 'section');
    assertEqual(sectionRefs.length, 2);
    assertEqual(sectionRefs[0].section, 'my-section');
    assertEqual(sectionRefs[1].skill, 'other-skill');
  });

  test('extracts sections with anchors', () => {
    const result = compile(`---
name: test
description: test
---

## First Section

## Second Section

### Nested Section
`);
    assertEqual(result.metadata.sections.length, 3);
    assertEqual(result.metadata.sections[0].anchor, 'first-section');
    assertEqual(result.metadata.sections[1].anchor, 'second-section');
    assertEqual(result.metadata.sections[2].level, 3);
  });
});

// ============================================================================
// Dependency Graph
// ============================================================================

describe('Dependency Graph', () => {
  test('builds graph from uses:', () => {
    const result = compile(`---
name: test
description: test
uses:
  - skill-a
  - skill-b
---
`);
    assert(result.dependencies.nodes.includes('skill-a'), 'Should include skill-a');
    assert(result.dependencies.nodes.includes('skill-b'), 'Should include skill-b');
    
    const usesEdges = result.dependencies.edges.filter(e => e.type === 'uses');
    assertEqual(usesEdges.length, 2);
  });

  test('builds graph from inline references', () => {
    const result = compile(`---
name: test
description: test
---

Execute [[inline-skill]]
`);
    assert(result.dependencies.nodes.includes('inline-skill'), 'Should include inline-skill');
    
    const refEdges = result.dependencies.edges.filter(e => e.type === 'reference');
    assertEqual(refEdges.length, 1);
    assertEqual(refEdges[0].target, 'inline-skill');
  });

  test('deduplicates dependencies', () => {
    const result = compile(`---
name: test
description: test
uses:
  - helper
---

Execute [[helper]]
Execute [[helper]] again
`);
    const helperNodes = result.dependencies.nodes.filter(n => n === 'helper');
    assertEqual(helperNodes.length, 1, 'Should deduplicate nodes');
  });
});

// ============================================================================
// Validation
// ============================================================================

describe('Validation - Types', () => {
  test('warns on undefined type reference', () => {
    const result = compile(`---
name: test
description: test
---

- $x: $UndefinedType = value
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 1);
    assertIncludes(typeWarnings[0].message, 'UndefinedType');
  });

  test('no warning when type is defined', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any task

- $x: $Task = value
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, 'Should not warn when type is defined');
  });
});

describe('Validation - References', () => {
  test('warns on undeclared skill reference', () => {
    const result = compile(`---
name: test
description: test
---

Execute [[undeclared-skill]]
`, { validateReferences: true });
    
    const refWarnings = result.diagnostics.filter(d => d.code === 'W001');
    assertEqual(refWarnings.length, 1);
    assertIncludes(refWarnings[0].message, 'undeclared-skill');
  });

  test('no warning when skill is declared in uses:', () => {
    const result = compile(`---
name: test
description: test
uses:
  - declared-skill
---

Execute [[declared-skill]]
`, { validateReferences: true });
    
    const refWarnings = result.diagnostics.filter(d => d.code === 'W001');
    assertEqual(refWarnings.length, 0);
  });

  test('errors on undefined local section reference', () => {
    const result = compile(`---
name: test
description: test
---

See [[#nonexistent-section]]
`, { validateReferences: true });
    
    const sectionErrors = result.diagnostics.filter(d => d.code === 'E010');
    assertEqual(sectionErrors.length, 1);
    assertIncludes(sectionErrors[0].message, 'nonexistent-section');
  });

  test('no error when local section exists', () => {
    const result = compile(`---
name: test
description: test
---

## My Section

See [[#my-section]]
`, { validateReferences: true });
    
    const sectionErrors = result.diagnostics.filter(d => d.code === 'E010');
    assertEqual(sectionErrors.length, 0);
  });
});

// ============================================================================
// Source Maps
// ============================================================================

describe('Source Maps', () => {
  test('generates source map entries for types', () => {
    const result = compile(`---
name: test
description: test
---

$Task = any task
`, { generateSourceMap: true });
    
    const typeEntries = result.sourceMap.filter(e => e.type === 'type-def');
    assertEqual(typeEntries.length, 1);
    assertEqual(typeEntries[0].name, 'Task');
  });

  test('generates source map entries for variables', () => {
    const result = compile(`---
name: test
description: test
---

- $x = value
- $y = other
`, { generateSourceMap: true });
    
    const varEntries = result.sourceMap.filter(e => e.type === 'variable');
    assertEqual(varEntries.length, 2);
  });

  test('generates source map entries for references', () => {
    const result = compile(`---
name: test
description: test
---

[[skill-ref]]
[[#section-ref]]
`, { generateSourceMap: true });
    
    const refEntries = result.sourceMap.filter(e => e.type === 'reference');
    assertEqual(refEntries.length, 2);
  });

  test('generates source map entries for semantic markers', () => {
    const result = compile(`---
name: test
description: test
---

Write to {~~location}
`, { generateSourceMap: true });
    
    const semEntries = result.sourceMap.filter(e => e.type === 'semantic');
    assertEqual(semEntries.length, 1);
    assertEqual(semEntries[0].name, 'location');
  });
});

// ============================================================================
// Skill Registry
// ============================================================================

describe('Skill Registry', () => {
  test('creates registry from skill map', () => {
    const registry = createRegistry({
      'helper': `---
name: helper
description: A helper skill
---

## Content
`,
    });

    const skill = registry.get('helper');
    assert(skill !== undefined, 'Should find skill');
    assertEqual(skill?.name, 'helper');
  });

  test('lists available skills', () => {
    const registry = createRegistry({
      'skill-a': '---\nname: a\ndescription: a\n---',
      'skill-b': '---\nname: b\ndescription: b\n---',
    });

    const list = registry.list();
    assert(list.includes('skill-a'), 'Should include skill-a');
    assert(list.includes('skill-b'), 'Should include skill-b');
  });

  test('validates references against registry', () => {
    const registry = createRegistry({
      'existing-skill': '---\nname: existing\ndescription: exists\n---',
    });

    const result = compile(`---
name: test
description: test
uses:
  - existing-skill
  - missing-skill
---

[[existing-skill]]
[[missing-skill]]
`, { validateReferences: true }, registry);

    const registryErrors = result.diagnostics.filter(d => d.code === 'E009');
    assertEqual(registryErrors.length, 1);
    assertIncludes(registryErrors[0].message, 'missing-skill');
  });
});

// ============================================================================
// Full Graph Cycle Detection
// ============================================================================

describe('Full Graph Cycle Detection', () => {
  test('detects cycles in multi-skill graph', () => {
    const registry = createRegistry({
      'skill-a': `---
name: skill-a
description: A
uses:
  - skill-b
---`,
      'skill-b': `---
name: skill-b
description: B
uses:
  - skill-c
---`,
      'skill-c': `---
name: skill-c
description: C
uses:
  - skill-a
---`,
    });

    const { cycles } = buildFullDependencyGraph(registry);
    assert(cycles.length > 0, 'Should detect cycle');
  });

  test('no cycles in acyclic graph', () => {
    const registry = createRegistry({
      'skill-a': `---
name: skill-a
description: A
uses:
  - skill-b
---`,
      'skill-b': `---
name: skill-b
description: B
---`,
    });

    const { cycles } = buildFullDependencyGraph(registry);
    assertEqual(cycles.length, 0, 'Should not detect cycles');
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('Error Handling', () => {
  test('handles empty source', () => {
    const result = compile('');
    assertEqual(result.diagnostics.filter(d => d.severity === 'error').length, 0);
    assertEqual(result.output, '');
  });

  test('collects parse errors in diagnostics', () => {
    const result = compile(`---
name: test
description: test
---

FOR EACH without proper syntax
`);
    // Should compile without crashing, may have diagnostics
    assert(result.output.length > 0, 'Should produce output');
  });
});

// ============================================================================
// Integration: Full Skill
// ============================================================================

describe('Full Skill Validation', () => {
  test('validates complete orchestrate-map-reduce skill', () => {
    const result = compile(`---
name: orchestrate-map-reduce
description: Fan out to multiple agents
uses:
  - work-packages
---

## Types

$Task = any task that an agent can execute
$Strategy = "accumulate" | "independent"

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

4. Return findings

## Iteration Manager

Handle a single iteration.
`);

    // Source unchanged
    assertIncludes(result.output, '$Task = any task');
    assertIncludes(result.output, '{~~appropriate location}');
    assertIncludes(result.output, '[[#iteration-manager]]');
    
    // Metadata extracted
    assertEqual(result.metadata.name, 'orchestrate-map-reduce');
    assertEqual(result.metadata.types.length, 2);
    assert(result.metadata.sections.some(s => s.anchor === 'iteration-manager'), 
      'Should find iteration-manager section');
    
    // Local section reference should validate
    const sectionErrors = result.diagnostics.filter(d => d.code === 'E010');
    assertEqual(sectionErrors.length, 0, 'Local section should be found');
    
    // work-packages is declared, so no warning for it
    const wpWarnings = result.diagnostics.filter(d => 
      d.code === 'W001' && d.message.includes('work-packages'));
    assertEqual(wpWarnings.length, 0);
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ Compiler Tests (v0.3 Validator-First) ===\n');

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}

// ============================================================================
// Built-in Primitive Types
// ============================================================================

describe('Built-in Primitive Types', () => {
  test('$String does not trigger type warning', () => {
    const result = compile(`---
name: test
description: test
---

- $name: $String = "hello"
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, '$String should be a built-in primitive');
  });

  test('$Number does not trigger type warning', () => {
    const result = compile(`---
name: test
description: test
---

- $count: $Number = 42
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, '$Number should be a built-in primitive');
  });

  test('$Boolean does not trigger type warning', () => {
    const result = compile(`---
name: test
description: test
---

- $enabled: $Boolean = true
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, '$Boolean should be a built-in primitive');
  });

  test('$FilePath triggers type warning (not a primitive)', () => {
    const result = compile(`---
name: test
description: test
---

- $path: $FilePath = "/some/path"
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 1, '$FilePath should trigger warning');
    assertIncludes(typeWarnings[0].message, 'FilePath');
  });

  test('multiple primitives in same document', () => {
    const result = compile(`---
name: test
description: test
---

- $name: $String = "test"
- $count: $Number = 0
- $enabled: $Boolean = true
- $custom: $CustomType = value
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 1, 'Only $CustomType should trigger warning');
    assertIncludes(typeWarnings[0].message, 'CustomType');
  });
});
