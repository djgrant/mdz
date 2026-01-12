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
// Configuration
// ============================================================================

// Handle both compiled (dist/tests/) and direct tsx execution
const projectRoot = fs.existsSync(path.join(__dirname, '..', '..', 'examples'))
  ? path.join(__dirname, '..', '..')
  : path.join(__dirname, '..');

const examplesDir = path.join(projectRoot, 'examples');

// Files that are intentionally broken (for testing error handling)
const excludedFiles = new Set([
  'broken-reference.mdz',
  'missing-type.mdz',
  'undeclared-skill.mdz',
]);

// ============================================================================
// Example Validation Tests
// ============================================================================

console.log('\n=== MDZ Examples Tests ===\n');

// Find all .mdz files and group by parent directory
const allFiles = findMdzFiles(examplesDir);
const filesByDir = new Map<string, string[]>();

for (const file of allFiles) {
  const relativePath = path.relative(examplesDir, file);
  const parentDir = path.dirname(relativePath);
  const dirKey = parentDir === '.' ? 'examples/' : `examples/${parentDir}/`;
  
  if (!filesByDir.has(dirKey)) {
    filesByDir.set(dirKey, []);
  }
  filesByDir.get(dirKey)!.push(file);
}

// Sort directories for consistent output
const sortedDirs = Array.from(filesByDir.keys()).sort();

// Run tests for each directory
for (const dirKey of sortedDirs) {
  const files = filesByDir.get(dirKey)!;
  
  describe(dirKey, () => {
    for (const file of files) {
      const fileName = path.basename(file);
      
      // Skip excluded files
      if (excludedFiles.has(fileName)) {
        console.log(`  - ${fileName} (skipped - intentionally broken)`);
        continue;
      }
      
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
}

// ============================================================================
// Summary Statistics
// ============================================================================

describe('Summary', () => {
  const testedCount = allFiles.filter(f => !excludedFiles.has(path.basename(f))).length;
  const skippedCount = allFiles.filter(f => excludedFiles.has(path.basename(f))).length;
  
  test(`found ${allFiles.length} example files (${testedCount} tested, ${skippedCount} skipped)`, () => {
    assert(allFiles.length > 0, 'Should have at least one example file');
  });
});

// ============================================================================
// Results
// ============================================================================

console.log(`\n=== Results ===`);
console.log(`Passed: ${ctx.passed}`);
console.log(`Failed: ${ctx.failed}`);

if (ctx.failed > 0) {
  process.exit(1);
}
