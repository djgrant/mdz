/**
 * Parser Tests
 * 
 * Tests for the MDZ parser.
 */

import { parse } from '../packages/core/src/parser/parser';
import * as AST from '../packages/core/src/parser/ast';

// ============================================================================
// Test Runner (Simple Node.js native test runner compatible)
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
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(message || `Expected ${expectedStr}, got ${actualStr}`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// Frontmatter Tests
// ============================================================================

describe('Frontmatter Parsing', () => {
  test('parses basic frontmatter', () => {
    const doc = parse(`---
name: test-skill
description: A test skill
---
`);
    assert(doc.frontmatter !== null, 'Frontmatter should exist');
    assertEqual(doc.frontmatter?.name, 'test-skill');
    assertEqual(doc.frontmatter?.description, 'A test skill');
  });

  test('parses uses array', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - skill-a
  - skill-b
---
`);
    assertEqual(doc.frontmatter?.uses, ['skill-a', 'skill-b']);
  });

  test('handles missing frontmatter', () => {
    const doc = parse(`# Just a heading`);
    assert(doc.frontmatter === null, 'Frontmatter should be null');
    assertEqual(doc.errors.length, 0);
  });
});

// ============================================================================
// Type Definition Tests
// ============================================================================

describe('Type Definitions', () => {
  test('parses semantic type', () => {
    const doc = parse(`---
name: test
description: test
---

## Types

$Task = any task that an agent can execute
`);
    const types = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.TypeDefinition => b.kind === 'TypeDefinition')
    );
    assertEqual(types.length, 1);
    assertEqual(types[0].name, 'Task');
    assert(types[0].typeExpr.kind === 'SemanticType', 'Should be semantic type');
  });

  test('parses enum type', () => {
    const doc = parse(`---
name: test
description: test
---

$Strategy = "accumulate" | "independent"
`);
    const types = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.TypeDefinition => b.kind === 'TypeDefinition')
    );
    assertEqual(types.length, 1);
    assertEqual(types[0].name, 'Strategy');
    assert(types[0].typeExpr.kind === 'EnumType', 'Should be enum type');
    if (types[0].typeExpr.kind === 'EnumType') {
      assertEqual(types[0].typeExpr.values, ['accumulate', 'independent']);
    }
  });

  test('parses multiple types', () => {
    const doc = parse(`---
name: test
description: test
---

$Task = any task
$Strategy = "fast" | "slow"
$Result = outcome of task
`);
    const types = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.TypeDefinition => b.kind === 'TypeDefinition')
    );
    assertEqual(types.length, 3);
  });
});

// ============================================================================
// Variable Declaration Tests
// ============================================================================

describe('Variable Declarations', () => {
  test('parses simple variable', () => {
    const doc = parse(`---
name: test
description: test
---

- $count = 0
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'count');
    assert(vars[0].value?.kind === 'NumberLiteral', 'Value should be number');
  });

  test('parses typed variable', () => {
    const doc = parse(`---
name: test
description: test
---

- $path: $FilePath = "output.md"
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'path');
    assertEqual(vars[0].typeAnnotation?.name, 'FilePath');
    assert(vars[0].value?.kind === 'StringLiteral', 'Value should be string');
  });

  test('parses lambda expression', () => {
    const doc = parse(`---
name: test
description: test
---

- $fn = $x => x + 1
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'fn');
    assert(vars[0].isLambda, 'Should be lambda');
  });

  test('parses multi-param lambda', () => {
    const doc = parse(`---
name: test
description: test
---

- $fn = ($a, $b) => a + b
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assert(vars[0].value?.kind === 'LambdaExpression', 'Should be lambda');
    if (vars[0].value?.kind === 'LambdaExpression') {
      assertEqual(vars[0].value.params, ['a', 'b']);
    }
  });
});

// ============================================================================
// Reference Tests
// ============================================================================

describe('References', () => {
  test('parses skill reference', () => {
    const doc = parse(`---
name: test
description: test
---

Execute [[orchestrate-map-reduce]]
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const refs = paras.flatMap(p => 
      p.content.filter((c): c is AST.SkillReference => c.kind === 'SkillReference')
    );
    assertEqual(refs.length, 1);
    assertEqual(refs[0].skill, 'orchestrate-map-reduce');
  });

  test('parses section reference in current doc', () => {
    const doc = parse(`---
name: test
description: test
---

See [[#my-section]]
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const refs = paras.flatMap(p => 
      p.content.filter((c): c is AST.SectionReference => c.kind === 'SectionReference')
    );
    assertEqual(refs.length, 1);
    assertEqual(refs[0].section, 'my-section');
    assertEqual(refs[0].skill, null);
  });

  test('parses section reference in other skill', () => {
    const doc = parse(`---
name: test
description: test
---

See [[other-skill#section]]
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const refs = paras.flatMap(p => 
      p.content.filter((c): c is AST.SectionReference => c.kind === 'SectionReference')
    );
    assertEqual(refs.length, 1);
    assertEqual(refs[0].skill, 'other-skill');
    assertEqual(refs[0].section, 'section');
  });
});

// ============================================================================
// Semantic Marker Tests
// ============================================================================

describe('Semantic Markers', () => {
  test('parses semantic marker', () => {
    const doc = parse(`---
name: test
description: test
---

Write to {~~appropriate location}
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const markers = paras.flatMap(p => 
      p.content.filter((c): c is AST.SemanticMarker => c.kind === 'SemanticMarker')
    );
    assertEqual(markers.length, 1);
    assertEqual(markers[0].content, 'appropriate location');
  });

  test('parses semantic marker with variable', () => {
    const doc = parse(`---
name: test
description: test
---

Write to {~~path for $n}
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const markers = paras.flatMap(p => 
      p.content.filter((c): c is AST.SemanticMarker => c.kind === 'SemanticMarker')
    );
    assertEqual(markers.length, 1);
    assert(markers[0].content.includes('$n'), 'Should contain variable');
  });
});

// ============================================================================
// Control Flow Tests
// ============================================================================

describe('Control Flow', () => {
  test('parses FOR EACH', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $item IN $items:
  - Process $item
`);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assertEqual(forEachs.length, 1);
    assert(forEachs[0].pattern.kind === 'SimplePattern', 'Should be simple pattern');
    if (forEachs[0].pattern.kind === 'SimplePattern') {
      assertEqual(forEachs[0].pattern.name, 'item');
    }
  });

  test('parses FOR EACH with destructuring', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH ($task, $strategy) IN $transforms:
  - Execute $task
`);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assertEqual(forEachs.length, 1);
    assert(forEachs[0].pattern.kind === 'DestructuringPattern', 'Should be destructuring pattern');
    if (forEachs[0].pattern.kind === 'DestructuringPattern') {
      assertEqual(forEachs[0].pattern.names, ['task', 'strategy']);
    }
  });

  test('parses WHILE with deterministic condition', () => {
    const doc = parse(`---
name: test
description: test
---

WHILE ($count < 5):
  - Iterate
`);
    const whiles = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.WhileStatement => b.kind === 'WhileStatement')
    );
    assertEqual(whiles.length, 1);
    assert(whiles[0].condition.kind === 'DeterministicCondition', 'Should be deterministic');
  });

  test('parses WHILE with semantic condition', () => {
    const doc = parse(`---
name: test
description: test
---

WHILE (not diminishing returns):
  - Continue
`);
    const whiles = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.WhileStatement => b.kind === 'WhileStatement')
    );
    assertEqual(whiles.length, 1);
    assert(whiles[0].condition.kind === 'SemanticCondition', 'Should be semantic');
  });

  test('parses WHILE with compound condition', () => {
    const doc = parse(`---
name: test
description: test
---

WHILE (not complete AND $count < 5):
  - Process
`);
    const whiles = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.WhileStatement => b.kind === 'WhileStatement')
    );
    assertEqual(whiles.length, 1);
    assert(whiles[0].condition.kind === 'CompoundCondition', 'Should be compound');
  });

  test('parses IF THEN', () => {
    const doc = parse(`---
name: test
description: test
---

IF $result = "progress" THEN:
  - Update state
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assert(ifs[0].elseBody === null, 'Should not have else');
  });

  test('parses IF THEN ELSE', () => {
    const doc = parse(`---
name: test
description: test
---

IF $result = "progress" THEN:
  - Update
ELSE:
  - Retry
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assert(ifs[0].elseBody !== null, 'Should have else');
  });
});

// ============================================================================
// Section Tests
// ============================================================================

describe('Sections', () => {
  test('parses heading levels', () => {
    const doc = parse(`---
name: test
description: test
---

# Level 1

## Level 2

### Level 3
`);
    assertEqual(doc.sections.length, 3);
    assertEqual(doc.sections[0].level, 1);
    assertEqual(doc.sections[1].level, 2);
    assertEqual(doc.sections[2].level, 3);
  });

  test('generates anchors correctly', () => {
    const doc = parse(`---
name: test
description: test
---

## My Great Section
`);
    assertEqual(doc.sections[0].anchor, 'my-great-section');
  });

  test('removes special characters from anchors', () => {
    const doc = parse(`---
name: test
description: test
---

## What's Next?
`);
    assertEqual(doc.sections[0].anchor, 'whats-next');
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  test('recovers from unclosed semantic marker', () => {
    const doc = parse(`---
name: test
description: test
---

Write to {~~unclosed
Next line
`);
    // Should still parse, possibly with errors
    assert(doc.sections.length > 0, 'Should have sections');
  });

  test('handles invalid control flow gracefully', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH without colon
Next line
`);
    // Should recover
    assert(doc.sections.length > 0, 'Should have sections');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  test('handles empty document', () => {
    const doc = parse('');
    assert(doc.frontmatter === null, 'No frontmatter');
    assertEqual(doc.sections.length, 0);
    assertEqual(doc.errors.length, 0);
  });

  test('handles only frontmatter', () => {
    const doc = parse(`---
name: test
description: test
---
`);
    assert(doc.frontmatter !== null, 'Has frontmatter');
    assertEqual(doc.sections.length, 0);
  });

  test('handles unicode content', () => {
    const doc = parse(`---
name: test
description: Test with émojis 🎉
---

## Section avec accénts

Content: αβγδ
`);
    assertEqual(doc.frontmatter?.description, 'Test with émojis 🎉');
    assert(doc.sections.length > 0, 'Should have sections');
  });

  test('handles deeply nested control flow', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $a IN $as:
  - FOR EACH $b IN $bs:
    - IF $b = $a THEN:
      - Match found
`);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assertEqual(forEachs.length, 1);
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ Parser Tests ===\n');

// Execute all describe blocks (they run immediately)

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}
