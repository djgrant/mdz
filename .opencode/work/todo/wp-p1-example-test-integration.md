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

- [ ] All examples in one location
- [ ] Test suite validates all examples
- [ ] Docs import examples (single source of truth)
- [ ] CI fails on invalid examples

## Hypothesis

Centralized, tested examples prevent syntax drift and reduce maintenance burden.
