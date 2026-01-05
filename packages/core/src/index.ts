/**
 * MDZ (ZenMarkdown)
 * 
 * A markdown extension language for multi-agent systems.
 * 
 * @example
 * ```typescript
 * import { parse, compile } from 'zenmarkdown';
 * 
 * const source = `---
 * name: my-skill
 * description: My skill
 * ---
 * 
 * ## Workflow
 * 
 * 1. Do something
 * `;
 * 
 * // Parse to AST
 * const ast = parse(source);
 * 
 * // Compile to LLM-ready format (validates without transforming)
 * const result = compile(source);
 * console.log(result.output);  // source unchanged
 * console.log(result.metadata); // extracted metadata
 * console.log(result.dependencies); // dependency graph
 * ```
 */

// Parser
export { parse } from './parser/parser';
export { tokenize, Lexer, Token, TokenType } from './parser/lexer';
export * as AST from './parser/ast';

// Compiler (v0.3 - validator-first)
export { 
  compile, 
  Compiler,
  createRegistry,
  buildFullDependencyGraph,
  CompileOptions,
  CompileResult,
  SkillRegistry,
  SourceMapEntry,
  Diagnostic,
  DocumentMetadata,
  TypeInfo,
  VariableInfo,
  ReferenceInfo,
  SectionInfo,
  DependencyGraph,
  DependencyEdge,
} from './compiler/compiler';
