/**
 * Zen Parser - Minimal Syntax (Direction A)
 * 
 * Aligned with language-spec.md v0.1
 * 
 * Parses:
 * - YAML frontmatter
 * - Type definitions ($TypeName = ...)
 * - Variable declarations ($name: $Type = value)
 * - Variable references ($name)
 * - Skill references ([[skill]])
 * - Section references ([[#section]] or [[skill#section]])
 * - Semantic markers ({~~content})
 * - Control flow (FOR EACH, WHILE, IF THEN ELSE)
 * - Lambda expressions ($fn = $x => ...)
 */

// ============================================================================
// Types
// ============================================================================

export interface Position {
  line: number;
  column: number;
}

export interface Span {
  start: Position;
  end: Position;
}

export interface Frontmatter {
  name: string;
  description: string;
  uses?: string[];
  [key: string]: unknown;
}

export interface TypeDefinition {
  name: string;
  definition: string;
  isEnum: boolean;
  enumValues?: string[];
  span: Span;
}

export interface VariableDeclaration {
  name: string;
  type?: string;
  value?: string;
  isLambda: boolean;
  lambdaParams?: string[];
  span: Span;
}

export interface SkillReference {
  skill: string;
  section?: string;
  span: Span;
}

export interface SemanticMarker {
  content: string;
  span: Span;
}

export interface ControlFlow {
  kind: 'FOR_EACH' | 'WHILE' | 'IF_THEN' | 'ELSE';
  pattern?: string;       // FOR EACH pattern
  collection?: string;    // FOR EACH collection
  condition?: string;     // WHILE/IF condition
  span: Span;
}

export interface ParseResult {
  frontmatter: Frontmatter | null;
  types: TypeDefinition[];
  variables: VariableDeclaration[];
  references: SkillReference[];
  semanticMarkers: SemanticMarker[];
  controlFlow: ControlFlow[];
  sections: Array<{ name: string; anchor: string; level: number; span: Span }>;
  errors: Array<{ message: string; span: Span }>;
}

// ============================================================================
// Parser
// ============================================================================

export function parse(source: string): ParseResult {
  const result: ParseResult = {
    frontmatter: null,
    types: [],
    variables: [],
    references: [],
    semanticMarkers: [],
    controlFlow: [],
    sections: [],
    errors: []
  };

  const lines = source.split('\n');
  let inFrontmatter = false;
  let frontmatterContent = '';
  let frontmatterStart = 0;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const lineIndex = lineNum + 1; // 1-based for user display

    // ========================================================================
    // Frontmatter
    // ========================================================================
    if (line === '---' && lineNum === 0) {
      inFrontmatter = true;
      frontmatterStart = lineNum;
      continue;
    }
    if (line === '---' && inFrontmatter) {
      inFrontmatter = false;
      result.frontmatter = parseFrontmatter(frontmatterContent);
      continue;
    }
    if (inFrontmatter) {
      frontmatterContent += line + '\n';
      continue;
    }

    // ========================================================================
    // Sections (headings)
    // ========================================================================
    const sectionMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (sectionMatch) {
      const level = sectionMatch[1].length;
      const name = sectionMatch[2];
      const anchor = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      result.sections.push({
        name,
        anchor,
        level,
        span: { start: { line: lineIndex, column: 0 }, end: { line: lineIndex, column: line.length } }
      });
    }

    // ========================================================================
    // Type definitions: $TypeName = definition
    // ========================================================================
    const typeMatch = line.match(/^\$([A-Z][a-zA-Z0-9]*)\s*=\s*(.+)$/);
    if (typeMatch) {
      const name = typeMatch[1];
      const definition = typeMatch[2];
      const isEnum = definition.includes('|') && definition.split('|').every(p => p.trim().startsWith('"'));
      const enumValues = isEnum 
        ? definition.split('|').map(p => p.trim().replace(/"/g, ''))
        : undefined;
      
      result.types.push({
        name,
        definition,
        isEnum,
        enumValues,
        span: { start: { line: lineIndex, column: 0 }, end: { line: lineIndex, column: line.length } }
      });
      continue;
    }

    // ========================================================================
    // Lambda expressions: $name = $param => expression
    // ========================================================================
    const lambdaMatch = line.match(/^\s*-?\s*\$(\w+)\s*=\s*(\$\w+|\([^)]+\))\s*=>\s*(.+)$/);
    if (lambdaMatch) {
      const name = lambdaMatch[1];
      const paramsRaw = lambdaMatch[2];
      const value = lambdaMatch[3];
      const lambdaParams = paramsRaw.startsWith('(')
        ? paramsRaw.slice(1, -1).split(',').map(p => p.trim().replace(/^\$/, ''))
        : [paramsRaw.replace(/^\$/, '')];
      
      result.variables.push({
        name,
        value,
        isLambda: true,
        lambdaParams,
        span: { start: { line: lineIndex, column: 0 }, end: { line: lineIndex, column: line.length } }
      });
      continue;
    }

    // ========================================================================
    // Variable declarations: - $name: $Type = value  OR  $name = value
    // ========================================================================
    const varMatch = line.match(/^\s*-?\s*\$(\w+)(?::\s*\$?(\w+))?\s*=\s*(.+)$/);
    if (varMatch && !typeMatch && !lambdaMatch) {
      result.variables.push({
        name: varMatch[1],
        type: varMatch[2],
        value: varMatch[3],
        isLambda: false,
        span: { start: { line: lineIndex, column: 0 }, end: { line: lineIndex, column: line.length } }
      });
    }

    // ========================================================================
    // Skill and section references: [[skill]], [[skill#section]], [[#section]]
    // ========================================================================
    const refMatches = line.matchAll(/\[\[([^\]#]+)?(?:#([^\]]+))?\]\]/g);
    for (const match of refMatches) {
      const skill = match[1]?.trim() || '';
      const section = match[2]?.trim();
      result.references.push({
        skill,
        section,
        span: {
          start: { line: lineIndex, column: match.index! },
          end: { line: lineIndex, column: match.index! + match[0].length }
        }
      });
    }

    // ========================================================================
    // Semantic markers: {~~content}
    // ========================================================================
    const semanticMatches = line.matchAll(/\{~~([^}]+)\}/g);
    for (const match of semanticMatches) {
      result.semanticMarkers.push({
        content: match[1],
        span: {
          start: { line: lineIndex, column: match.index! },
          end: { line: lineIndex, column: match.index! + match[0].length }
        }
      });
    }

    // ========================================================================
    // Control flow: FOR EACH
    // ========================================================================
    const forEachMatch = line.match(/FOR EACH\s+(.+?)\s+IN\s+(.+?):/);
    if (forEachMatch) {
      result.controlFlow.push({
        kind: 'FOR_EACH',
        pattern: forEachMatch[1],
        collection: forEachMatch[2],
        span: { start: { line: lineIndex, column: line.indexOf('FOR') }, end: { line: lineIndex, column: line.length } }
      });
    }

    // ========================================================================
    // Control flow: WHILE
    // ========================================================================
    const whileMatch = line.match(/WHILE\s*\((.+)\):/);
    if (whileMatch) {
      result.controlFlow.push({
        kind: 'WHILE',
        condition: whileMatch[1],
        span: { start: { line: lineIndex, column: line.indexOf('WHILE') }, end: { line: lineIndex, column: line.length } }
      });
    }

    // ========================================================================
    // Control flow: IF THEN
    // ========================================================================
    const ifMatch = line.match(/IF\s+(.+?)\s+THEN:/);
    if (ifMatch) {
      result.controlFlow.push({
        kind: 'IF_THEN',
        condition: ifMatch[1],
        span: { start: { line: lineIndex, column: line.indexOf('IF') }, end: { line: lineIndex, column: line.length } }
      });
    }

    // ========================================================================
    // Control flow: ELSE
    // ========================================================================
    if (/^\s*ELSE:/.test(line)) {
      result.controlFlow.push({
        kind: 'ELSE',
        span: { start: { line: lineIndex, column: line.indexOf('ELSE') }, end: { line: lineIndex, column: line.length } }
      });
    }
  }

  return result;
}

// ============================================================================
// Frontmatter Parser
// ============================================================================

function parseFrontmatter(content: string): Frontmatter {
  const result: Frontmatter = { name: '', description: '' };
  const lines = content.split('\n');
  let currentKey = '';
  let inArray = false;

  for (const line of lines) {
    // Key: value
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2];
      if (value) {
        result[currentKey] = value;
      } else {
        // Might be start of array
        inArray = true;
        result[currentKey] = [];
      }
      continue;
    }
    
    // Array item
    const arrayMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayMatch && inArray && Array.isArray(result[currentKey])) {
      (result[currentKey] as string[]).push(arrayMatch[1]);
    }
  }

  return result;
}

// ============================================================================
// Exports for tooling
// ============================================================================

export function getDefinitions(result: ParseResult) {
  const defs: Array<{ type: string; name: string; span: Span }> = [];
  
  result.types.forEach(t => defs.push({ type: 'type', name: t.name, span: t.span }));
  result.variables.forEach(v => defs.push({ type: 'variable', name: v.name, span: v.span }));
  result.sections.forEach(s => defs.push({ type: 'section', name: s.anchor, span: s.span }));
  
  return defs;
}

export function getReferences(result: ParseResult) {
  return result.references.map(r => ({
    type: r.section ? 'section' : 'skill',
    name: r.section || r.skill,
    span: r.span
  }));
}

// ============================================================================
// Test
// ============================================================================

if (typeof require !== 'undefined' && require.main === module) {
  const testSource = `---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution
uses:
  - work-packages
  - orchestrate
---

## Types

$Task = any task that an agent can execute
$Strategy = "accumulate" | "independent"
$ValidationResult = "progress" | "regression" | "plateau"

## Input

- $transforms: ($Task, $Strategy)[]
- $validator: $Task
- $return: $Task

## Context

- $SolutionPath = $n => \`{~~relevant wp path}-candidate-{$n}.md\`
- $current: $FilePath = $SolutionPath(0)
- $next: $FilePath = $SolutionPath(1)

## Workflow

1. Create master work package at {~~appropriate location}

2. FOR EACH ($task, $strategy) IN $transforms:
   - Delegate to [[#iteration-manager]] with $task and $strategy
   
3. WHILE (not diminishing returns AND $iterations < 5):
   - Execute iteration
   - IF $result = "progress" THEN:
     - Update $current
   - ELSE:
     - Try different approach

4. Return findings to [[simplify#report]]
`;

  const result = parse(testSource);
  
  console.log('=== Zen Parser Test ===\n');
  
  console.log('Frontmatter:');
  console.log('  name:', result.frontmatter?.name);
  console.log('  description:', result.frontmatter?.description);
  console.log('  uses:', result.frontmatter?.uses);
  
  console.log('\nTypes:');
  result.types.forEach(t => {
    console.log(`  $${t.name} = ${t.definition}`);
    if (t.isEnum) console.log(`    (enum: ${t.enumValues?.join(', ')})`);
  });
  
  console.log('\nVariables:');
  result.variables.forEach(v => {
    if (v.isLambda) {
      console.log(`  $${v.name} = (${v.lambdaParams?.join(', ')}) => ${v.value}`);
    } else {
      console.log(`  $${v.name}: ${v.type || 'untyped'} = ${v.value}`);
    }
  });
  
  console.log('\nReferences:');
  result.references.forEach(r => {
    const target = r.section ? `${r.skill}#${r.section}` : r.skill;
    console.log(`  [[${target}]] at line ${r.span.start.line}`);
  });
  
  console.log('\nSemantic Markers:');
  result.semanticMarkers.forEach(s => {
    console.log(`  {~~${s.content}} at line ${s.span.start.line}`);
  });
  
  console.log('\nControl Flow:');
  result.controlFlow.forEach(c => {
    if (c.kind === 'FOR_EACH') {
      console.log(`  FOR EACH ${c.pattern} IN ${c.collection} (line ${c.span.start.line})`);
    } else if (c.kind === 'WHILE') {
      console.log(`  WHILE (${c.condition}) (line ${c.span.start.line})`);
    } else if (c.kind === 'IF_THEN') {
      console.log(`  IF ${c.condition} THEN (line ${c.span.start.line})`);
    } else {
      console.log(`  ELSE (line ${c.span.start.line})`);
    }
  });
  
  console.log('\nSections:');
  result.sections.forEach(s => {
    console.log(`  ${'#'.repeat(s.level)} ${s.name} -> #${s.anchor}`);
  });
  
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(e => console.log(`  ${e.message} at line ${e.span.start.line}`));
  }
}
