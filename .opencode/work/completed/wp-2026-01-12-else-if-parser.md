# ELSE IF Support - Parser Implementation

## Goal/Problem

Update the MDZ parser to support `ELSE IF` chains in conditional statements.

## Scope

Files to modify:
- `packages/core/src/parser/ast.ts` - Update IfStatement type
- `packages/core/src/parser/parser.ts` - Update parseIf() method

The lexer does NOT need changes - `ELSE` and `IF` are already separate tokens.

## Approach

### AST Changes (`ast.ts`)

Update the `IfStatement` interface (around line 298):

**Current:**
```typescript
export interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Condition;
  thenBody: Block[];
  elseBody: Block[] | null;
}
```

**New:**
```typescript
export interface ElseIfClause {
  condition: Condition;
  body: Block[];
  span: Span;
}

export interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Condition;
  thenBody: Block[];
  elseIf: ElseIfClause[];  // NEW: ELSE IF chains
  elseBody: Block[] | null;
}
```

### Parser Changes (`parser.ts`)

Update the `parseIf()` method (around line 1095):

**Current logic:**
```typescript
private parseIf(): AST.IfStatement {
  // ... parse IF condition THEN: block ...
  
  let elseBody: AST.Block[] | null = null;
  if (this.check('ELSE')) {
    this.advance();
    this.expect('COLON');
    this.skipNewlines();
    elseBody = this.parseIndentedBlocks();
  }
  // ...
}
```

**New logic:**
```typescript
private parseIf(): AST.IfStatement {
  // ... parse IF condition THEN: block ...
  
  const elseIf: AST.ElseIfClause[] = [];
  let elseBody: AST.Block[] | null = null;
  
  // Parse ELSE IF chains
  while (this.check('ELSE')) {
    const elseStart = this.current();
    this.advance();  // consume ELSE
    
    if (this.check('IF')) {
      // ELSE IF clause
      this.advance();  // consume IF
      const condition = this.parseCondition();
      this.expect('THEN');
      this.expect('COLON');
      this.skipNewlines();
      const body = this.parseIndentedBlocks();
      
      elseIf.push({
        condition,
        body,
        span: AST.mergeSpans(elseStart.span, body.length > 0 ? body[body.length - 1].span : condition.span),
      });
    } else {
      // Plain ELSE clause (terminates the chain)
      this.expect('COLON');
      this.skipNewlines();
      elseBody = this.parseIndentedBlocks();
      break;  // ELSE must be last
    }
  }
  
  return {
    kind: 'IfStatement',
    condition,
    thenBody,
    elseIf,
    elseBody,
    span: // ... merge spans appropriately
  };
}
```

## Hypothesis

These parser changes will:
1. Correctly parse ELSE IF chains in MDZ documents
2. Produce an AST that accurately represents the conditional structure
3. Be backward compatible with existing IF/ELSE usage

## Dependencies

- Depends on: wp-2026-01-12-else-if-spec (for grammar clarity)
- Blocks: wp-2026-01-12-else-if-tests (need implementation first)

## Results

Completed successfully:
- Added `ElseIfClause` interface to `packages/core/src/parser/ast.ts`
- Updated `IfStatement` interface with `elseIf: ElseIfClause[]` field
- Updated `parseIf()` method in `packages/core/src/parser/parser.ts` to:
  - Parse ELSE IF chains using a while loop
  - Handle both ELSE IF and plain ELSE clauses
  - Properly compute span for the full statement

## Evaluation

Parser changes work correctly:
- All 52 parser tests pass (48 existing + 4 new ELSE IF tests)
- ELSE IF parsing supports both deterministic and semantic conditions
- Backward compatible with existing IF/ELSE usage
