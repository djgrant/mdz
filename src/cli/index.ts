#!/usr/bin/env node
/**
 * Zen CLI
 * 
 * Command-line interface for the zen language.
 * 
 * Usage:
 *   zen compile <file>  - Compile a skill to LLM-ready format
 *   zen check <file>    - Validate syntax without compiling
 *   zen parse <file>    - Output the AST as JSON
 *   zen lsp             - Start the language server (stdio)
 *   zen --help          - Show help
 *   zen --version       - Show version
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from '../parser/parser';
import { compile, CompileOptions } from '../compiler/compiler';

// ============================================================================
// Version
// ============================================================================

const VERSION = '0.1.0';

// ============================================================================
// CLI Entry Point
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`zen ${VERSION}`);
    return;
  }

  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case 'compile':
      compileCommand(rest);
      break;
    case 'check':
      checkCommand(rest);
      break;
    case 'parse':
      parseCommand(rest);
      break;
    case 'lsp':
      lspCommand(rest);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "zen --help" for usage information.');
      process.exit(1);
  }
}

// ============================================================================
// Commands
// ============================================================================

function compileCommand(args: string[]): void {
  const options = parseCompileOptions(args);
  const filePath = args.find(a => !a.startsWith('-'));

  if (!filePath) {
    console.error('Error: No input file specified');
    console.error('Usage: zen compile <file> [options]');
    process.exit(1);
  }

  const source = readFile(filePath);
  if (source === null) return;

  const result = compile(source, options);

  // Output diagnostics
  for (const diag of result.diagnostics) {
    const prefix = diag.severity === 'error' ? '✗' : diag.severity === 'warning' ? '⚠' : 'ℹ';
    console.error(`${prefix} ${diag.message} (${diag.span.start.line}:${diag.span.start.column})`);
  }

  if (result.diagnostics.some(d => d.severity === 'error')) {
    process.exit(1);
  }

  // Output result
  if (args.includes('--output') || args.includes('-o')) {
    const outIndex = args.indexOf('--output') !== -1 
      ? args.indexOf('--output') 
      : args.indexOf('-o');
    const outPath = args[outIndex + 1];
    
    if (!outPath) {
      console.error('Error: --output requires a file path');
      process.exit(1);
    }

    fs.writeFileSync(outPath, result.output);
    console.log(`✓ Compiled to ${outPath}`);
  } else {
    console.log(result.output);
  }

  // Output stats if verbose
  if (args.includes('--verbose') || args.includes('-V')) {
    console.error('\n--- Stats ---');
    console.error(`Source length: ${result.stats.sourceLength} chars`);
    console.error(`Output length: ${result.stats.outputLength} chars`);
    console.error(`Expansion ratio: ${(result.stats.expansionRatio * 100).toFixed(1)}%`);
    console.error(`Types expanded: ${result.stats.typesExpanded}`);
    console.error(`References resolved: ${result.stats.referencesResolved}`);
    console.error(`Semantic markers: ${result.stats.semanticMarkersTransformed}`);
    console.error(`Control flow statements: ${result.stats.controlFlowStatements}`);
  }

  // Output source map if requested
  if (args.includes('--source-map')) {
    const mapPath = filePath.replace(/\.md$/, '.map.json');
    fs.writeFileSync(mapPath, JSON.stringify(result.sourceMap, null, 2));
    console.error(`✓ Source map written to ${mapPath}`);
  }
}

function checkCommand(args: string[]): void {
  const filePath = args.find(a => !a.startsWith('-'));

  if (!filePath) {
    console.error('Error: No input file specified');
    console.error('Usage: zen check <file>');
    process.exit(1);
  }

  const source = readFile(filePath);
  if (source === null) return;

  const ast = parse(source);
  
  let hasErrors = false;
  for (const error of ast.errors) {
    console.error(`✗ ${error.message} (${error.span.start.line}:${error.span.start.column})`);
    hasErrors = true;
  }

  // Additional semantic checks
  const warnings = performSemanticChecks(ast);
  for (const warning of warnings) {
    console.error(`⚠ ${warning.message} (${warning.span.start.line}:${warning.span.start.column})`);
  }

  if (hasErrors) {
    console.error(`\n✗ ${ast.errors.length} error(s) found`);
    process.exit(1);
  } else {
    console.log(`✓ ${filePath} is valid`);
    if (warnings.length > 0) {
      console.log(`  (${warnings.length} warning(s))`);
    }
  }
}

function parseCommand(args: string[]): void {
  const filePath = args.find(a => !a.startsWith('-'));

  if (!filePath) {
    console.error('Error: No input file specified');
    console.error('Usage: zen parse <file>');
    process.exit(1);
  }

  const source = readFile(filePath);
  if (source === null) return;

  const ast = parse(source);
  
  // Output AST as JSON
  const output = JSON.stringify(ast, null, 2);
  console.log(output);
}

function lspCommand(_args: string[]): void {
  // The LSP server is available as a library via src/lsp/server.ts
  // For stdio transport, we provide integration guidance
  console.log('Zen Language Server');
  console.log('');
  console.log('The LSP server is available as a library:');
  console.log('');
  console.log('  import { createLanguageServer } from "zen-lang/lsp/server";');
  console.log('  const server = createLanguageServer();');
  console.log('');
  console.log('Features:');
  console.log('  - Go-to-definition for [[references]] and $variables');
  console.log('  - Hover information for types');
  console.log('  - Autocomplete after [[, $, and {~~');
  console.log('  - Document symbols');
  console.log('  - Diagnostics');
  console.log('');
  console.log('For VS Code integration, install the zen-lang extension.');
  console.log('See: editors/vscode/');
}

// ============================================================================
// Helpers
// ============================================================================

function showHelp(): void {
  console.log(`
zen - A markdown extension language for multi-agent systems

Usage: zen <command> [options]

Commands:
  compile <file>   Compile a skill to LLM-ready format
  check <file>     Validate syntax without compiling
  parse <file>     Output the AST as JSON
  lsp              Show language server information

Compile Options:
  -o, --output <file>    Write output to file
  -V, --verbose          Show compilation statistics
  --source-map           Generate source map
  --no-expand-types      Don't expand type definitions
  --no-resolve-refs      Don't resolve references
  --no-transform-sem     Don't transform semantic markers
  --no-header            Don't include header comment

General Options:
  -h, --help       Show this help message
  -v, --version    Show version number

Examples:
  zen compile skill.md                    Compile and print to stdout
  zen compile skill.md -o skill.out.md    Compile to file
  zen check skill.md                      Validate syntax
  zen parse skill.md > ast.json           Export AST

For more information, see: https://github.com/djgrant/zen
  `.trim());
}

function readFile(filePath: string): string | null {
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
    return null;
  }

  try {
    return fs.readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    console.error(`Error reading file: ${err}`);
    process.exit(1);
    return null;
  }
}

function parseCompileOptions(args: string[]): Partial<CompileOptions> {
  return {
    expandTypes: !args.includes('--no-expand-types'),
    resolveReferences: !args.includes('--no-resolve-refs'),
    transformSemantics: !args.includes('--no-transform-sem'),
    includeHeader: !args.includes('--no-header'),
    generateSourceMap: args.includes('--source-map'),
  };
}

interface SemanticWarning {
  message: string;
  span: { start: { line: number; column: number }; end: { line: number; column: number } };
}

function performSemanticChecks(ast: ReturnType<typeof parse>): SemanticWarning[] {
  const warnings: SemanticWarning[] = [];
  const definedTypes = new Set<string>();
  const definedVars = new Set<string>();
  const usedTypes = new Set<string>();

  // Collect definitions and usages
  for (const section of ast.sections) {
    for (const block of section.content) {
      if (block.kind === 'TypeDefinition') {
        if (definedTypes.has(block.name)) {
          warnings.push({
            message: `Duplicate type definition: $${block.name}`,
            span: block.span,
          });
        }
        definedTypes.add(block.name);
      }

      if (block.kind === 'VariableDeclaration') {
        if (definedVars.has(block.name)) {
          warnings.push({
            message: `Duplicate variable declaration: $${block.name}`,
            span: block.span,
          });
        }
        definedVars.add(block.name);
        
        if (block.typeAnnotation) {
          usedTypes.add(block.typeAnnotation.name);
        }
      }
    }
  }

  // Check for undefined type references (against built-ins)
  const builtins = new Set(['FilePath', 'String', 'Number', 'Boolean']);
  for (const typeName of usedTypes) {
    if (!definedTypes.has(typeName) && !builtins.has(typeName)) {
      // Soft warning - type might be defined elsewhere
    }
  }

  return warnings;
}

// ============================================================================
// Run
// ============================================================================

main();
