#!/usr/bin/env node
/**
 * MDZ CLI (v0.3 - Validator-First)
 * 
 * Command-line interface for MDZ (Zen Markdown).
 * 
 * Usage:
 *   mdz compile <file>  - Validate and output skill (unchanged)
 *   mdz check <file>    - Validate syntax and references
 *   mdz parse <file>    - Output the AST as JSON
 *   mdz graph <file>    - Output dependency graph
 *   mdz lsp             - Start the language server (stdio)
 *   mdz --help          - Show help
 *   mdz --version       - Show version
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse, compile, CompileOptions } from '@mdz/core';

// ============================================================================
// Version
// ============================================================================

const VERSION = '0.3.0';

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
    console.log(`mdz ${VERSION}`);
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
    case 'graph':
      graphCommand(rest);
      break;
    case 'lsp':
      lspCommand(rest);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run "mdz --help" for usage information.');
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
    console.error('Usage: mdz compile <file> [options]');
    process.exit(1);
  }

  const source = readFile(filePath);
  if (source === null) return;

  const result = compile(source, options);

  // Output diagnostics
  for (const diag of result.diagnostics) {
    const prefix = diag.severity === 'error' ? '✗' : diag.severity === 'warning' ? '⚠' : 'ℹ';
    console.error(`${prefix} [${diag.code}] ${diag.message} (${diag.span.start.line}:${diag.span.start.column})`);
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
    console.log(`✓ Written to ${outPath}`);
  } else {
    console.log(result.output);
  }

  // Output stats if verbose
  if (args.includes('--verbose') || args.includes('-V')) {
    console.error('\n--- Validation Summary ---');
    console.error(`Types: ${result.metadata.types.length}`);
    console.error(`Variables: ${result.metadata.variables.length}`);
    console.error(`References: ${result.metadata.references.length}`);
    console.error(`Sections: ${result.metadata.sections.length}`);
    console.error(`Dependencies: ${result.dependencies.nodes.length}`);
    console.error(`Warnings: ${result.diagnostics.filter(d => d.severity === 'warning').length}`);
    console.error(`Errors: ${result.diagnostics.filter(d => d.severity === 'error').length}`);
  }

  // Output source map if requested
  if (args.includes('--source-map')) {
    const mapPath = filePath.replace(/\.mdz$/, '.map.json');
    fs.writeFileSync(mapPath, JSON.stringify(result.sourceMap, null, 2));
    console.error(`✓ Source map written to ${mapPath}`);
  }

  // Output metadata if requested
  if (args.includes('--metadata')) {
    const metaPath = filePath.replace(/\.mdz$/, '.meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(result.metadata, null, 2));
    console.error(`✓ Metadata written to ${metaPath}`);
  }
}

function checkCommand(args: string[]): void {
  const filePath = args.find(a => !a.startsWith('-'));

  if (!filePath) {
    console.error('Error: No input file specified');
    console.error('Usage: mdz check <file>');
    process.exit(1);
  }

  const source = readFile(filePath);
  if (source === null) return;

  // Use compiler for full validation
  const result = compile(source, {
    validateTypes: true,
    validateScope: true,
    validateReferences: true,
  });
  
  let hasErrors = false;
  let hasWarnings = false;

  for (const diag of result.diagnostics) {
    const prefix = diag.severity === 'error' ? '✗' : diag.severity === 'warning' ? '⚠' : 'ℹ';
    console.error(`${prefix} [${diag.code}] ${diag.message} (${diag.span.start.line}:${diag.span.start.column})`);
    if (diag.severity === 'error') hasErrors = true;
    if (diag.severity === 'warning') hasWarnings = true;
  }

  if (hasErrors) {
    const errorCount = result.diagnostics.filter(d => d.severity === 'error').length;
    console.error(`\n✗ ${errorCount} error(s) found`);
    process.exit(1);
  } else {
    console.log(`✓ ${filePath} is valid`);
    if (hasWarnings) {
      const warnCount = result.diagnostics.filter(d => d.severity === 'warning').length;
      console.log(`  (${warnCount} warning(s))`);
    }
    
    // Summary
    console.log(`\n  Types: ${result.metadata.types.length}`);
    console.log(`  Variables: ${result.metadata.variables.length}`);
    console.log(`  Dependencies: ${result.dependencies.nodes.length}`);
  }
}

function parseCommand(args: string[]): void {
  const filePath = args.find(a => !a.startsWith('-'));

  if (!filePath) {
    console.error('Error: No input file specified');
    console.error('Usage: mdz parse <file>');
    process.exit(1);
  }

  const source = readFile(filePath);
  if (source === null) return;

  const ast = parse(source);
  
  // Output AST as JSON
  const output = JSON.stringify(ast, null, 2);
  console.log(output);
}

function graphCommand(args: string[]): void {
  const filePath = args.find(a => !a.startsWith('-'));

  if (!filePath) {
    console.error('Error: No input file specified');
    console.error('Usage: mdz graph <file>');
    process.exit(1);
  }

  const source = readFile(filePath);
  if (source === null) return;

  const result = compile(source);
  
  // Output format
  const format = args.includes('--mermaid') ? 'mermaid' : 
                 args.includes('--dot') ? 'dot' : 'json';

  if (format === 'json') {
    console.log(JSON.stringify(result.dependencies, null, 2));
  } else if (format === 'mermaid') {
    console.log('graph TD');
    const name = result.metadata.name || 'source';
    for (const edge of result.dependencies.edges) {
      const style = edge.type === 'uses' ? '==>' : 
                    edge.type === 'imports' ? '-->' : '-.->'; 
      console.log(`  ${name} ${style} ${edge.target}`);
    }
  } else if (format === 'dot') {
    console.log('digraph G {');
    const name = result.metadata.name || 'source';
    for (const edge of result.dependencies.edges) {
      const style = edge.type === 'uses' ? 'bold' : 
                    edge.type === 'imports' ? 'solid' : 'dashed';
      console.log(`  "${name}" -> "${edge.target}" [style=${style}]`);
    }
    console.log('}');
  }
}

function lspCommand(_args: string[]): void {
  // The LSP server is available as a library via src/lsp/server.ts
  // For stdio transport, we provide integration guidance
  console.log('MDZ Language Server');
  console.log('');
  console.log('The LSP server is available as a library:');
  console.log('');
  console.log('  import { createLanguageServer } from "zenmarkdown/lsp/server";');
  console.log('  const server = createLanguageServer();');
  console.log('');
  console.log('Features:');
  console.log('  - Go-to-definition for [[references]] and $variables');
  console.log('  - Hover information for types');
  console.log('  - Autocomplete after [[, $, and {~~');
  console.log('  - Document symbols');
  console.log('  - Diagnostics');
  console.log('');
  console.log('For VS Code integration, install the MDZ extension.');
  console.log('See: editors/vscode/');
}

// ============================================================================
// Helpers
// ============================================================================

function showHelp(): void {
  console.log(`
MDZ - Zen Markdown: A language for the world's most powerful runtime (v0.3)

Usage: mdz <command> [options]

Commands:
  compile <file>   Validate and output skill (source unchanged)
  check <file>     Validate syntax, types, and references
  parse <file>     Output the AST as JSON
  graph <file>     Output dependency graph
  lsp              Show language server information

Compile Options:
  -o, --output <file>    Write output to file
  -V, --verbose          Show validation summary
  --source-map           Generate source map
  --metadata             Generate metadata JSON
  --no-header            Don't include validation header

Check Options:
  (no additional options)

Graph Options:
  --mermaid              Output Mermaid format
  --dot                  Output GraphViz DOT format
  (default is JSON)

General Options:
  -h, --help       Show this help message
  -v, --version    Show version number

Examples:
  mdz compile skill.mdz                    Validate and print to stdout
  mdz compile skill.mdz -o skill.out.mdz   Validate and write to file
  mdz check skill.mdz                      Check for errors
  mdz graph skill.mdz --mermaid            Show dependencies as Mermaid
  mdz parse skill.mdz > ast.json           Export AST

Note: v0.3 is validator-first. The compiler validates but does not transform.
Source = Output (the LLM sees what you wrote).

For more information, see: https://github.com/djgrant/mdz
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
    includeHeader: !args.includes('--no-header'),
    generateSourceMap: args.includes('--source-map'),
    validateReferences: true,
    validateTypes: true,
    validateScope: true,
  };
}

// ============================================================================
// Run
// ============================================================================

main();
