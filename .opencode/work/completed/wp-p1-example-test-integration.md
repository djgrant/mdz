# Example Test Integration

## Goal/Problem

Code examples are scattered across website docs and not validated. This caused syntax drift (type definitions using `=` instead of `:`) that wasn't caught until manual review.

## Proposal

### 1. Single Source of Truth

All code examples should live in `examples/` directory:
```
examples/
  skills/           # Full skill examples
    pr-reviewer.mdz
    the-scientist.mdz
    ...
  snippets/         # Small examples for docs
    type-semantic.mdz
    type-enum.mdz
    for-each-basic.mdz
    ...
```

### 2. Test Suite Integration

Add to test suite:
```typescript
describe('Examples', () => {
  const examples = glob.sync('examples/**/*.mdz');
  
  for (const file of examples) {
    it(`${file} compiles without errors`, () => {
      const source = fs.readFileSync(file, 'utf-8');
      const result = compile(source);
      expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    });
  }
});
```

### 3. Documentation Extraction

Website docs should import examples:
```astro
---
import typeExample from '../../../examples/snippets/type-semantic.mdz?raw';
---

<pre><code>{typeExample}</code></pre>
```

Or use a build step to embed examples into docs.

### 4. CI Integration

- `pnpm test` should fail if any example has errors
- Pre-commit hook could validate examples

## Scope

- Create `examples/snippets/` directory
- Extract code blocks from docs into snippet files
- Update test suite
- Update docs to import from examples

## Acceptance Criteria

- [x] All examples in one location
- [x] Test suite validates all examples
- [ ] Docs import examples (single source of truth) - **Future work**
- [x] CI fails on invalid examples

## Hypothesis

Centralized, tested examples prevent syntax drift and reduce maintenance burden.

## Results

### Completed 2026-01-05

**Changes Made:**

1. **Directory Restructure**
   - Created `examples/skills/` for full skill examples
   - Created `examples/snippets/` for doc code blocks
   - Moved existing examples to `examples/skills/`:
     - `debugger.mdz`
     - `pr-reviewer.mdz`
     - `skill-composer.mdz`
     - `the-scientist.mdz`
   - Added initial snippet `examples/snippets/type-semantic.mdz`

2. **Test Suite Integration**
   - Created `tests/examples.test.ts` that:
     - Recursively finds all `.mdz` files in `examples/`
     - Compiles each with type and reference validation
     - Reports errors with line numbers
   - Added `test:examples` script to package.json
   - Added examples test to main `test` script

3. **Test Results**
   - All 5 example files pass validation
   - Full test suite passes (169 tests total)

**Files Changed:**
- `examples/skills/` - new directory with 4 moved examples
- `examples/snippets/` - new directory with 1 snippet
- `tests/examples.test.ts` - new test file
- `package.json` - updated test scripts

**Docs Integration (Future Work):**
The docs currently embed code examples inline as HTML with syntax highlighting classes. Full integration would require:
1. Extracting inline code blocks to snippet files
2. Updating Astro pages to import from `examples/snippets/`
3. Adding syntax highlighting at import time (or using raw import)

This is a larger effort that could be a follow-up work package.

**Recommendation:**
The core infrastructure is in place. Consider a follow-up WP to:
- Extract more snippets from docs (control-flow, types, references, etc.)
- Update docs to import snippets
- Add a build script to validate snippet coverage
