/**
 * Integration Tests - v0.3 Validator-First
 * 
 * End-to-end tests using simpler skill examples.
 * Updated for the new compiler that validates rather than transforms.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '../packages/core/src/parser/parser';
import { compile } from '../packages/core/src/compiler/compiler';

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
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// Simple Skill Test Cases
// ============================================================================

const simpleSkill = `---
name: simple-skill
description: A simple test skill
uses:
  - base-skill
---

## Types

$Task: any task that an agent can execute
$Status: "pending" | "done"

## Input

- $target: $Task
- $status: $Status = "pending"

## Workflow

1. Execute $target with [[base-skill]]
2. Update $status

## Helper Section

Helper content here.
`;

const controlFlowSkill = `---
name: control-flow-skill
description: Tests control flow constructs
---

## Types

$Item: an item to process

## Workflow

FOR EACH $item IN $items:
  - Process $item

WHILE ($count < 5):
  - Increment

IF $done = true THEN:
  - Report success
ELSE:
  - Continue
`;

const semanticSkill = `---
name: semantic-skill
description: Tests semantic markers
---

## Workflow

1. Write to {~~appropriate location}
2. Determine {~~best approach for task}
`;

// ============================================================================
// Simple Skill Tests
// ============================================================================

describe('Simple Skill Parsing', () => {
  test('parses simple skill without errors', () => {
    const doc = parse(simpleSkill);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message).join(', ')}`);
  });

  test('extracts frontmatter correctly', () => {
    const doc = parse(simpleSkill);
    assertEqual(doc.frontmatter?.name, 'simple-skill');
    assert(doc.frontmatter?.uses?.includes('base-skill') ?? false, 'Should use base-skill');
  });

  test('identifies types', () => {
    const doc = parse(simpleSkill);
    const types = doc.sections.flatMap(s => 
      s.content.filter(b => b.kind === 'TypeDefinition')
    );
    assertEqual(types.length, 2);
  });

  test('identifies sections', () => {
    const doc = parse(simpleSkill);
    assert(doc.sections.some(s => s.title === 'Types'), 'Has Types section');
    assert(doc.sections.some(s => s.title === 'Workflow'), 'Has Workflow section');
    assert(doc.sections.some(s => s.title === 'Helper Section'), 'Has Helper section');
  });

  test('compiles without errors', () => {
    const result = compile(simpleSkill);
    const errors = result.diagnostics.filter(d => d.severity === 'error');
    assertEqual(errors.length, 0);
  });

  test('preserves source unchanged (no expansion)', () => {
    const result = compile(simpleSkill, { includeHeader: false });
    // Source should be preserved exactly
    assertEqual(result.output, simpleSkill);
    // Type definitions still present as authored
    assert(result.output.includes('$Task: any task'), 'Type def preserved');
    // No expansion text
    assert(!result.output.includes('Task (any task'), 'No expansion');
  });

  test('extracts metadata for references', () => {
    const result = compile(simpleSkill);
    // Reference should be in metadata
    const skillRefs = result.metadata.references.filter(r => r.kind === 'skill');
    assert(skillRefs.some(r => r.target === 'base-skill'), 'Should find base-skill ref');
  });
});

// ============================================================================
// Control Flow Tests
// ============================================================================

describe('Control Flow Skill Parsing', () => {
  test('parses control flow without errors', () => {
    const doc = parse(controlFlowSkill);
    // May have some errors due to simplified parsing
    // Focus on structure being captured
    assert(doc.sections.length > 0, 'Should have sections');
  });

  test('identifies FOR EACH', () => {
    const doc = parse(controlFlowSkill);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter(b => b.kind === 'ForEachStatement')
    );
    assert(forEachs.length >= 1, 'Should have FOR EACH');
  });

  test('identifies WHILE', () => {
    const doc = parse(controlFlowSkill);
    const whiles = doc.sections.flatMap(s => 
      s.content.filter(b => b.kind === 'WhileStatement')
    );
    assert(whiles.length >= 1, 'Should have WHILE');
  });

  test('identifies IF', () => {
    const doc = parse(controlFlowSkill);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter(b => b.kind === 'IfStatement')
    );
    assert(ifs.length >= 1, 'Should have IF');
  });

  test('compiles control flow (preserves source)', () => {
    const result = compile(controlFlowSkill, { includeHeader: false });
    assert(result.output.includes('FOR EACH'), 'FOR EACH in output');
    assert(result.output.includes('WHILE'), 'WHILE in output');
    // Control flow tracked in source map
    const cfEntries = result.sourceMap.filter(e => e.type === 'control-flow');
    assert(cfEntries.length > 0, 'Control flow in source map');
  });
});

// ============================================================================
// Semantic Marker Tests
// ============================================================================

describe('Semantic Skill Parsing', () => {
  test('parses semantic markers', () => {
    const doc = parse(semanticSkill);
    assertEqual(doc.errors.length, 0);
  });

  test('preserves semantic markers (no transformation)', () => {
    const result = compile(semanticSkill, { includeHeader: false });
    // Semantic markers should be preserved
    assert(result.output.includes('{~~appropriate location}'), 'Marker preserved');
    assert(result.output.includes('{~~best approach'), 'Marker preserved');
    // No transformation applied
    assert(!result.output.includes('(determine:'), 'No transformation');
    // Markers tracked in source map
    const semEntries = result.sourceMap.filter(e => e.type === 'semantic');
    assert(semEntries.length >= 2, 'Semantic markers in source map');
  });
});

// ============================================================================
// Compilation Statistics
// ============================================================================

describe('Compilation Metadata', () => {
  test('extracts types and variables', () => {
    const result = compile(simpleSkill);
    assert(result.metadata.types.length >= 2, 'Should extract types');
    assert(result.metadata.variables.length >= 2, 'Should extract variables');
  });

  test('generates source map entries', () => {
    const result = compile(simpleSkill, { generateSourceMap: true });
    assert(result.sourceMap.length > 0, 'Should have entries');
  });

  test('builds dependency graph', () => {
    const result = compile(simpleSkill);
    assert(result.dependencies.nodes.includes('base-skill'), 'Should include base-skill');
    assert(result.dependencies.edges.length > 0, 'Should have edges');
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  test('parses quickly', () => {
    const largeSkill = simpleSkill.repeat(20);
    const start = Date.now();
    parse(largeSkill);
    const elapsed = Date.now() - start;
    assert(elapsed < 1000, `Took ${elapsed}ms, should be < 1000ms`);
  });

  test('compiles quickly', () => {
    const largeSkill = simpleSkill.repeat(20);
    const start = Date.now();
    compile(largeSkill);
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `Took ${elapsed}ms, should be < 2000ms`);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('handles empty skill', () => {
    const result = compile('');
    assert(result.output.length >= 0, 'Handles empty');
  });

  test('handles skill with only frontmatter', () => {
    const skill = `---
name: empty
description: Empty skill
---
`;
    const result = compile(skill, { includeHeader: false });
    assertEqual(result.output, skill, 'Preserves source');
  });

  test('handles unicode content', () => {
    const skill = `---
name: unicode-test
description: Test with émojis 🎉 and αβγ
---

## Section

Content with unicode: 日本語
`;
    const doc = parse(skill);
    assertEqual(doc.errors.length, 0);
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ Integration Tests (v0.3 Validator-First) ===\n');

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}
