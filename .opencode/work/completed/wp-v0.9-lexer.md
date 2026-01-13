# v0.9 Lexer Updates

## Goal

Add new tokens for v0.9 language extensions.

## Scope

- `packages/core/src/parser/lexer.ts` (766 lines)

## Approach

### TokenType Union (lines 14-44)

**Add:**
```typescript
| 'RETURN'    // v0.9
| 'ASYNC'     // v0.9
| 'AWAIT'     // v0.9
| 'PUSH'      // v0.9: << operator
```

**Remove:**
```typescript
| 'PARALLEL'  // v0.2 - REMOVED in v0.9
```

### Keywords Map (lines 698-709)

**Add:**
```typescript
'RETURN': 'RETURN',
'ASYNC': 'ASYNC',
'AWAIT': 'AWAIT',
```

**Remove:**
```typescript
'PARALLEL': 'PARALLEL',
```

### Push Operator Scanning (insert after line 209)

```typescript
// Push operator (v0.9) - must come before single '<'
if (this.lookAhead('<<')) {
  this.consumeChars(2);
  this.addToken('PUSH', '<<');
  return;
}
```

### DO Disambiguation

**No lexer changes needed.** DO remains a single token type. Parser handles disambiguation:
- `WHILE condition DO:` — DO as delimiter (existing)
- `DO /instruction/` — DO as instruction keyword (new)

The lexer is context-free; parser uses lookahead to distinguish.

### File Header Comment (line 5)

Update:
```typescript
 * v0.2: Added BREAK, CONTINUE keywords
 * v0.9: Added RETURN, ASYNC, AWAIT keywords; PUSH operator; removed PARALLEL
```

## Measures of Success

- [ ] New tokens added to TokenType union
- [ ] Keywords map updated
- [ ] PUSH operator scanning implemented
- [ ] PARALLEL removed
- [ ] Lexer unit tests pass

## Test Cases

1. `RETURN $value` → RETURN + DOLLAR_IDENT
2. `ASYNC DELEGATE` → ASYNC + DELEGATE
3. `AWAIT $promise` → AWAIT + DOLLAR_IDENT
4. `$list << $item` → DOLLAR_IDENT + PUSH + DOLLAR_IDENT
5. `$a << $b < $c` → PUSH + LT correctly distinguished
6. `PARALLEL` → UPPER_IDENT (no longer keyword)

## Estimated Effort

1 hour
