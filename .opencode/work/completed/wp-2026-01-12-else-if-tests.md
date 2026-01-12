# ELSE IF Support - Tests

## Goal/Problem

Add comprehensive tests for ELSE IF chain parsing and ensure existing example files compile correctly.

## Scope

Files to modify:
- `tests/parser.test.ts` - Add ELSE IF parsing tests
- Potentially `tests/v02-features.test.ts` or create new test file

Files to verify:
- `examples/pr-reviewer/review-format.mdz` - Should compile without errors
- `examples/pr-reviewer/learnings.mdz` - Has related issues

## Approach

### New Parser Tests

Add to `tests/parser.test.ts`:

```typescript
describe('ELSE IF chains', () => {
  test('simple ELSE IF', () => {
    const source = `
IF $x = 1 THEN:
  - First
ELSE IF $x = 2 THEN:
  - Second
ELSE:
  - Default
`;
    const doc = parse(source);
    const ifStmt = findIfStatement(doc);
    
    expect(ifStmt.elseIf).toHaveLength(1);
    expect(ifStmt.elseIf[0].condition.kind).toBe('DeterministicCondition');
    expect(ifStmt.elseBody).not.toBeNull();
  });

  test('multiple ELSE IF clauses', () => {
    const source = `
IF /condition A/ THEN:
  - A
ELSE IF /condition B/ THEN:
  - B
ELSE IF /condition C/ THEN:
  - C
ELSE:
  - Default
`;
    const doc = parse(source);
    const ifStmt = findIfStatement(doc);
    
    expect(ifStmt.elseIf).toHaveLength(2);
  });

  test('ELSE IF without final ELSE', () => {
    const source = `
IF $x = 1 THEN:
  - One
ELSE IF $x = 2 THEN:
  - Two
`;
    const doc = parse(source);
    const ifStmt = findIfStatement(doc);
    
    expect(ifStmt.elseIf).toHaveLength(1);
    expect(ifStmt.elseBody).toBeNull();
  });

  test('ELSE IF with semantic conditions', () => {
    const source = `
IF /any critical findings/ THEN:
  $outcome = "request-changes"
ELSE IF /major findings > 3/ THEN:
  $outcome = "request-changes"
ELSE IF /any findings/ THEN:
  $outcome = "comment"
ELSE:
  $outcome = "approve"
`;
    const doc = parse(source);
    const ifStmt = findIfStatement(doc);
    
    expect(ifStmt.elseIf).toHaveLength(2);
    expect(ifStmt.elseIf[0].condition.kind).toBe('SemanticCondition');
  });
});
```

### Integration Test Verification

Run and verify:
```bash
npx tsx tests/examples.test.ts
```

Ensure `review-format.mdz` passes after parser changes.

## Hypothesis

These tests will:
1. Validate ELSE IF parsing works correctly
2. Catch edge cases (no final ELSE, semantic conditions)
3. Confirm example files compile

## Dependencies

- Depends on: wp-2026-01-12-else-if-parser (need working parser first)

## Results

Added 4 new tests to `tests/parser.test.ts`:
1. `parses simple ELSE IF` - single ELSE IF with deterministic condition
2. `parses multiple ELSE IF clauses` - 2 ELSE IF clauses + final ELSE
3. `parses ELSE IF without final ELSE` - optional ELSE verification
4. `parses ELSE IF with semantic conditions` - semantic condition support

All 179 tests pass across all test files:
- parser.test.ts: 52 tests
- compiler.test.ts: 34 tests
- integration.test.ts: 22 tests
- edge-cases.test.ts: 39 tests
- v02-features.test.ts: 32 tests

## Evaluation

Note: The `review-format.mdz` example still fails due to a pre-existing code block parsing issue (headings inside code blocks are incorrectly parsed). This is unrelated to ELSE IF - the ELSE IF syntax in that file parses correctly when tested in isolation.
