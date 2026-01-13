# Link-Based References: Parser Updates

## Goal/Problem

Update the parser to handle link-based syntax and new statement types (USE, EXECUTE, GOTO).

## Scope

**File:** `packages/core/src/parser/parser.ts`

**Lines to modify:**
- Lines 838-850: Reference handling in `parsePrimary()`
- Lines 960-1022: Individual reference parsing functions
- Lines 1569-1576: Reference handling in `parseParagraph()`
- Lines 1632-1656: Reference handling in `parseDelegation()`

## Approach

### 1. Remove Individual Reference Parsers (lines 960-1022)

**Remove:**
- `parseAgentReference()`
- `parseSkillReference()`
- `parseSectionReference()`
- `parseToolReference()`

**Add:**
```typescript
parseLink(): LinkNode {
  const token = this.expect(TokenType.LINK);
  return {
    type: 'Link',
    path: token.value.path,
    anchor: token.value.anchor,
    raw: token.raw,
    ...this.nodeLocation(token)
  };
}

parseAnchor(): AnchorNode {
  const token = this.expect(TokenType.ANCHOR);
  return {
    type: 'Anchor',
    name: token.value,
    ...this.nodeLocation(token)
  };
}
```

### 2. Update parsePrimary() (lines 838-850)

**Remove:**
```typescript
case TokenType.AGENT_REF:
  return this.parseAgentReference();
case TokenType.SKILL_REF:
  return this.parseSkillReference();
case TokenType.SECTION_REF:
  return this.parseSectionReference();
case TokenType.TOOL_REF:
  return this.parseToolReference();
```

**Add:**
```typescript
case TokenType.LINK:
  return this.parseLink();
case TokenType.ANCHOR:
  return this.parseAnchor();
```

### 3. Add Statement Parsers

```typescript
parseUseStatement(): UseStatement {
  this.expect(TokenType.USE);  // USE keyword
  const link = this.parseLink();
  
  let task: TaskNode | null = null;
  if (this.match(TokenType.TO)) {
    task = this.parseTask();
  }
  
  return {
    type: 'UseStatement',
    link,
    task,
    ...this.nodeLocation()
  };
}

parseExecuteStatement(): ExecuteStatement {
  this.expect(TokenType.EXECUTE);  // EXECUTE keyword
  const link = this.parseLink();
  
  let task: TaskNode | null = null;
  if (this.match(TokenType.TO)) {
    task = this.parseTask();
  }
  
  return {
    type: 'ExecuteStatement',
    link,
    task,
    ...this.nodeLocation()
  };
}

parseGotoStatement(): GotoStatement {
  this.expect(TokenType.GOTO);  // GOTO keyword
  const anchor = this.parseAnchor();
  
  return {
    type: 'GotoStatement',
    anchor,
    ...this.nodeLocation()
  };
}
```

### 4. Update parseDelegateStatement() (lines 1632-1656)

**Before:**
```typescript
parseDelegateStatement(): DelegateStatement {
  this.expect(TokenType.DELEGATE);
  const task = this.parseTask();
  this.expect(TokenType.TO);
  const target = this.parseAgentReference();  // or SkillReference
  ...
}
```

**After:**
```typescript
parseDelegateStatement(): DelegateStatement {
  this.expect(TokenType.DELEGATE);
  const task = this.parseTask();
  this.expect(TokenType.TO);
  const target = this.parseLink();
  
  let template: AnchorNode | null = null;
  if (this.match(TokenType.WITH)) {
    template = this.parseAnchor();
  }
  
  return {
    type: 'DelegateStatement',
    task,
    target,
    template,
    ...this.nodeLocation()
  };
}
```

### 5. Update parseParagraph() (lines 1569-1576)

Update inline reference handling to use LINK and ANCHOR tokens.

### 6. Add Keywords to Lexer

Ensure these keywords are recognized:
- `USE` 
- `EXECUTE`
- `GOTO`
- `WITH` (for `DELEGATE ... WITH #template`)

### 7. Update parseStatement()

Add cases for new statement types:
```typescript
case TokenType.USE:
  return this.parseUseStatement();
case TokenType.EXECUTE:
  return this.parseExecuteStatement();
case TokenType.GOTO:
  return this.parseGotoStatement();
```

## Hypothesis

Parser changes are mechanical once lexer and AST are updated:
1. Token type changes flow through naturally
2. New statements follow existing patterns
3. Error messages improve with path-based syntax

## Results

Implementation complete. Parser changes in `packages/core/src/parser/parser.ts`:

1. **Removed old reference parsers:** `parseAgentReference()`, `parseSkillReference()`, `parseSectionReference()`, `parseToolReference()`
2. **Added new parsers:**
   - `parseLink()` - parses LINK tokens, JSON decodes value to {path, anchor}
   - `parseAnchor()` - parses ANCHOR tokens
   - `parseUseStatement()` - parses `USE ~/skill/x TO /task/`
   - `parseExecuteStatement()` - parses `EXECUTE ~/tool/x TO /action/`
   - `parseGotoStatement()` - parses `GOTO #section`
   - `parseParameterBlock()` - parses indented parameter lists
3. **Updated `parseDelegateStatement()`:** New syntax `DELEGATE /task/ TO ~/agent/x [WITH #template]`
4. **Updated `parsePrimary()`:** LINK/ANCHOR token handling
5. **Updated `parseInlineText()`:** Stop conditions for LINK/ANCHOR
6. **Updated `parseParagraph()`:** LINK/ANCHOR in inline content
7. **Updated `parseDelegation()`:** Uses LinkNode/AnchorNode for target
8. **Updated `parseBlock()`:** Routes USE/EXECUTE/GOTO to new parsers

Parser compiles without errors. Compiler has 27 errors (expected - needs separate work package).

## Evaluation

Success criteria met:
- [x] Parser compiles without errors
- [x] `parseLink()` correctly parses JSON token value
- [x] `parseAnchor()` correctly extracts anchor name
- [x] New statement parsers follow existing patterns
- [x] `parseDelegateStatement()` updated for new syntax
- [x] Inline content handles LINK/ANCHOR tokens
