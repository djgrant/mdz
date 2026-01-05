/**
 * Examples Tests
 * 
 * Validates all example files in examples/ directory compile without errors.
 * This ensures examples stay in sync with language changes.
 */

import * as fs from 'fs';
import * as path from 'path';
import { compile } from '../packages/core/src/compiler/compiler';

// ============================================================================
// Test Runner
// ============================================================================

interface TestContext {
  passed: number;
  failed: number;
}

const ctx: TestContext = { passed: 0, failed: 0 };

function test(name: string, fn: () => void): void {
  try {
    fn();
    ctx.passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    ctx.failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n${name}`);
  fn();
}

// ============================================================================
// Helper: Find all .mdz files recursively
// ============================================================================

function findMdzFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.mdz')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// ============================================================================
// Example Validation Tests
// ============================================================================

// __dirname is dist/tests after compilation, so go up two levels to project root
const projectRoot = path.join(__dirname, '..', '..');
const examplesDir = path.join(projectRoot, 'examples');

describe('Example Skills (examples/skills/)', () => {
  const skillsDir = path.join(examplesDir, 'skills');
  
  if (!fs.existsSync(skillsDir)) {
    console.log('  (skills directory not found, skipping)');
    return;
  }
  
  const skillFiles = findMdzFiles(skillsDir);
  
  if (skillFiles.length === 0) {
    console.log('  (no .mdz files found)');
    return;
  }
  
  for (const file of skillFiles) {
    const relativePath = path.relative(examplesDir, file);
    
    test(`${relativePath} compiles without errors`, () => {
      const source = fs.readFileSync(file, 'utf-8');
      const result = compile(source, { 
        validateTypes: true,
        validateReferences: true 
      });
      
      const errors = result.diagnostics.filter(d => d.severity === 'error');
      
      if (errors.length > 0) {
        const errorMessages = errors.map(e => 
          `  Line ${e.span?.start?.line || '?'}: ${e.message}`
        ).join('\n');
        throw new Error(`Compilation errors:\n${errorMessages}`);
      }
    });
  }
});

describe('Example Snippets (examples/snippets/)', () => {
  const snippetsDir = path.join(examplesDir, 'snippets');
  
  if (!fs.existsSync(snippetsDir)) {
    console.log('  (snippets directory not found, skipping)');
    return;
  }
  
  const snippetFiles = findMdzFiles(snippetsDir);
  
  if (snippetFiles.length === 0) {
    console.log('  (no .mdz files found)');
    return;
  }
  
  for (const file of snippetFiles) {
    const relativePath = path.relative(examplesDir, file);
    
    test(`${relativePath} compiles without errors`, () => {
      const source = fs.readFileSync(file, 'utf-8');
      const result = compile(source, { 
        validateTypes: true,
        validateReferences: true 
      });
      
      const errors = result.diagnostics.filter(d => d.severity === 'error');
      
      if (errors.length > 0) {
        const errorMessages = errors.map(e => 
          `  Line ${e.span?.start?.line || '?'}: ${e.message}`
        ).join('\n');
        throw new Error(`Compilation errors:\n${errorMessages}`);
      }
    });
  }
});

// ============================================================================
// Summary Statistics
// ============================================================================

describe('Example Coverage', () => {
  const allFiles = findMdzFiles(examplesDir);
  
  test(`found ${allFiles.length} example files`, () => {
    // Just report the count - no assertion needed
    assert(allFiles.length > 0, 'Should have at least one example file');
  });
});

// ============================================================================
// Run Tests
// ============================================================================

console.log('\n=== MDZ Examples Tests ===\n');

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}
