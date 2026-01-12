# ELSE IF Support for MDZ - Master Work Package

## Goal/Problem

Add `ELSE IF` chain support to the MDZ language. Currently the grammar only supports `IF...THEN...ELSE`, but `ELSE IF` chains are needed for complex conditional logic as seen in `examples/pr-reviewer/review-format.mdz`.

## Scope

This is a coordinated language enhancement requiring changes to:
- Specification documents (`spec/grammar.md`, `spec/language-spec.md`)
- Parser implementation (`packages/core/src/parser/`)
- Tests

## Design Decision

**Use `ELSE IF` (two keywords)** rather than `ELIF` because:
1. Consistent with existing keyword style (CAPS, space-separated like `FOR EACH`)
2. No new lexer token needed - reuses existing `ELSE` and `IF` tokens
3. More readable as prose
4. Familiar to users of other languages

## AST Design

The `IfStatement` AST node should support chained conditions via an `elseIf` array:

```typescript
interface ElseIfClause {
  condition: Condition;
  body: Block[];
  span: Span;
}

interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Condition;
  thenBody: Block[];
  elseIf: ElseIfClause[];  // NEW
  elseBody: Block[] | null;  // Final ELSE clause
}
```

This allows arbitrarily long ELSE IF chains.

## Sub-Work Packages

1. **wp-2026-01-12-else-if-spec** - Update grammar and language spec
2. **wp-2026-01-12-else-if-parser** - Update AST types and parser
3. **wp-2026-01-12-else-if-tests** - Add tests for ELSE IF

## Execution Order

1. **First**: Spec (defines the grammar formally)
2. **Second**: Parser (implements the grammar)
3. **Third**: Tests (validates the implementation)

## Success Criteria

- `npx tsx tests/examples.test.ts` passes for `review-format.mdz`
- New parser tests validate ELSE IF parsing
- Grammar and spec documentation are updated
- No regressions in existing tests

## Status

- [x] Spec work package created
- [x] Parser work package created  
- [x] Tests work package created
- [ ] Spec work package completed
- [ ] Parser work package completed
- [ ] Tests work package completed
- [ ] Integration verified

## Results

Work packages created: 2026-01-12

## Evaluation

(To be filled upon completion of all sub-packages)
