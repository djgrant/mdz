/**
 * Zen Compiler
 * 
 * Aligned with language-spec.md v0.1
 * 
 * Implements the two-layer model:
 * - Source format: Human-authored with references, types, semantic markers
 * - Compiled format: Flattened for LLM consumption
 * 
 * Compilation transformations:
 * 1. Type expansion: $Task -> Task (definition)
 * 2. Reference resolution: [[skill]] -> [skill] or inlined content
 * 3. Semantic marker transformation: {~~x} -> (determine: x)
 * 4. Variable interpolation in semantic markers
 */

import { parse, ParseResult } from './parser-minimal';

// ============================================================================
// Types
// ============================================================================

export interface CompileOptions {
  expandTypes: boolean;          // Expand $TypeName to include definitions
  resolveReferences: boolean;    // Convert [[ref]] to [ref]
  transformSemantics: boolean;   // Convert {~~x} to (determine: x)
  inlineSkills: boolean;         // Inline skill content (requires registry)
  generateSourceMap: boolean;    // Generate source map for debugging
}

export interface SourceMapEntry {
  sourceStart: { line: number; column: number };
  sourceEnd: { line: number; column: number };
  compiledStart: { line: number; column: number };
  compiledEnd: { line: number; column: number };
}

export interface CompileResult {
  compiled: string;
  sourceMap: SourceMapEntry[];
  stats: {
    sourceLength: number;
    compiledLength: number;
    expansionRatio: number;
    typesExpanded: number;
    referencesResolved: number;
    semanticMarkersTransformed: number;
  };
}

export interface SkillRegistry {
  get(name: string): { name: string; content: string } | undefined;
  getSection(name: string, section: string): string | undefined;
}

// ============================================================================
// Default Skill Registry
// ============================================================================

const defaultRegistry: SkillRegistry = {
  get(name: string) {
    // In a real implementation, this would load from filesystem
    return undefined;
  },
  getSection(name: string, section: string) {
    return undefined;
  }
};

// ============================================================================
// Compiler
// ============================================================================

export function compile(
  source: string,
  options: Partial<CompileOptions> = {},
  registry: SkillRegistry = defaultRegistry
): CompileResult {
  const opts: CompileOptions = {
    expandTypes: true,
    resolveReferences: true,
    transformSemantics: true,
    inlineSkills: false,
    generateSourceMap: false,
    ...options
  };

  // Parse the source
  const parsed = parse(source);
  
  let compiled = source;
  const sourceMap: SourceMapEntry[] = [];
  let typesExpanded = 0;
  let referencesResolved = 0;
  let semanticMarkersTransformed = 0;

  // Build type map for expansion
  const typeMap: Record<string, string> = {};
  for (const type of parsed.types) {
    typeMap[type.name] = type.definition;
  }

  // ========================================================================
  // 1. Type Expansion
  // ========================================================================
  if (opts.expandTypes) {
    for (const [name, definition] of Object.entries(typeMap)) {
      // Match $TypeName that's not part of a definition line
      const typeRefPattern = new RegExp(`\\$${name}(?![\\w])(?!\\s*=)`, 'g');
      const matches = compiled.matchAll(typeRefPattern);
      
      for (const match of matches) {
        const expanded = `${name} (${definition})`;
        compiled = compiled.slice(0, match.index!) + expanded + compiled.slice(match.index! + match[0].length);
        typesExpanded++;
      }
    }
  }

  // ========================================================================
  // 2. Reference Resolution
  // ========================================================================
  if (opts.resolveReferences) {
    // [[skill#section]] or [[skill]] or [[#section]]
    compiled = compiled.replace(/\[\[([^\]#]*)?(?:#([^\]]+))?\]\]/g, (match, skill, section) => {
      referencesResolved++;
      
      if (opts.inlineSkills && skill) {
        // Try to inline the referenced content
        if (section) {
          const content = registry.getSection(skill, section);
          if (content) return content;
        } else {
          const skillDef = registry.get(skill);
          if (skillDef) return skillDef.content;
        }
      }
      
      // Fallback: convert to bracket format
      if (section && !skill) {
        return `[#${section}]`;
      } else if (section) {
        return `[${skill}#${section}]`;
      } else {
        return `[${skill}]`;
      }
    });
  }

  // ========================================================================
  // 3. Semantic Marker Transformation
  // ========================================================================
  if (opts.transformSemantics) {
    compiled = compiled.replace(/\{~~([^}]+)\}/g, (match, content) => {
      semanticMarkersTransformed++;
      return `(determine: ${content})`;
    });
  }

  // ========================================================================
  // 4. Add Compiled Header
  // ========================================================================
  const header = generateHeader(parsed, opts);
  compiled = header + compiled;

  // ========================================================================
  // Build Result
  // ========================================================================
  return {
    compiled,
    sourceMap,
    stats: {
      sourceLength: source.length,
      compiledLength: compiled.length,
      expansionRatio: compiled.length / source.length,
      typesExpanded,
      referencesResolved,
      semanticMarkersTransformed
    }
  };
}

// ============================================================================
// Header Generation
// ============================================================================

function generateHeader(parsed: ParseResult, opts: CompileOptions): string {
  const name = parsed.frontmatter?.name || 'unknown';
  const timestamp = new Date().toISOString();
  
  return `<!-- Compiled Zen Skill: ${name} -->
<!-- Generated: ${timestamp} -->
<!-- Options: expandTypes=${opts.expandTypes}, resolveReferences=${opts.resolveReferences}, transformSemantics=${opts.transformSemantics} -->

`;
}

// ============================================================================
// Utility: Compile with Custom Registry
// ============================================================================

export function createRegistry(skills: Record<string, string>): SkillRegistry {
  // Parse each skill to extract sections
  const parsed: Record<string, ParseResult> = {};
  for (const [name, content] of Object.entries(skills)) {
    parsed[name] = parse(content);
  }
  
  return {
    get(name: string) {
      if (skills[name]) {
        return { name, content: skills[name] };
      }
      return undefined;
    },
    getSection(skillName: string, sectionName: string) {
      const skill = parsed[skillName];
      if (!skill) return undefined;
      
      const section = skill.sections.find(s => s.anchor === sectionName);
      if (!section) return undefined;
      
      // Extract section content (simplified: just the heading)
      // A real implementation would extract content until next heading
      return `[Section: ${section.name}]`;
    }
  };
}

// ============================================================================
// Test
// ============================================================================

if (typeof require !== 'undefined' && require.main === module) {
  const testSource = `---
name: simplify
description: Simplify a solution while preserving its essence
uses:
  - orchestrate-map-reduce
---

## Types

$EssenceCriteria = what must be preserved when simplifying
$ValidationResult = "progress" | "regression" | "plateau"

## Input

- $target: what to simplify
- $essence: $EssenceCriteria

## Workflow

1. Identify aspects of $target that can be simplified
2. Define validation: {~~a check that essence is preserved}
3. Execute [[orchestrate-map-reduce]] with:
   - validator: [[#validate-essence]]
4. Report findings

## Validate Essence

Check if $result satisfies $essence criteria.
Return: $ValidationResult
`;

  console.log('=== Zen Compiler Test ===\n');
  
  console.log('=== Source ===\n');
  console.log(testSource);
  
  console.log('\n=== Compiled ===\n');
  const result = compile(testSource);
  console.log(result.compiled);
  
  console.log('\n=== Stats ===');
  console.log(`Source length: ${result.stats.sourceLength} chars`);
  console.log(`Compiled length: ${result.stats.compiledLength} chars`);
  console.log(`Expansion ratio: ${(result.stats.expansionRatio * 100).toFixed(0)}%`);
  console.log(`Types expanded: ${result.stats.typesExpanded}`);
  console.log(`References resolved: ${result.stats.referencesResolved}`);
  console.log(`Semantic markers transformed: ${result.stats.semanticMarkersTransformed}`);
  
  // Test with skill inlining
  console.log('\n=== Compiled with Skill Registry ===\n');
  const registry = createRegistry({
    'orchestrate-map-reduce': `---
name: orchestrate-map-reduce
---

## Map-Reduce Workflow

1. Fan out to multiple agents
2. Collect and validate results
3. Return best solution
`
  });
  
  const resultWithRegistry = compile(testSource, { inlineSkills: true }, registry);
  console.log(resultWithRegistry.compiled);
}
