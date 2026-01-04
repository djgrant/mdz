/**
 * Stress Tests - Edge Cases (v0.3 - Validator-First)
 * 
 * Tests that push the boundaries of the MDZ parser
 * to find edge cases and limitations.
 */

import { parse } from '../../src/parser/parser';
import { compile } from '../../src/compiler/compiler';
import * as AST from '../../src/parser/ast';

// ============================================================================
// Test Infrastructure
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

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// Complex Nested Control Flow
// ============================================================================

describe('Complex Nested Control Flow', () => {
  test('FOR EACH inside WHILE inside IF', () => {
    const doc = parse(`---
name: nested-test
description: Test nested control flow
---

## Workflow

IF $ready = true THEN:
  - WHILE ($count < 3):
    - FOR EACH $item IN $items:
      - Process $item at level $count
`);
    const ifs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.IfStatement => b.kind === 'IfStatement')
    );
    assert(ifs.length >= 1, 'Should have IF statement');
  });

  test('Triple nested FOR EACH', () => {
    const doc = parse(`---
name: triple-nested
description: Test triple nesting
---

FOR EACH $a IN $as:
  - FOR EACH $b IN $bs:
    - FOR EACH $c IN $cs:
      - Process ($a, $b, $c)
`);
    assert(doc.errors.length === 0, `Errors: ${doc.errors.map(e => e.message)}`);
  });

  test('IF inside FOR EACH with ELSE', () => {
    const doc = parse(`---
name: if-in-foreach
description: Test IF inside FOR EACH
---

FOR EACH $item IN $items:
  - IF $item.priority = "high" THEN:
    - Process immediately
  - ELSE:
    - Queue for later
  - Continue to next
`);
    const forEachs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ForEachStatement => b.kind === 'ForEachStatement')
    );
    assert(forEachs.length >= 1, 'Should have FOR EACH');
  });

  test('Mixed semantic and deterministic conditions', () => {
    const doc = parse(`---
name: mixed-conditions
description: Mixed conditions
---

WHILE (not complete AND $iterations < 10 OR should retry):
  - Continue processing
`);
    const whiles = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.WhileStatement => b.kind === 'WhileStatement')
    );
    assert(whiles.length >= 1, 'Should have WHILE');
  });
});

// ============================================================================
// Unicode and Special Characters
// ============================================================================

describe('Unicode and Special Characters', () => {
  test('Emoji in frontmatter', () => {
    const doc = parse(`---
name: emoji-test
description: Test with 🎉 emoji 🚀
---

## Section 💡
Content here
`);
    assert(doc.frontmatter?.description?.includes('🎉') ?? false, 'Should preserve emoji');
  });

  test('Unicode letters in identifiers (prose)', () => {
    const doc = parse(`---
name: unicode-prose
description: Unicode prose test
---

## Workflow
Process αβγ values with Ω factor
`);
    assert(doc.errors.length === 0, 'Should parse without errors');
  });

  test('CJK characters in content', () => {
    const doc = parse(`---
name: cjk-test
description: 日本語テスト
---

## ワークフロー
処理を開始する
`);
    assert(doc.frontmatter?.description === '日本語テスト', 'Should preserve CJK');
  });

  test('Right-to-left text', () => {
    const doc = parse(`---
name: rtl-test
description: Test RTL text
---

## Section
Hebrew: שלום
Arabic: مرحبا
`);
    assert(doc.errors.length === 0, 'Should handle RTL');
  });

  test('Special punctuation', () => {
    const doc = parse(`---
name: punctuation-test
description: Test—with—em-dashes
---

"Smart quotes" and 'apostrophes' and … ellipsis
`);
    assert(doc.errors.length === 0, 'Should handle special punctuation');
  });
});

// ============================================================================
// Error Recovery
// ============================================================================

describe('Error Recovery', () => {
  test('Recovers from unclosed [[reference', () => {
    const doc = parse(`---
name: unclosed-ref
description: Test
---

See [[unclosed-reference
Next line continues
`);
    assert(doc.sections.length > 0, 'Should still parse sections');
  });

  test('Recovers from unclosed {~~semantic', () => {
    const doc = parse(`---
name: unclosed-semantic
description: Test
---

Write to {~~unclosed semantic marker
Next paragraph
`);
    assert(doc.sections.length > 0, 'Should still parse');
  });

  test('Handles malformed frontmatter', () => {
    const doc = parse(`---
name without colon
description: ok
---
`);
    // Should either parse what it can or report error gracefully
    assert(true, 'Should not crash');
  });

  test('Handles control flow without colon', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $item IN $items
  - Process
`);
    // Should recover gracefully
    assert(doc.sections.length > 0, 'Should have sections');
  });

  test('Handles deeply unbalanced brackets', () => {
    const doc = parse(`---
name: test
description: test
---

Execute [[skill with [[nested]] and more]]
Then [[another]]
`);
    // Parser should handle this somehow
    assert(doc.sections.length > 0, 'Should have sections');
  });

  test('Handles empty control flow body', () => {
    const doc = parse(`---
name: test
description: test
---

FOR EACH $item IN $items:

## Next Section
`);
    assert(doc.sections.length >= 1, 'Should have sections');
  });
});

// ============================================================================
// Large Documents
// ============================================================================

describe('Large Document Handling', () => {
  test('Handles 100+ types', () => {
    let types = '';
    for (let i = 0; i < 100; i++) {
      types += `$Type${i} = description for type ${i}\n`;
    }
    const doc = parse(`---
name: many-types
description: Test many types
---

## Types

${types}
`);
    const typeDefs = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.TypeDefinition => b.kind === 'TypeDefinition')
    );
    assert(typeDefs.length >= 90, `Should have many types, got ${typeDefs.length}`);
  });

  test('Handles 100+ variables', () => {
    let vars = '';
    for (let i = 0; i < 100; i++) {
      vars += `- $var${i} = ${i}\n`;
    }
    const doc = parse(`---
name: many-vars
description: Test many variables
---

## Variables

${vars}
`);
    const varDecls = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assert(varDecls.length >= 90, `Should have many vars, got ${varDecls.length}`);
  });

  test('Handles very long lines', () => {
    const longContent = 'a'.repeat(10000);
    const doc = parse(`---
name: long-lines
description: Test long lines
---

## Content

${longContent}
`);
    assert(doc.sections.length > 0, 'Should parse long lines');
  });

  test('Handles document with 1000+ lines', () => {
    let content = `---
name: large-doc
description: Large document test
---

`;
    for (let i = 0; i < 200; i++) {
      content += `## Section ${i}\n\nContent for section ${i}.\n\n`;
    }
    const start = Date.now();
    const doc = parse(content);
    const elapsed = Date.now() - start;
    assert(elapsed < 5000, `Should parse in < 5s, took ${elapsed}ms`);
    assert(doc.sections.length >= 100, 'Should have many sections');
  });

  test('Handles many references in one line', () => {
    const refs = Array(20).fill(0).map((_, i) => `[[skill-${i}]]`).join(' and ');
    const doc = parse(`---
name: many-refs
description: Test
---

Execute ${refs}
`);
    assert(doc.errors.length === 0, 'Should parse many refs');
  });
});

// ============================================================================
// Semantic Marker Edge Cases
// ============================================================================

describe('Semantic Marker Edge Cases', () => {
  test('Semantic marker with variable interpolation', () => {
    const doc = parse(`---
name: test
description: test
---

{~~path for candidate $n in $directory}
`);
    assert(doc.errors.length === 0, 'Should parse');
  });

  test('Multiple semantic markers in one line', () => {
    const doc = parse(`---
name: test
description: test
---

Write {~~first thing} and then {~~second thing}
`);
    const paras = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.Paragraph => b.kind === 'Paragraph')
    );
    const markers = paras.flatMap(p => 
      p.content.filter((c): c is AST.SemanticMarker => c.kind === 'SemanticMarker')
    );
    assertEqual(markers.length, 2, 'Should have 2 markers');
  });

  test('Semantic marker with special characters inside', () => {
    const doc = parse(`---
name: test
description: test
---

{~~path with special chars: @#%^&*}
`);
    // Should handle or reject gracefully
    assert(doc.sections.length > 0, 'Should parse');
  });

  test('Semantic marker in template literal', () => {
    const doc = parse(`---
name: test
description: test
---

- $path = \`output-{~~appropriate suffix}.md\`
`);
    assert(doc.errors.length === 0, 'Should parse template with semantic');
  });
});

// ============================================================================
// Variable and Type Edge Cases  
// ============================================================================

describe('Variable and Type Edge Cases', () => {
  test('Type with all built-in types', () => {
    const doc = parse(`---
name: test
description: test
---

- $a: $FilePath = "test.md"
- $b: $String = "hello"
- $c: $Number = 42
- $d: $Boolean = true
`);
    assert(doc.errors.length === 0, 'Should parse all built-in types');
  });

  test('Complex lambda with template literal', () => {
    const doc = parse(`---
name: test
description: test
---

- $fn = ($a, $b) => \`result-\${$a}-\${$b}.md\`
`);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assert(vars[0]?.isLambda === true, 'Should be lambda');
  });

  test('Compound type with multiple elements', () => {
    const doc = parse(`---
name: test  
description: test
---

$Tuple = ($Task, $Strategy, $Priority)[]
`);
    const types = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.TypeDefinition => b.kind === 'TypeDefinition')
    );
    assert(types.length === 1, 'Should have type def');
  });

  test('Variable with member access', () => {
    const doc = parse(`---
name: test
description: test
---

IF $item.priority = "high" THEN:
  - Process $item.data.value
`);
    assert(doc.errors.length === 0, 'Should parse member access');
  });

  test('Function call with multiple arguments', () => {
    const doc = parse(`---
name: test
description: test
---

- $result = $fn($a, $b, $c)
`);
    assert(doc.errors.length === 0, 'Should parse function call');
  });
});

// ============================================================================
// Compilation Edge Cases (v0.3 - Validator-First)
// ============================================================================

describe('Compilation Edge Cases', () => {
  test('Compiles document with no types', () => {
    const result = compile(`---
name: no-types
description: Test
---

## Content
Just text
`);
    assert(result.diagnostics.filter(d => d.severity === 'error').length === 0, 'No errors');
  });

  test('Output equals source (validator does not transform)', () => {
    const source = `---
name: test
description: test
---

$Task = a task
- $t: $Task = "test"
Execute [[skill]]
Write to {~~location}
`;
    const result = compile(source, { includeHeader: false });
    // v0.3: Source = Output
    assert(result.output === source, 'Output should equal source');
    assert(result.output.includes('[[skill]]'), 'Should keep raw reference');
    assert(result.output.includes('{~~'), 'Should keep raw semantic');
  });

  test('Source map has correct entry types', () => {
    const result = compile(`---
name: test
description: test
---

$Task = a task
- $t: $Task = "test"
Execute [[skill]]
{~~determine this}
`, { generateSourceMap: true });
    
    const types = new Set(result.sourceMap.map(e => e.type));
    // v0.3 uses 'type-def' not 'type'
    assert(types.has('type-def') || types.has('reference') || types.has('semantic'), 
      'Should have meaningful source map types');
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ Stress Tests - Edge Cases ===\n');

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
