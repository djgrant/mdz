# v0.9 Parser Updates

## Goal

Parse new v0.9 syntax: RETURN, ASYNC/AWAIT DELEGATE, push operator, DO instruction, WITH syntax change, frontmatter declarations.

## Scope

- `packages/core/src/parser/parser.ts` (~1850 lines)

## Approach

### New Parse Methods

**parseReturnStatement():**
```typescript
private parseReturnStatement(): AST.ReturnStatement {
  const start = this.advance();  // consume RETURN
  
  let value: AST.Expression | undefined;
  if (!this.check('NEWLINE') && !this.isAtEnd()) {
    value = this.parseExpression();
  }
  
  return {
    kind: 'ReturnStatement',
    value,
    span: AST.mergeSpans(start.span, value?.span || start.span),
  };
}
```

**parseDoInstruction():**
```typescript
private parseDoInstruction(): AST.DoStatement {
  const start = this.advance();  // consume DO
  const instruction = this.parseSemanticMarker();
  
  return {
    kind: 'DoStatement',
    instruction,
    span: AST.mergeSpans(start.span, instruction.span),
  };
}
```

**parsePushStatement():**
```typescript
private parsePushStatement(target: AST.VariableReference): AST.PushStatement {
  this.advance();  // consume <<
  const value = this.parseExpression();
  
  return {
    kind: 'PushStatement',
    target,
    value,
    span: AST.mergeSpans(target.span, value.span),
  };
}
```

### parseBlock() Dispatch Updates (lines 347-460)

**Add after CONTINUE (line 397):**
```typescript
// v0.9: RETURN statement
if (this.check('RETURN')) {
  return this.parseReturnStatement();
}

// v0.9: ASYNC/AWAIT before DELEGATE
if (this.check('ASYNC') || this.check('AWAIT')) {
  return this.parseDelegateStatement();
}

// v0.9: DO instruction (not WHILE...DO)
if (this.check('DO')) {
  const lookahead = this.peek(1);
  if (lookahead?.type === 'SEMANTIC_MARKER') {
    return this.parseDoInstruction();
  }
}
```

**Modify DOLLAR_IDENT handling (lines 367-369):**
```typescript
if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
  // v0.9: Check for push operator <<
  const lookahead = this.peek(1);
  if (lookahead?.type === 'PUSH') {
    const target = this.parseVariableReference();
    return this.parsePushStatement(target);
  }
  return this.parseVariableOrType();
}
```

**Remove PARALLEL dispatch (lines 371-374):**
```typescript
// REMOVE:
// if (this.check('PARALLEL')) {
//   return this.parseParallelForEach();
// }
```

### parseDelegateStatement() Updates (lines 1318-1359)

```typescript
private parseDelegateStatement(): AST.DelegateStatement {
  const start = this.current();
  
  // v0.9: Check for ASYNC/AWAIT modifiers
  let async = false;
  let awaited = false;
  
  if (this.check('ASYNC')) {
    async = true;
    this.advance();
  } else if (this.check('AWAIT')) {
    awaited = true;
    this.advance();
  }
  
  this.expect('DELEGATE');
  
  // Task is optional
  let task: AST.SemanticMarker | undefined;
  if (this.check('SEMANTIC_MARKER')) {
    task = this.parseSemanticMarker();
  }
  
  // v0.9: TO is optional
  let target: AST.LinkNode | undefined;
  if (this.check('TO')) {
    this.advance();
    target = this.parseLink();
  }
  
  // WITH clause (unchanged)
  // ...existing WITH parsing...
  
  return {
    kind: 'DelegateStatement',
    task,
    target,
    async,
    awaited,
    withAnchor,
    parameters,
    span: AST.mergeSpans(start.span, end.span),
  };
}
```

### WITH Parameter Syntax (new method)

**Old syntax:** `- $param = value`
**New syntax:** `  param: value`

```typescript
private parseWithParam(): AST.WithParameter {
  // Expect identifier (no $ prefix, no list marker)
  const nameToken = this.expect('LOWER_IDENT');
  const name = nameToken?.value || '';
  
  this.expect('COLON');
  const value = this.parseExpression();
  
  return { kind: 'WithParameter', name, value, span };
}

private parseWithBlock(): AST.WithParameter[] {
  const params: AST.WithParameter[] = [];
  this.expect('COLON');
  this.skipNewlines();
  
  // Parse indented params until dedent
  while (this.check('INDENT') || this.checkIdent()) {
    if (this.check('INDENT')) this.advance();
    params.push(this.parseWithParam());
    this.skipNewlines();
  }
  
  return params;
}
```

### Frontmatter Parsing Updates (lines 53-252)

**parseFrontmatter() modifications:**
```typescript
private parseFrontmatter(): AST.Frontmatter | null {
  // ... existing parsing ...
  
  const parsed = this.parseYaml(content);
  
  // v0.9: Parse structured declarations
  const types = this.parseFrontmatterTypes(parsed.types);
  const input = this.parseFrontmatterInput(parsed.input);
  const context = this.parseFrontmatterContext(parsed.context);
  
  return {
    kind: 'Frontmatter',
    name: parsed.name || '',
    description: parsed.description || '',
    types,
    input,
    context,
    // ...existing fields...
  };
}

private parseFrontmatterTypes(typesYaml: Record<string, any>): AST.FrontmatterTypeDecl[] {
  if (!typesYaml) return [];
  return Object.entries(typesYaml).map(([name, def]) => ({
    kind: 'FrontmatterTypeDecl',
    name: name.replace(/^\$/, ''),
    typeExpr: this.parseTypeExprFromYaml(def),
    span: this.createDummySpan(),
  }));
}

private parseFrontmatterInput(inputYaml: Record<string, any>): AST.FrontmatterInputDecl[] {
  // Parse: $param: $Type = default
  // ...
}

private parseFrontmatterContext(contextYaml: Record<string, any>): AST.FrontmatterContextDecl[] {
  // Parse: $var: $Type = initial
  // ...
}
```

### Remove parseParallelForEach() (lines 1179-1203)

Delete entire method.

### RETURN Placement Validation

RETURN is only valid at:
1. End of a section (last block before next heading)
2. Last statement in loop body

**Validation helpers:**
```typescript
private isAtEndOfSection(): boolean {
  let i = 0;
  while (this.peek(i)?.type === 'NEWLINE') i++;
  const next = this.peek(i);
  return !next || next.type === 'HEADING' || next.type === 'EOF';
}
```

Note: Full validation deferred to compiler (wp-v0.9-compiler).

## Measures of Success

- [ ] RETURN statement parsing works
- [ ] ASYNC/AWAIT DELEGATE parsing works
- [ ] Push operator `<<` parsing works
- [ ] DO instruction parsing works
- [ ] New WITH syntax parsing works
- [ ] Frontmatter types/input/context parsed
- [ ] PARALLEL FOR EACH removed
- [ ] All parser tests pass

## Estimated Effort

40-50 hours (largest sub-package)
