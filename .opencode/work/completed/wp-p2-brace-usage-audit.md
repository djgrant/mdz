---
size: sm
category: language
parent: wp-p1-language-coherence-master
---

# Brace Usage Audit

## Goal/Problem

Clarify when different types of braces/brackets are needed in MDZ and why.

## Brace Types in MDZ

### 1. Parentheses `()`

Current usages:
- Tuple types: `($Task, $Strategy)`
- Function calls: `$path(0)`
- Lambda params: `($a, $b) => expr`
- FOR EACH destructuring: `FOR EACH ($a, $b) IN $items:`
- WHILE conditions: `WHILE (condition):`
- IF conditions: `IF ($condition) THEN:` (optional?)
- Grouping in expressions: `($a AND $b) OR $c`

### 2. Square brackets `[]`

Current usages:
- Array types: `$Task[]`
- Array literals: `[1, 2, 3]`
- Double brackets for references: `[[skill]]`, `[[#section]]`

### 3. Curly braces `{}`

Current usages:
- Semantic markers: `{~~content}`
- Template interpolation: `${var}` in backtick strings
- (Not used for blocks - indentation based)

## Questions to Answer

1. When are parentheses REQUIRED vs optional?
   - WHILE: required?
   - IF: optional?
   - FOR EACH pattern: only for destructuring?

2. Can parens be used just for grouping anywhere?
   - `IF ($a = 1) AND ($b = 2) THEN:` valid?

3. What's the precedence without parens?
   - `IF $a AND $b OR $c THEN:` - how parsed?

4. Are there ambiguity cases we need to resolve?

## Approach

1. Audit parser for where each brace type is expected
2. Document current behavior
3. Identify any ambiguities or inconsistencies
4. Propose clear rules
5. Update spec and docs

## Deliverable

Clear documentation of:
- When each brace type is required
- When each is optional
- Operator precedence rules
- Examples of each case

## Results

### Comprehensive Analysis Completed

Analyzed `packages/core/src/parser/parser.ts`, `packages/core/src/parser/lexer.ts`, `spec/grammar.md`, and all example files.

### 1. Parentheses `()` — Six Distinct Uses

| Use Case | Required? | Parser Evidence |
|----------|-----------|-----------------|
| **WHILE conditions** | **YES** | `parseWhile()` calls `expect('LPAREN')` and `expect('RPAREN')` |
| **IF conditions** | NO | `parseIf()` directly calls `parseCondition()` without expecting parens |
| **FOR EACH destructuring** | **YES** | `parsePattern()` uses `LPAREN` to distinguish destructuring from simple |
| **FOR EACH single var** | NO | `parsePattern()` handles `DOLLAR_IDENT` directly |
| **Lambda multi-params** | **YES** | `parseLambdaExpression()` requires parens for multiple params |
| **Lambda single param** | NO | `parseLambdaExpression()` allows `$x => expr` |
| **Function calls** | **YES** | `parseVariableReference()` requires parens after callee |
| **Compound types** | **YES** | `parseCompoundType()` requires parens |
| **Expression grouping** | OPTIONAL | `parsePrimary()` supports `LPAREN` for grouping |

**Key Asymmetry: WHILE vs IF**

- `WHILE` **requires** parentheses: `WHILE ($x < 5):`
- `IF` does **not** require parentheses: `IF $x < 5 THEN:`

This asymmetry exists because IF conditions can be semantic (natural language prose), where parentheses would feel unnatural: `IF diminishing returns THEN:`.

### 2. Square Brackets `[]` — Two Uses

| Use Case | Syntax | Parser Evidence |
|----------|--------|-----------------|
| **Array types** | `$Task[]` | `parseTypeExpr()` checks for `LBRACKET` suffix |
| **Array literals** | `[1, 2, 3]` | `parseArrayLiteral()` handles `LBRACKET`...`RBRACKET` |
| **Skill/section refs** | `[[...]]` | Lexer emits `DOUBLE_LBRACKET`/`DOUBLE_RBRACKET` tokens |

No ambiguity: `[[` is distinct from `[`.

### 3. Curly Braces `{}` — Two Uses

| Use Case | Syntax | Parser Evidence |
|----------|--------|-----------------|
| **Semantic markers** | `{~~content}` | Lexer detects `{~~` as `SEMANTIC_OPEN` |
| **Template interpolation** | `` `${var}` `` | Only inside backtick strings |

MDZ does **not** use `{}` for code blocks (uses indentation instead).

### 4. Operator Precedence (Confirmed from Parser)

From highest to lowest (matching parser implementation):

1. **Grouping**: `( )` — via `parsePrimary()`
2. **Member access**: `.` — via `parseVariableReference()`
3. **Function call**: `()` — via `parseVariableReference()`
4. **Comparison**: `=`, `!=`, `<`, `>`, `<=`, `>=` — via `parseComparison()`
5. **Logical NOT**: `NOT` — via `parsePrimary()` (unary)
6. **Logical AND**: `AND` — via `parseAnd()`
7. **Logical OR**: `OR` — via `parseOr()`
8. **Lambda arrow**: `=>` — binds loosest

**Parsing chain**: `parseExpression()` → `parseOr()` → `parseAnd()` → `parseComparison()` → `parsePrimary()`

### 5. Example Validation

Checked all `examples/*.mdz` files for consistency:

- `the-scientist.mdz`: Uses `WHILE (NOT diminishing returns AND $iteration < $maxIterations):` — correctly parenthesized
- `debugger.mdz`: Uses `IF $traceLevel = "debug" THEN:` — correctly no parens
- `pr-reviewer.mdz`: Uses `IF {~~file contains logic changes} THEN:` — semantic condition, no parens
- `skill-composer.mdz`: Uses `IF {~~cycle detected} THEN:` — semantic condition, no parens

All examples are consistent with the documented rules.

### 6. Ambiguities Found: NONE

The grammar is unambiguous:
- Each bracket type has distinct uses
- Required vs optional cases are clear from context
- No overlapping syntax patterns

### Documentation Updates

1. **Added to `spec/language-spec.md`**: New "Grouping and Braces" section with:
   - Complete explanation of parentheses requirements
   - Square bracket uses
   - Curly brace uses
   - Operator precedence table
   - Quick reference table

2. **Added to `spec/grammar.md`**: New "Rule 7: Parentheses Requirements" in Disambiguation Rules with:
   - Summary table
   - Code examples showing valid/invalid syntax

## Evaluation

A new user can now understand brace rules from the docs:

1. **Clear rule for WHILE vs IF asymmetry** — explained with rationale
2. **Table format for quick lookup** — when is each brace required?
3. **Examples show both valid and invalid syntax**
4. **Precedence rules documented** — how expressions bind without parens
5. **All example files consistent** — users can trust examples as reference

### Test: Can a user answer these questions from docs?

- Q: Does WHILE need parens? A: Yes (explicit in table)
- Q: Does IF need parens? A: No (explicit, with explanation why)
- Q: How does `$a AND $b OR $c` parse? A: `($a AND $b) OR $c` (precedence table)
- Q: When does FOR EACH need parens? A: Only for destructuring (table + examples)
