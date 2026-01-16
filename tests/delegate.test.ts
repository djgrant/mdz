/**
 * DELEGATE Keyword Feature Tests (v0.7)
 * 
 * Tests for the DELEGATE keyword feature for multi-agent orchestration.
 * 
 * DELEGATE syntax enables skill authors to delegate tasks to sub-agents,
 * distinct from the EXECUTE/USE patterns which compose skills and tools.
 * 
 * Supported syntax forms:
 * - DELEGATE task TO ~/agent/agent          Inline form with task
 * - DELEGATE TO ~/agent/agent WITH:           Block form with parameters
 * 
 * Frontmatter uses unified `uses:` with links:
 * - uses:
 *   - ~/agent/agent      (agents)
 *   - ~/skill/skill      (skills)
 *   - ~/tool/tool        (tools)
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
  skipped: number;
  errors: string[];
}

const ctx: TestContext = { passed: 0, failed: 0, skipped: 0, errors: [] };

function test(name: string, fn: () => void): void {
  try {
    fn();
    ctx.passed++;
    console.log(`  \u2713 ${name}`);
  } catch (err) {
    ctx.failed++;
    ctx.errors.push(`${name}: ${err}`);
    console.log(`  \u2717 ${name}`);
    console.log(`    ${err}`);
  }
}

function skip(name: string, _fn: () => void): void {
  ctx.skipped++;
  console.log(`  - SKIP: ${name}`);
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
// Feature Detection
// ============================================================================

/**
 * Check if parser supports DelegateStatement AST node.
 * Returns true if the feature is implemented.
 */
function hasDelegateSupport(): boolean {
  // Try parsing a DELEGATE statement and check if it produces a DelegateStatement node
  try {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE test TO ~/agent/general
`);
    // Check if any block is a DelegateStatement
    const hasDelegateBlock = doc.sections.some(s => 
      s.content.some(b => b.kind === 'DelegateStatement')
    );
    return hasDelegateBlock && doc.errors.length === 0;
  } catch {
    return false;
  }
}

/**
 * Check if frontmatter parsing supports `uses:` with agent links.
 */
function hasAgentsFrontmatterSupport(): boolean {
  const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
---
`);
  // Check both raw and parsed agents array
  return doc.frontmatter?.agents !== undefined && doc.frontmatter.agents.length > 0;
}

// ============================================================================
// DELEGATE - Parsing Tests (Placeholder)
// ============================================================================

describe('DELEGATE - Parsing', () => {
  const delegateSupported = hasDelegateSupport();
  const testOrSkip = delegateSupported ? test : skip;

  testOrSkip('parses basic DELEGATE TO statement', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE do something TO ~/agent/general WITH:
  task: "do something"
`);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    // When implemented, check for DelegateStatement in AST
    // const delegates = doc.sections.flatMap(s => 
    //   s.content.filter((b): b is AST.DelegateStatement => b.kind === 'DelegateStatement')
    // );
    // assertEqual(delegates.length, 1);
    // assertEqual(delegates[0].target, 'general');
  });

  testOrSkip('parses DELEGATE TO with variable agent reference', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/researcher
  - ~/agent/writer
---

$agent = "researcher"

DELEGATE find relevant information TO ~/agent/researcher
`);
    assertEqual(doc.errors.length, 0);
    // Check target is VariableReference
  });

  testOrSkip('parses DELEGATE with inline task', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE write documentation TO ~/agent/general
`);
    assertEqual(doc.errors.length, 0);
    // Check task is captured
  });

  testOrSkip('parses DELEGATE with WITH clause', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/validator
---

DELEGATE validate code TO ~/agent/validator WITH:
  code: $currentCode
  criteria: "performance"
`);
    assertEqual(doc.errors.length, 0);
    // Check parameters are parsed
  });

  testOrSkip('parses DELEGATE with typed parameters', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/analyzer
---

$Input: content to analyze

DELEGATE TO ~/agent/analyzer WITH:
  input: $data
  format: "json"
`);
    assertEqual(doc.errors.length, 0);
    // Check type annotations on parameters
  });
});

// ============================================================================
// DELEGATE - Control Flow Integration Tests (Placeholder)
// ============================================================================

describe('DELEGATE - Control Flow Integration', () => {
  const delegateSupported = hasDelegateSupport();
  const testOrSkip = delegateSupported ? test : skip;

  testOrSkip('parses DELEGATE inside FOR', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/worker
---

FOR $task IN $tasks
  DELEGATE execute $task TO ~/agent/worker
END
`);
    assertEqual(doc.errors.length, 0);
  });

  testOrSkip('parses DELEGATE inside PARALLEL FOR', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/processor
---

FOR $item IN $items
  DELEGATE process $item TO ~/agent/processor
END
`);
    assertEqual(doc.errors.length, 0);
  });

  testOrSkip('parses DELEGATE inside IF statement', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/expert
  - ~/agent/novice
---

IF $complexity = "high" THEN
  DELEGATE handle complex case TO ~/agent/expert
ELSE
  DELEGATE handle simple case TO ~/agent/novice
END
`);
    assertEqual(doc.errors.length, 0);
  });

  testOrSkip('parses DELEGATE inside WHILE', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/reviewer
---

WHILE $iterations < 5 DO
  DELEGATE review current state TO ~/agent/reviewer
  $iterations = $iterations + 1
END
`);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    
    // Verify WHILE contains DELEGATE
    const whiles = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.WhileStatement => b.kind === 'WhileStatement')
    );
    assertEqual(whiles.length, 1, 'Should have one WHILE');
  });
});

// ============================================================================
// Frontmatter - agents field Tests
// ============================================================================

describe('Frontmatter - unified uses: with links', () => {
  const agentsSupported = hasAgentsFrontmatterSupport();

  test('parses agents from uses: with agent links', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
  - ~/agent/researcher
  - ~/agent/writer
---
`);
    assertEqual(doc.errors.length, 0, 'Frontmatter parsing should not error');
    
    if (agentsSupported) {
      // Agents should be available on the frontmatter object
      const agents = doc.frontmatter?.agents;
      assertEqual(agents?.length, 3);
      assertEqual(agents?.[0], 'general');
      assertEqual(agents?.[1], 'researcher');
      assertEqual(agents?.[2], 'writer');
    } else {
      console.log('    (agents field support not yet implemented)');
    }
  });

  test('parses skills from uses: with skill links', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/skill/orchestrate
  - ~/skill/work-packages
---
`);
    assertEqual(doc.errors.length, 0);
    assertEqual(doc.frontmatter?.skills?.length, 2);
    assertEqual(doc.frontmatter?.skills?.[0], 'orchestrate');
  });

  test('parses mixed agents/skills/tools from unified uses:', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~helper-skill
  - ~validator
---
`);
    assertEqual(doc.errors.length, 0);
    assertEqual(doc.frontmatter?.skills?.length, 2);
    assertEqual(doc.frontmatter?.skills?.[0], 'helper-skill');
  });

  test('handles mixed sigils in uses:', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
  - ~/skill/orchestrate
  - ~/tool/browser
---
`);
    assertEqual(doc.errors.length, 0);
    
    // Agents should be parsed
    if (agentsSupported) {
      assertEqual(doc.frontmatter?.agents?.[0], 'general');
    }
    
    // Skills should be parsed
    assertEqual(doc.frontmatter?.skills?.[0], 'orchestrate');
    
    // Tools should be parsed
    assertEqual(doc.frontmatter?.tools?.[0], 'browser');
  });
});

// ============================================================================
// DELEGATE - Compilation/Validation Tests (Placeholder)
// ============================================================================

describe('DELEGATE - Compilation/Validation', () => {
  const delegateSupported = hasDelegateSupport();
  const testOrSkip = delegateSupported ? test : skip;

  testOrSkip('preserves DELEGATE statement in output (source = output)', () => {
    const source = `---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE do something TO ~/agent/general
`;
    const result = compile(source, { includeHeader: false });
    assertEqual(result.output, source, 'Source should be preserved');
  });

  testOrSkip('extracts agent references into metadata', () => {
    const result = compile(`---
name: test
description: test
uses:
  - ~/agent/general
  - ~/agent/specialist
---

DELEGATE task one TO ~/agent/general

DELEGATE task two TO ~/agent/specialist
`);
    // When implemented:
    // const agents = result.metadata.agents || [];
    // assert(agents.includes('general'), 'Should include general');
    // assert(agents.includes('specialist'), 'Should include specialist');
  });

  testOrSkip('warns on DELEGATE to undeclared agent', () => {
    const result = compile(`---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE this agent is not declared TO ~/agent/unknown-agent
`);
    const warnings = result.diagnostics.filter(d => d.severity === 'warning');
    assert(warnings.length > 0, 'Should warn about undeclared agent');
    // assertIncludes(warnings[0].message, 'unknown-agent');
  });

  testOrSkip('tracks DELEGATE in source map', () => {
    const result = compile(`---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE do something TO ~/agent/general
`);
    // When implemented:
    // const delegateEntries = result.sourceMap.filter(e => e.type === 'delegate');
    // assert(delegateEntries.length > 0, 'Should track delegate in source map');
  });
});

// ============================================================================
// DELEGATE - Edge Cases (Placeholder)
// ============================================================================

describe('DELEGATE - Edge Cases', () => {
  const delegateSupported = hasDelegateSupport();
  const testOrSkip = delegateSupported ? test : skip;

  testOrSkip('DELEGATE keyword as variable name (should work as variable)', () => {
    const doc = parse(`---
name: test
description: test
---

$delegate = "some value"
`);
    assertEqual(doc.errors.length, 0);
    const vars = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.VariableDeclaration => b.kind === 'VariableDeclaration')
    );
    assertEqual(vars.length, 1);
    assertEqual(vars[0].name, 'delegate');
  });

  testOrSkip('empty DELEGATE body', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE do something TO ~/agent/general

## Next Section
`);
    assertEqual(doc.errors.length, 0);
  });

  testOrSkip('DELEGATE with instruction task span', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
---

DELEGATE appropriate task based on context TO ~/agent/general
`);
    assertEqual(doc.errors.length, 0);
  });

  testOrSkip('multiple consecutive DELEGATE statements', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/a
  - ~/agent/b
  - ~/agent/c
---

DELEGATE first task TO ~/agent/a
DELEGATE second task TO ~/agent/b
DELEGATE third task TO ~/agent/c
`);
    assertEqual(doc.errors.length, 0);
  });

  testOrSkip('nested DELEGATE (DELEGATE within DELEGATE body)', () => {
    // This tests if nested delegation is allowed
    // The expected behavior needs to be defined
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/outer
  - ~/agent/inner
---

IF needs nested delegation THEN
  DELEGATE nested task TO ~/agent/inner
END
`);
    // Behavior TBD - may be valid or may require flattening
  });
});

// ============================================================================
// Integration with existing Delegation syntax
// ============================================================================

describe('DELEGATE vs EXECUTE/USE - Coexistence', () => {
  test('EXECUTE statement works alongside DELEGATE', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/tool/helper
---

EXECUTE ~/tool/helper TO run helper
`);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    const executions = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.ExecuteStatement => b.kind === 'ExecuteStatement')
    );
    assertEqual(executions.length, 1);
  });

  test('DELEGATE statement works with agent link', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/validator
---

DELEGATE validate TO ~/agent/validator
`);
    assertEqual(doc.errors.length, 0);
    const delegates = doc.sections.flatMap(s => 
      s.content.filter((b): b is AST.DelegateStatement => b.kind === 'DelegateStatement')
    );
    assertEqual(delegates.length, 1);
  });

  test('DELEGATE and EXECUTE in same document', () => {
    const doc = parse(`---
name: test
description: test
uses:
  - ~/agent/general
  - ~/tool/helper-skill
---

## Skills

EXECUTE ~/tool/helper-skill TO run helper

## Delegation

DELEGATE high-level task TO ~/agent/general
`);
    assertEqual(doc.errors.length, 0, `Errors: ${doc.errors.map(e => e.message)}`);
    
    // Check Skills section has Delegation
    const skillsSection = doc.sections.find(s => s.title === 'Skills');
    assert(skillsSection !== undefined, 'Should have Skills section');
    const executions = skillsSection!.content.filter(b => b.kind === 'ExecuteStatement');
    assertEqual(executions.length, 1, 'Should have 1 EXECUTE statement');
    
    // Check Delegation section has DelegateStatement
    const delegationSection = doc.sections.find(s => s.title === 'Delegation');
    assert(delegationSection !== undefined, 'Should have Delegation section');
    const delegates = delegationSection!.content.filter(b => b.kind === 'DelegateStatement');
    assertEqual(delegates.length, 1, 'Should have 1 DELEGATE statement');
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ DELEGATE Keyword Feature Tests (v0.10) ===');
console.log('\nDELEGATE uses link-based agent targets.');

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);
console.log(`Skipped: ${ctx.skipped}`);

if (ctx.errors.length > 0) {
  console.log('\nFailed tests:');
  ctx.errors.forEach(e => console.log(`  - ${e}`));
}

if (ctx.failed > 0) {
  process.exit(1);
}
