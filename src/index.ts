/**
 * Zen Language
 * 
 * A markdown extension language for multi-agent systems.
 * 
 * @example
 * ```typescript
 * import { parse, compile } from 'zen-lang';
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
 * // Compile to LLM-ready format
 * const result = compile(source);
 * console.log(result.output);
 * ```
 */

// Parser
export { parse } from './parser/parser';
export { tokenize, Lexer, Token, TokenType } from './parser/lexer';
export * as AST from './parser/ast';

// Compiler
export { 
  compile, 
  Compiler,
  createRegistry,
  CompileOptions,
  CompileResult,
  SkillRegistry,
  SourceMapEntry,
  Diagnostic,
  CompileStats,
} from './compiler/compiler';
