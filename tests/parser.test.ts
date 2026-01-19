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

$Task: any task that an agent can execute
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

$Strategy: "accumulate" | "independent"
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

$Task: any task
$Strategy: "fast" | "slow"
$Result: outcome of task
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

$count = 0
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

$path: $FilePath = "output.md"
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'path');
    assert(vars[0].typeAnnotation?.kind === 'TypeReference', 'Type annotation should be TypeReference');
    assertEqual((vars[0].typeAnnotation as AST.TypeReference).name, 'FilePath');
    assert(vars[0].value?.kind === 'StringLiteral', 'Value should be string');
  });

  test('parses lambda expression', () => {
    const doc = parse(`---
name: test
description: test
---

$fn = $x => x + 1
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

$fn = ($a, $b) => a + b
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
// Reference Tests (v0.8: Link-Based References)
// ============================================================================

describe('References (v0.8 Link-Based)', () => {
  // v0.8: Skill references use ~/skill/name syntax
  test('parses skill reference as LinkNode', () => {
    const doc = parse(`---
name: test
description: test
---

EXECUTE ~/skill/orchestrate-map-reduce TO orchestrate
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.ExecuteStatement => b.kind === 'ExecuteStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].link.kind, 'Link');
    assertEqual(delegs[0].link.path, ['skill', 'orchestrate-map-reduce']);
    assertEqual(AST.getLinkKind(delegs[0].link), 'skill');
  });

  // v0.8: Delegation with skill reference and WITH parameters
  test('parses delegation with WITH parameters', () => {
    const doc = parse(`---
name: test
description: test
---

    EXECUTE ~/skill/process-data TO process WITH:
      input: $data
      format: "json"
    `);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.ExecuteStatement => b.kind === 'ExecuteStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].parameters!.parameters.length, 2);
    assertEqual(delegs[0].parameters!.parameters[0].name, 'input');
    assertEqual(delegs[0].parameters!.parameters[1].name, 'format');
    assertEqual(delegs[0].parameters!.parameters[1].value!.kind, 'StringLiteral');
    assertEqual((delegs[0].parameters!.parameters[1].value as AST.StringLiteral).value, 'json');
  });

  // v0.8: Local section references use #section syntax (AnchorNode)
  test('parses local section reference as AnchorNode', () => {
    const doc = parse(`---
name: test
description: test
---

See #my-section
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const refs = paras.flatMap(p => 
      p.content.filter((c): c is AST.AnchorNode => c.kind === 'Anchor')
    );
    assertEqual(refs.length, 1);
    assertEqual(refs[0].name, 'my-section');
  });

  // v0.8: Cross-skill section references use ~/skill/name#section syntax
  test('parses cross-skill section reference as LinkNode with anchor', () => {
    const doc = parse(`---
name: test
description: test
---

See ~/skill/other-skill#section
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const refs = paras.flatMap(p => 
      p.content.filter((c): c is AST.LinkNode => c.kind === 'Link')
    );
    assertEqual(refs.length, 1);
    assertEqual(refs[0].path, ['skill', 'other-skill']);
    assertEqual(refs[0].anchor, 'section');
  });

  // v0.8: Agent references use ~/agent/name syntax
  // Note: In paragraph context (not starting with delegation verb), ~/agent/x should parse as LinkNode
  test('parses agent reference as LinkNode in paragraph', () => {
    const doc = parse(`---
name: test
description: test
---

The ~/agent/explorer handles this task
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const refs = paras.flatMap(p => 
      p.content.filter((c): c is AST.LinkNode => c.kind === 'Link')
    );
    assertEqual(refs.length, 1);
    assertEqual(refs[0].path, ['agent', 'explorer']);
    assertEqual(AST.getLinkKind(refs[0]), 'agent');
  });

  // v0.8: Tool references use ~/tool/name syntax
  test('parses tool reference as LinkNode in paragraph', () => {
    const doc = parse(`---
name: test
description: test
---

The ~/tool/browser helps verify
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const refs = paras.flatMap(p => 
      p.content.filter((c): c is AST.LinkNode => c.kind === 'Link')
    );
    assertEqual(refs.length, 1);
    assertEqual(refs[0].path, ['tool', 'browser']);
    assertEqual(AST.getLinkKind(refs[0]), 'tool');
  });

  // v0.8: All reference types in one document using link syntax
  test('parses all v0.8 link reference types in paragraph', () => {
    const doc = parse(`---
name: test
description: test
---

The ~/agent/explorer and ~/tool/browser work with ~/skill/validator at #methodology
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    
    const links = paras.flatMap(p => 
      p.content.filter((c): c is AST.LinkNode => c.kind === 'Link')
    );
    const anchors = paras.flatMap(p => 
      p.content.filter((c): c is AST.AnchorNode => c.kind === 'Anchor')
    );
    
    assertEqual(links.length, 3);
    assertEqual(AST.getLinkKind(links[0]), 'agent');
    assertEqual(links[0].path, ['agent', 'explorer']);
    assertEqual(AST.getLinkKind(links[1]), 'tool');
    assertEqual(links[1].path, ['tool', 'browser']);
    assertEqual(AST.getLinkKind(links[2]), 'skill');
    assertEqual(links[2].path, ['skill', 'validator']);
    assertEqual(anchors.length, 1);
    assertEqual(anchors[0].name, 'methodology');
  });
});

// ============================================================================
// Semantic Span Tests
// ============================================================================

describe('Semantic Spans', () => {
  test('parses DO instruction span', () => {
    const doc = parse(`---
name: test
description: test
---

DO appropriate location
`);
    const doBlocks = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.DoStatement => b.kind === 'DoStatement')
    );
    assertEqual(doBlocks.length, 1);
    assert(!!doBlocks[0].instruction, 'Should have instruction');
    assertEqual(doBlocks[0].instruction?.content, 'appropriate location');
  });

  test('parses DELEGATE task span with variable', () => {
    const doc = parse(`---
name: test
description: test
---

DELEGATE path for $n TO ~/agent/worker
`);
    const delegates = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.DelegateStatement => b.kind === 'DelegateStatement')
    );
    assertEqual(delegates.length, 1);
    assertEqual(delegates[0].task?.content, 'path for $n');
    assertEqual(delegates[0].task?.interpolations.length ?? 0, 1);
  });

  test('parses inferred variable $/name/', () => {
    const doc = parse(`---
name: test
description: test
---

Process item at $/index/
`);
    const paras = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const inferredVars = paras.flatMap(p =>
      p.content.filter((c): c is AST.InferredVariable => c.kind === 'InferredVariable')
    );
    assertEqual(inferredVars.length, 1);
    assertEqual(inferredVars[0].name, 'index');
  });

  test('parses variable with semantic type annotation', () => {
    const doc = parse(`---
name: test
description: test
---

$path: file path for output = "output.md"
`);
    const vars = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'path');
    assert(vars[0].typeAnnotation?.kind === 'SemanticType', 'Type annotation should be SemanticType');
    assertEqual((vars[0].typeAnnotation as AST.SemanticType).description, 'file path for output');
  });

  test('parses semantic condition without markers', () => {
    const doc = parse(`---
name: test
description: test
---

IF diminishing returns THEN
  DO stop
END
`);
    const ifs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assert(ifs[0].condition.kind === 'SemanticCondition', 'Should parse semantic condition');
    if (ifs[0].condition.kind === 'SemanticCondition') {
      assertEqual(ifs[0].condition.text, 'diminishing returns');
    }
  });
});

// ============================================================================
// Control Flow Tests
// ============================================================================

describe('Control Flow', () => {
  test('parses FOR', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $item IN $items
  Process $item
END
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

  test('parses FOR with destructuring', () => {
    const doc = parse(`---
name: test
description: test
---

FOR ($task, $strategy) IN $transforms
  Execute $task
END
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

WHILE $count < 5 DO
  Iterate
END
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

WHILE NOT diminishing returns DO
  Continue
END
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

WHILE NOT complete AND $count < 5 DO
  Process
END
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

IF $result = "progress" THEN
  Update state
END
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

IF $result = "progress" THEN
  Update
ELSE
  Retry
END
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assert(ifs[0].elseBody !== null, 'Should have else');
  });

  test('parses simple ELSE IF', () => {
    const doc = parse(`---
name: test
description: test
---

IF $x = 1 THEN
  First
ELSE IF $x = 2 THEN
  Second
ELSE
  Default
END
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assertEqual(ifs[0].elseIf.length, 1);
    assert(ifs[0].elseIf[0].condition.kind === 'DeterministicCondition', 'ELSE IF should have deterministic condition');
    assert(ifs[0].elseBody !== null, 'Should have final ELSE');
  });

  test('parses multiple ELSE IF clauses', () => {
    const doc = parse(`---
name: test
description: test
---

IF $x = 1 THEN
  One
ELSE IF $x = 2 THEN
  Two
ELSE IF $x = 3 THEN
  Three
ELSE
  Default
END
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assertEqual(ifs[0].elseIf.length, 2);
    assert(ifs[0].elseBody !== null, 'Should have final ELSE');
  });

  test('parses ELSE IF without final ELSE', () => {
    const doc = parse(`---
name: test
description: test
---

IF $x = 1 THEN
  One
ELSE IF $x = 2 THEN
  Two
END
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assertEqual(ifs[0].elseIf.length, 1);
    assertEqual(ifs[0].elseBody, null);
  });

  test('parses ELSE IF with semantic conditions', () => {
    const doc = parse(`---
name: test
description: test
---

IF any critical findings THEN
  $outcome = "request-changes"
ELSE IF major findings > 3 THEN
  $outcome = "request-changes"
ELSE IF any findings THEN
  $outcome = "comment"
ELSE
  $outcome = "approve"
END
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assertEqual(ifs.length, 1);
    assertEqual(ifs[0].elseIf.length, 2);
    assert(ifs[0].condition.kind === 'SemanticCondition', 'IF should have semantic condition');
    assert(ifs[0].elseIf[0].condition.kind === 'SemanticCondition', 'ELSE IF 1 should have semantic condition');
    assert(ifs[0].elseIf[1].condition.kind === 'SemanticCondition', 'ELSE IF 2 should have semantic condition');
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
  test('recovers from unclosed inferred variable', () => {
    const doc = parse(`---
name: test
description: test
---

Write to $/unclosed marker
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

FOR without END
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

FOR $a IN $as
  FOR $b IN $bs
IF $b = $a THEN
      Match found
    END
  END
END
`);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assertEqual(forEachs.length, 1);
  });
});

// ============================================================================
// Delegation and WITH Clause Tests
// ============================================================================

// v0.8: Updated Delegation tests with link-based syntax ~/path/to/file
describe('Delegation WITH Clause (v0.8 Link-Based)', () => {
  test('parses delegation without WITH clause', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/other-skill TO do
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].link.kind, 'Link');
    assertEqual(AST.getLinkKind(delegs[0].link), 'skill');
  });

  test('parses Call verb', () => {
    const doc = parse(`---
name: test
description: test
---

Call ~/skill/helper
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.Delegation => b.kind === 'Delegation')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].verb, 'Call');
  });

  test('parses Delegate verb with skill', () => {
    const doc = parse(`---
name: test
description: test
---

DELEGATE task TO ~/agent/worker
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.DelegateStatement => b.kind === 'DelegateStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].target?.raw, '~/agent/worker');
  });

  test('parses Use verb', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/utility-skill TO use
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].link.raw, '~/skill/utility-skill');
  });

  test('parses WITH clause with required parameter', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/process TO process WITH:
  task:
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].parameters!.parameters.length, 1);
    assertEqual(delegs[0].parameters!.parameters[0].name, 'task');
    assertEqual(delegs[0].parameters!.parameters[0].isRequired, true);
    assertEqual(delegs[0].parameters!.parameters[0].value, null);
  });

  test('parses WITH clause with default value', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/process TO process WITH:
  mode: "fast"
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].parameters!.parameters.length, 1);
    assertEqual(delegs[0].parameters!.parameters[0].name, 'mode');
    assertEqual(delegs[0].parameters!.parameters[0].isRequired, false);
    assert(delegs[0].parameters!.parameters[0].value!.kind === 'StringLiteral', 'Should have string value');
  });

  test('parses WITH clause with number default value', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/process TO process WITH:
  count: 10
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].parameters!.parameters[0].name, 'count');
    assertEqual(delegs[0].parameters!.parameters[0].isRequired, false);
    assert(delegs[0].parameters!.parameters[0].value!.kind === 'NumberLiteral', 'Should have number value');
  });

  test('parses WITH clause with multiple parameters', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/orchestrate TO orchestrate WITH:
  plan: $plan
  mode: $mode
  results: $results
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].parameters!.parameters.length, 3);
    assertEqual(delegs[0].parameters!.parameters[0].name, 'plan');
    assertEqual(delegs[0].parameters!.parameters[1].name, 'mode');
    assertEqual(delegs[0].parameters!.parameters[2].name, 'results');
  });

  test('parses delegation to section reference (AnchorNode)', () => {
    const doc = parse(`---
name: test
description: test
---

GOTO #iteration-manager
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.GotoStatement => b.kind === 'GotoStatement')
    );
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].anchor.name, 'iteration-manager');
  });

  test('parses WITH clause with variable reference value', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/process TO process WITH:
  input: $data
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assert(delegs[0].parameters!.parameters[0].value!.kind === 'VariableReference', 'Should have variable reference');
    assertEqual((delegs[0].parameters!.parameters[0].value as AST.VariableReference).name, 'data');
  });

  test('parses WITH clause with array literal value', () => {
    const doc = parse(`---
name: test
description: test
---

USE ~/skill/process TO process WITH:
  items: ["a", "b", "c"]
`);
    const delegs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.UseStatement => b.kind === 'UseStatement')
    );
    assertEqual(delegs.length, 1);
    assert(delegs[0].parameters!.parameters[0].value!.kind === 'ArrayLiteral', 'Should have array value');
  });

  test('delegation inside FOR', () => {
    const doc = parse(`---
name: test
description: test
---

FOR $task IN $tasks
  USE ~/skill/sub-processor TO process WITH:
    current: $task
END
`);
    const forEachs = doc.sections.flatMap(s =>
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assertEqual(forEachs.length, 1);
    const delegs = forEachs[0].body.filter((b): b is AST.UseStatement => b.kind === 'UseStatement');
    assertEqual(delegs.length, 1);
    assertEqual(delegs[0].parameters!.parameters.length, 1);
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
