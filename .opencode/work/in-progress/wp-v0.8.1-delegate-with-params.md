# v0.8.1: DELEGATE WITH Parameter Syntax

## Problem

The current grammar supports two DELEGATE forms:
1. `DELEGATE /task/ TO ~/agent/x` - inline, no params
2. `DELEGATE /task/ TO ~/agent/x WITH #anchor` - inline with anchor reference

But examples want a third form:
3. `DELEGATE /task/ TO ~/agent/x WITH:` + parameter block

Currently this fails with `Expected ANCHOR, got COLON` because `WITH` always expects an anchor.

## Affected Files

Compilation errors in:
- `examples/pr-reviewer/agent/pr-reviewer.mdz` (line 34)
- `examples/standalone-skills/skill/brainstorm-parallel.mdz` (line 30)
- `examples/standalone-skills/skill/doc-freshness-checker.mdz` (line 26)
- `examples/standalone-skills/skill/multi-file-analyzer.mdz` (line 32)

## Current Grammar (v0.8)

```ebnf
delegate_stmt = DELEGATE semantic_marker TO link [ WITH anchor ] newline
              | DELEGATE TO link colon newline with_params
              ;
```

## Proposed Grammar (v0.8.1)

```ebnf
delegate_stmt = DELEGATE semantic_marker TO link [ WITH ( anchor | colon with_params ) ] newline
              | DELEGATE TO link colon newline with_params
              ;
```

This makes `WITH` accept either:
- An anchor reference: `WITH #context-template`
- A parameter block: `WITH:` followed by indented params

## Parser Change

In `packages/core/src/parser/parser.ts`, `parseDelegateStatement()`:

```typescript
// Current (broken for WITH:)
if (this.check('WITH')) {
  this.advance();  // consume WITH
  withAnchor = this.parseAnchor();  // ALWAYS expects anchor
}

// Proposed (v0.8.1)
if (this.check('WITH')) {
  this.advance();  // consume WITH
  if (this.check('COLON')) {
    parameters = this.parseParameterBlock();
  } else {
    withAnchor = this.parseAnchor();
  }
}
```

## Design Decision

Should `WITH #anchor` and `WITH:` be mutually exclusive?

Current examples suggest yes - you either reference a template section OR inline the parameters.

## Verified: Already Working

**Semantic Type Definitions** - Parser already supports:
```
$Analysis: /structured findings for a single file/
```
Parsed as `SemanticType` nodes.

**Template Literals** - Parser already supports:
```
$outputPath = `.opencode/brainstorm/{slug($problem)}.md`
```
Parsed as `TemplateLiteral` with raw parts (no expression evaluation - correct for MDZ).

## Issue 2: Playground Syntax Highlighting Missing Keywords

The Monaco tokenizer in the playground is missing v0.8 keywords.

**Current** (line 1254 in `website/src/pages/playground.astro`):
```javascript
/\b(PARALLEL FOR EACH|FOR EACH|WHILE|DO|IF|THEN|ELSE|IN|AND|OR|NOT|WITH|BREAK|CONTINUE)\b/
```

**Missing keywords**: `DELEGATE`, `USE`, `EXECUTE`, `GOTO`, `TO`

**Fix**: Update the regex to include all control flow keywords:
```javascript
/\b(PARALLEL FOR EACH|FOR EACH|WHILE|DO|IF|THEN|ELSE|IN|AND|OR|NOT|WITH|BREAK|CONTINUE|DELEGATE|USE|EXECUTE|GOTO|TO)\b/
```

## Scope

**Parser fix:**
- `spec/grammar.md` - update DELEGATE rule
- `spec/language-spec.md` - update DELEGATE documentation  
- `packages/core/src/parser/parser.ts` - fix `parseDelegateStatement()`

**Playground fix:**
- `website/src/pages/playground.astro` - add missing keywords to Monaco tokenizer

## Approach

1. Fix parser: Update `parseDelegateStatement()` to handle `WITH:`
2. Fix playground: Add missing keywords to Monaco tokenizer
3. Update grammar spec
4. Rebuild website worker bundle
5. Verify all examples compile

## Status

**Completed** - All fixes implemented and verified.

## Results

All 4 affected example files now compile successfully:
- `pr-reviewer.mdz` - valid
- `brainstorm-parallel.mdz` - valid  
- `doc-freshness-checker.mdz` - valid
- `multi-file-analyzer.mdz` - valid

## Changes Made

1. **Parser** (`packages/core/src/parser/parser.ts`):
   - Updated `parseDelegateStatement()` to accept `WITH:` for inline params

2. **Playground** (`website/src/pages/playground.astro`):
   - Added DELEGATE, USE, EXECUTE, GOTO, TO to Monaco tokenizer

3. **Specs**:
   - Updated `spec/grammar.md` with v0.8.1 DELEGATE rule
   - Updated `spec/language-spec.md` with inline params example
