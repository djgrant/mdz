---
size: sm
category: language
parent: wp-p1-language-coherence-master
status: completed
---

# IF Statement Brace Rules

## Goal/Problem

Current examples are inconsistent about parentheses in IF conditions:

```mdz
IF $result = "progress" THEN:      # no parens
IF ($condition) THEN:              # with parens
IF {~~any critical findings} THEN: # no parens, semantic
```

Meanwhile WHILE always uses parens:
```mdz
WHILE (NOT diminishing returns AND $iterations < $maxIterations):
```

## Options

### Option A: Always require parens (like WHILE)
```mdz
IF ($result = "progress") THEN:
IF ({~~any critical findings}) THEN:
```

Pros: Consistent with WHILE, clear condition boundaries
Cons: More syntax, parens around semantic markers look odd

### Option B: Never use parens
```mdz
IF $result = "progress" THEN:
IF NOT $done AND $count < 5 THEN:
```

Pros: Cleaner, THEN keyword already delimits
Cons: Complex conditions harder to parse visually

### Option C: Optional (document current behavior)
```mdz
IF $result = "progress" THEN:        # simple: no parens
IF ($a > 5 AND $b < 10) THEN:        # complex: parens recommended
```

Pros: Flexible, matches natural writing
Cons: Inconsistent, harder to teach

## Questions to Explore

1. What do other languages with CAPS keywords do? (SQL, BASIC)
2. Does the parser care about parens?
3. What feels most natural for prose-like syntax?
4. Should WHILE also allow optional parens for consistency?

## Approach

1. Research precedent in similar languages
2. Test parser behavior with/without parens
3. Evaluate readability of each option
4. Propose recommendation

## Decision

**Option B (formalized): IF uses THEN as delimiter, no parentheses required. WHILE requires parentheses because it has no THEN keyword.**

This is a coherent asymmetry, not an inconsistency. It follows SQL/BASIC tradition where `IF condition THEN` uses THEN as the delimiter, while `WHILE (condition)` needs parens because there's no THEN.

## Results

### Parser Analysis

Examined `packages/core/src/parser/parser.ts`:

**IF statement (lines 1031-1034):**
```typescript
private parseIf(): AST.IfStatement {
  const start = this.advance();
  const condition = this.parseCondition();  // No LPAREN required!
  this.expect('THEN');
```

**WHILE statement (lines 1011-1016):**
```typescript
private parseWhile(): AST.WhileStatement {
  const start = this.advance();
  this.expect('LPAREN');  // REQUIRES parens!
  const condition = this.parseCondition();
  this.expect('RPAREN');  // REQUIRES parens!
```

The parser already implements the correct design.

### Example Audit

All 4 example files use IF without parentheses:
- `the-scientist.mdz`: `IF $result = "progress" THEN:`
- `skill-composer.mdz`: `IF {~~cycle detected} THEN:`
- `pr-reviewer.mdz`: `IF {~~file contains logic changes} THEN:`
- `debugger.mdz`: `IF $traceLevel = "debug" THEN:`

All 28 test cases use IF without parentheses.

### Language Precedent

**SQL:**
```sql
IF condition THEN
  statements
END IF
```

**BASIC:**
```basic
If condition Then
  statements
End If
```

Both use THEN as the delimiter. MDZ follows this convention.

### Changes Made

1. **spec/grammar.md** - Added comment clarifying IF parens are optional
2. **spec/language-spec.md** - Updated IF THEN ELSE section to:
   - Remove `($condition)` example with parens
   - Add note about THEN acting as delimiter
   - Add semantic condition example
   - Updated Grammar Summary tokens to show `IF CONDITION 'THEN:'`

The spec already had a "Grouping and Braces" section documenting the IF vs WHILE asymmetry - this was preserved.

### Why This Design is Correct

1. **THEN acts as the delimiter** - Makes parens redundant for IF
2. **WHILE has no delimiter keyword** - Needs parens to know where condition ends
3. **Matches SQL/BASIC heritage** - Familiar to the target audience
4. **Better for semantic conditions** - `IF {~~any findings} THEN:` reads more naturally than `IF ({~~any findings}) THEN:`
5. **Parser already implements this** - No breaking changes needed

## Evaluation

The rule is easy to remember:
- **IF** has **THEN**, so no parens needed
- **WHILE** has no THEN, so parens required

This follows the pattern of other CAPS-keyword languages (SQL, BASIC, PL/SQL) and creates a prose-like reading experience for IF conditions while maintaining clear boundaries for WHILE loops.
