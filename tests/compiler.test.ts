/**
 * Compiler Tests - v0.3 Validator-First
 * 
 * Tests for the refactored zen compiler that validates rather than transforms.
 */

import { compile, createRegistry, buildFullDependencyGraph } from '../packages/core/src/compiler/compiler';

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

Some content with $variable and ~/skill/my-skill and $/semantic span/.
`;
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Output should equal source exactly');
  });

  test('$Type stays as $Type (no expansion)', () => {
    const source = `---
name: test
description: test
---

$Task: any executable instruction

$current: $Task = do something
`;
    const result = compile(source, { includeHeader: false });
    assertIncludes(result.output, '$Task: any executable instruction');
    assertIncludes(result.output, '$current: $Task');
    assert(!result.output.includes('Task (any executable instruction)'), 
      'Types should NOT be expanded');
  });

  test('instruction spans stay as authored (no transformation)', () => {
    const source = `---
name: test
description: test
---

DO appropriate location
`;
    const result = compile(source, { includeHeader: false });
    assertIncludes(result.output, 'DO appropriate location');
    assert(!result.output.includes('(determine:'),
      'Instruction spans should NOT be transformed');
  });


  test('~/link/ref stays as ~/link/ref (v0.8)', () => {
    const source = `---
name: test
description: test
---

Execute ~/skill/other-skill
`;
    const result = compile(source, { includeHeader: false });
    assertIncludes(result.output, '~/skill/other-skill');
    assert(!result.output.includes('(other-skill)'),
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

$Task: any executable instruction
$Strategy: "fast" | "slow"
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

$count = 0
$path: $FilePath = "output.md"
`);
    assertEqual(result.metadata.variables.length, 2);
    assertEqual(result.metadata.variables[0].name, 'count');
    assertEqual(result.metadata.variables[1].name, 'path');
    assertEqual(result.metadata.variables[1].type, 'FilePath');
  });

  test('extracts skill references (v0.8 link syntax)', () => {
    const result = compile(`---
name: test
description: test
uses:
  - ~orchestrate
---

Execute ~/skill/orchestrate
See ~/skill/helper
`);
    const skillRefs = result.metadata.references.filter(r => r.kind === 'skill');
    assertEqual(skillRefs.length, 2);
    // v0.8: target is the full raw link path
    assertEqual(skillRefs[0].target, '~/skill/orchestrate');
    assertEqual(skillRefs[0].path?.join('/'), 'skill/orchestrate');
    assertEqual(skillRefs[1].target, '~/skill/helper');
    assertEqual(skillRefs[1].path?.join('/'), 'skill/helper');
  });

  test('extracts section references (v0.8 anchor/link syntax)', () => {
    const result = compile(`---
name: test
description: test
---

## My Section

See #my-section
See ~/skill/other-skill#other-section
`);
    // v0.8: Local section refs are 'anchor' kind
    const anchorRefs = result.metadata.references.filter(r => r.kind === 'anchor');
    assertEqual(anchorRefs.length, 1);
    assertEqual(anchorRefs[0].anchor, 'my-section');
    
    // v0.8: Cross-file refs with anchors are 'skill' kind (the link determines the kind, anchor is just a property)
    const skillRefsWithAnchor = result.metadata.references.filter(r => r.kind === 'skill' && r.anchor);
    assertEqual(skillRefsWithAnchor.length, 1);
    assertEqual(skillRefsWithAnchor[0].path?.join('/'), 'skill/other-skill');
    assertEqual(skillRefsWithAnchor[0].anchor, 'other-section');
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

describe('Dependency Graph (v0.8)', () => {
  // v0.8: Dependencies are inferred from link references, not frontmatter uses:
  test('builds graph from inline link references', () => {
    const result = compile(`---
name: test
description: test
---

Execute ~/skill/skill-a
Execute ~/skill/skill-b
`);
    assert(result.dependencies.nodes.includes('skill/skill-a'), 'Should include skill/skill-a');
    assert(result.dependencies.nodes.includes('skill/skill-b'), 'Should include skill/skill-b');
    
    const refEdges = result.dependencies.edges.filter(e => e.type === 'reference');
    assertEqual(refEdges.length, 2);
  });

  test('builds graph from inline references (v0.8 link syntax)', () => {
    const result = compile(`---
name: test
description: test
---

Execute ~/skill/inline-skill
`);
    assert(result.dependencies.nodes.includes('skill/inline-skill'), 'Should include skill/inline-skill');
    
    const refEdges = result.dependencies.edges.filter(e => e.type === 'reference');
    assertEqual(refEdges.length, 1);
    assertEqual(refEdges[0].target, 'skill/inline-skill');
  });

  test('deduplicates dependencies (v0.8 link syntax)', () => {
    const result = compile(`---
name: test
description: test
---

Execute ~/skill/helper
Execute ~/skill/helper again
`);
    const helperNodes = result.dependencies.nodes.filter(n => n === 'skill/helper');
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

$x: $UndefinedType = value
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

$Task: any task

$x: $Task = value
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, 'Should not warn when type is defined');
  });
});

describe('Validation - References (v0.8 link syntax)', () => {
  // v0.8: References are inferred from links, no uses: declaration needed
  // No warning for undeclared skill references since all references are auto-inferred
  test('skill references are auto-inferred (no undeclared warning)', () => {
    const result = compile(`---
name: test
description: test
---

Execute ~/skill/undeclared-skill
`, { validateReferences: true });
    
    // v0.8: No warning since references are inferred from the document
    const refWarnings = result.diagnostics.filter(d => d.code === 'W001');
    assertEqual(refWarnings.length, 0);
  });

  test('skill references work with or without uses: declaration', () => {
    const result = compile(`---
name: test
description: test
uses:
  - ~declared-skill
---

Execute ~/skill/declared-skill
`, { validateReferences: true });
    
    // No warnings in either case
    const refWarnings = result.diagnostics.filter(d => d.code === 'W001');
    assertEqual(refWarnings.length, 0);
  });

  test('errors on undefined local section reference', () => {
    const result = compile(`---
name: test
description: test
---

See #nonexistent-section
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

See #my-section
`, { validateReferences: true });
    
    const sectionErrors = result.diagnostics.filter(d => d.code === 'E010');
    assertEqual(sectionErrors.length, 0);
  });
});

describe('Validation - Contracts (v0.8 link syntax)', () => {
  // v0.8: Skill name must match the path in link references for self-reference
  test('errors on missing required parameter', () => {
    const skillSource = `---
name: skill/test-skill
description: test
---

## Input

$requiredParam: $String

Execute ~/skill/test-skill
`;

    const result = compile(skillSource, { validateContracts: true });

    const contractErrors = result.diagnostics.filter(d => d.code === 'E011');
    assertEqual(contractErrors.length, 1);
    assertIncludes(contractErrors[0].message, 'requiredParam');
    assertIncludes(contractErrors[0].message, 'missing');
  });

  test('no error when required parameter is provided', () => {
    const skillSource = `---
name: skill/test-skill
description: test
---

## Input

$requiredParam: $String

Execute ~/skill/test-skill WITH:
  requiredParam: "value"
`;

    const result = compile(skillSource, { validateContracts: true });

    const contractErrors = result.diagnostics.filter(d => d.code === 'E011');
    assertEqual(contractErrors.length, 0);
  });

  test('warns on extra parameter', () => {
    const skillSource = `---
name: skill/test-skill
description: test
---

Execute ~/skill/test-skill WITH:
  extraParam: "value"
`;

    const result = compile(skillSource, { validateContracts: true });

    const contractWarnings = result.diagnostics.filter(d => d.code === 'W002');
    assertEqual(contractWarnings.length, 1);
    assertIncludes(contractWarnings[0].message, 'extraParam');
    assertIncludes(contractWarnings[0].message, 'not defined');
  });
});

describe('Validation - Contract Type Compatibility', () => {
  test('errors on mismatched parameter type', () => {
    const registry = createRegistry({
      'skill/target-skill': `---
name: skill/target-skill
description: test
---

## Input

$count: $Number
`,
    });

    const result = compile(`---
name: skill/caller
description: test
---

use ~/skill/target-skill WITH:
  count: "not-a-number"
`, { validateContracts: true }, registry);

    const typeErrors = result.diagnostics.filter(d => d.code === 'E020');
    assertEqual(typeErrors.length, 1);
    assertIncludes(typeErrors[0].message, 'count');
  });

  test('errors when enum candidate is not subset', () => {
    const registry = createRegistry({
      'skill/enum-target': `---
name: skill/enum-target
description: test
---

$Mode: "fast" | "slow"
$ModeExtended: "fast" | "slow" | "turbo"

## Input

$mode: $Mode
`,
    });

    const result = compile(`---
name: skill/caller
description: test
---

$mode: $ModeExtended = "fast"

use ~/skill/enum-target WITH:
  mode: $mode
`, { validateContracts: true }, registry);

    const typeErrors = result.diagnostics.filter(d => d.code === 'E020');
    assertEqual(typeErrors.length, 1);
  });

  test('semantic types behave as Any', () => {
    const registry = createRegistry({
      'skill/any-target': `---
name: skill/any-target
description: test
---

$Task: any task

## Input

$task: $Task
`,
    });

    const result = compile(`---
name: skill/caller
description: test
---

use ~/skill/any-target WITH:
  task: 42
`, { validateContracts: true }, registry);

    const typeErrors = result.diagnostics.filter(d => d.code === 'E020');
    assertEqual(typeErrors.length, 0);
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

$Task: any task
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

$x = value
$y = other
`, { generateSourceMap: true });
    
    const varEntries = result.sourceMap.filter(e => e.type === 'variable');
    assertEqual(varEntries.length, 2);
  });

  test('generates source map entries for references (v0.8 link syntax)', () => {
    const result = compile(`---
name: test
description: test
---

Reference ~/skill/skill-ref and #section-ref
`, { generateSourceMap: true });
    
    const refEntries = result.sourceMap.filter(e => e.type === 'reference');
    assertEqual(refEntries.length, 2);
  });

  test('generates source map entries for instruction spans', () => {
    const result = compile(`---
name: test
description: test
---

DO location marker
`, { generateSourceMap: true });
    
    const semEntries = result.sourceMap.filter(e => e.type === 'semantic');
    assertEqual(semEntries.length, 1);
    assertEqual(semEntries[0].name, 'location marker');
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

  test('validates references against registry (v0.8 link syntax)', () => {
    // v0.8: Registry keys must match the link path (e.g., 'skill/existing-skill' for ~/skill/existing-skill)
    const registry = createRegistry({
      'skill/existing-skill': '---\nname: skill/existing-skill\ndescription: exists\n---',
    });

    const result = compile(`---
name: test
description: test
---

See ~/skill/existing-skill and ~/skill/missing-skill
`, { validateReferences: true }, registry);

    const registryErrors = result.diagnostics.filter(d => d.code === 'E009');
    assertEqual(registryErrors.length, 1);
    assertIncludes(registryErrors[0].message, 'missing-skill');
  });
});

// ============================================================================
// Full Graph Cycle Detection
// ============================================================================

describe('Full Graph Cycle Detection (v0.8)', () => {
  // v0.8: Cycles are detected from link references in content, not frontmatter uses:
  test('detects cycles in multi-skill graph', () => {
    const registry = createRegistry({
      'skill/skill-a': `---
name: skill/skill-a
description: A
---

Execute ~/skill/skill-b
`,
      'skill/skill-b': `---
name: skill/skill-b
description: B
---

Execute ~/skill/skill-c
`,
      'skill/skill-c': `---
name: skill/skill-c
description: C
---

Execute ~/skill/skill-a
`,
    });

    const { cycles } = buildFullDependencyGraph(registry);
    assert(cycles.length > 0, 'Should detect cycle');
  });

  test('no cycles in acyclic graph', () => {
    const registry = createRegistry({
      'skill/skill-a': `---
name: skill/skill-a
description: A
---

Execute ~/skill/skill-b
`,
      'skill/skill-b': `---
name: skill/skill-b
description: B
---
`,
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

FOR without proper syntax
`);
    // Should compile without crashing, may have diagnostics
    assert(result.output.length > 0, 'Should produce output');
  });
});

// ============================================================================
// Integration: Full Skill
// ============================================================================

describe('Full Skill Validation (v0.8 link syntax)', () => {
  test('validates complete orchestrate-map-reduce skill', () => {
    const result = compile(`---
name: orchestrate-map-reduce
description: Fan out to multiple agents
uses:
  - ~work-packages
---

## Types

$Task: any task that an agent can execute
$Strategy: "accumulate" | "independent"

## Input

$transforms: ($Task, $Strategy)[]
$validator: $Task

## Workflow

DO create master work package at appropriate location

FOR ($task, $strategy) IN $transforms
  DELEGATE handle iteration TO ~/agent/iteration-manager
END
   
WHILE NOT diminishing returns AND $iterations < 5 DO
  Execute iteration
  IF $result = "progress" THEN
    $current = $current
  END
END

RETURN findings

## Iteration Manager

Handle a single iteration.
`);

    // Source unchanged
    assertIncludes(result.output, '$Task: any task');
    assertIncludes(result.output, 'DO create master work package at appropriate location');
    assertIncludes(result.output, '## Iteration Manager');
    
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
// Inferred Variables and Semantic Markers (v0.4 syntax)
// ============================================================================

describe('Inferred Variables', () => {
  test('$/name/ does not trigger undeclared variable warning', () => {
    const result = compile(`---
name: test
description: test
---

Process item at $/index/
`, { validateReferences: true });
    
    // Inferred variables should not trigger undeclared warnings
    const undeclaredWarnings = result.diagnostics.filter(d => 
      d.code === 'E007' || d.message.includes('undeclared'));
    assertEqual(undeclaredWarnings.length, 0, 'Inferred variables should not trigger undeclared warnings');
  });

  test('/content with $declared/ validates embedded reference', () => {
    const result = compile(`---
name: test
description: test
---

$item = "test"

Write to /path for $item/
`, { validateReferences: true });
    
    // Should not warn - $item is declared
    const undeclaredWarnings = result.diagnostics.filter(d => 
      d.code === 'E007' || d.message.includes('undeclared'));
    assertEqual(undeclaredWarnings.length, 0);
  });
});

// ============================================================================
// Built-in Primitive Types
// ============================================================================

describe('Built-in Primitive Types', () => {
  test('$String does not trigger type warning', () => {
    const result = compile(`---
name: test
description: test
---

$name: $String = "hello"
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, '$String should be a built-in primitive');
  });

  test('$Number does not trigger type warning', () => {
    const result = compile(`---
name: test
description: test
---

$count: $Number = 42
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, '$Number should be a built-in primitive');
  });

  test('$Boolean does not trigger type warning', () => {
    const result = compile(`---
name: test
description: test
---

$enabled: $Boolean = true
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 0, '$Boolean should be a built-in primitive');
  });

  test('$FilePath triggers type warning (not a primitive)', () => {
    const result = compile(`---
name: test
description: test
---

$path: $FilePath = "/some/path"
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

$name: $String = "test"
$count: $Number = 0
$enabled: $Boolean = true
$custom: $CustomType = value
`, { validateTypes: true });
    
    const typeWarnings = result.diagnostics.filter(d => d.code === 'E008');
    assertEqual(typeWarnings.length, 1, 'Only $CustomType should trigger warning');
    assertIncludes(typeWarnings[0].message, 'CustomType');
  });
});

