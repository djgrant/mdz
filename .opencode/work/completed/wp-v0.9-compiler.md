# v0.9 Compiler Updates

## Goal

Add validation for new v0.9 constructs and remove PARALLEL FOR EACH handling.

## Scope

- `packages/core/src/compiler/compiler.ts` (~1000 lines)

## Approach

### New Validation Methods

**validateReturnStatements():**
```typescript
private validateReturnStatements(ast: AST.Document): void {
  const returnStmts: Array<{ stmt: AST.ReturnStatement; parent: AST.Block[] }> = [];
  this.findReturnStatements(ast.sections, returnStmts);
  
  for (const { stmt, parent } of returnStmts) {
    const isLastInParent = parent[parent.length - 1] === stmt;
    if (!isLastInParent) {
      this.addDiagnostic({
        severity: 'error',
        code: 'E018',
        message: 'RETURN must be at end of section or loop iteration',
        span: stmt.span,
      });
    }
  }
}

private findReturnStatements(
  sections: AST.Section[],
  results: Array<{ stmt: AST.ReturnStatement; parent: AST.Block[] }>
): void {
  for (const section of sections) {
    this.findReturnInBlocks(section.content, section.content, results);
  }
}

private findReturnInBlocks(
  blocks: AST.Block[],
  parent: AST.Block[],
  results: Array<{ stmt: AST.ReturnStatement; parent: AST.Block[] }>
): void {
  for (const block of blocks) {
    if (block.kind === 'ReturnStatement') {
      results.push({ stmt: block, parent });
    } else if (block.kind === 'ForEachStatement' || block.kind === 'WhileStatement') {
      // In loops, RETURN can be at end of body
      this.findReturnInBlocks(block.body, block.body, results);
    } else if (block.kind === 'IfStatement') {
      this.findReturnInBlocks(block.thenBody, block.thenBody, results);
      if (block.elseBody) {
        this.findReturnInBlocks(block.elseBody, block.elseBody, results);
      }
    }
  }
}
```

**validatePushStatements():**
```typescript
private validatePushStatements(ast: AST.Document): void {
  const pushStmts = this.findPushStatements(ast.sections);
  
  for (const stmt of pushStmts) {
    // Check target is defined
    if (!this.definedVariables.has(stmt.target.name)) {
      this.addDiagnostic({
        severity: 'error',
        code: 'E007',
        message: `Variable '${stmt.target.name}' used before definition`,
        span: stmt.target.span,
      });
    }
    // Note: Array type validation deferred to v0.10 type constraints
  }
}
```

### Modify validateDelegateAgent() (lines 940-952)

```typescript
private validateDelegateAgent(deleg: AST.DelegateStatement): void {
  // v0.9: Target is optional
  if (!deleg.target) {
    // No validation needed - runtime picks agent
    return;
  }
  
  // Existing validation for when target IS present
  const linkKind = AST.getLinkKind(deleg.target);
  if (linkKind !== 'agent') {
    this.addDiagnostic({
      severity: 'warning',
      code: 'W003',
      message: `DELEGATE target should be ~/agent/..., got ${deleg.target.raw}`,
      span: deleg.target.span,
    });
  }
}
```

### Modify extractMetadata() (lines 269-327)

```typescript
private extractMetadata(ast: AST.Document): void {
  if (ast.frontmatter) {
    // Existing: name, description
    
    // v0.9: Extract types from frontmatter
    for (const typeDecl of ast.frontmatter.types) {
      this.definedTypes.add(typeDecl.name);
      this.metadata.types.set(typeDecl.name, {
        name: typeDecl.name,
        definition: typeDecl.typeExpr,
        span: typeDecl.span,
      });
    }
    
    // v0.9: Extract input parameters from frontmatter
    for (const inputDecl of ast.frontmatter.input) {
      this.definedVariables.add(inputDecl.name);
      this.metadata.parameters.push({
        name: inputDecl.name,
        type: inputDecl.type,
        required: inputDecl.required,
        defaultValue: inputDecl.defaultValue,
        span: inputDecl.span,
      });
    }
    
    // v0.9: Extract context variables from frontmatter
    for (const contextDecl of ast.frontmatter.context) {
      this.definedVariables.add(contextDecl.name);
      this.metadata.variables.push({
        name: contextDecl.name,
        type: contextDecl.type,
        initialValue: contextDecl.initialValue,
        span: contextDecl.span,
      });
    }
  }
}
```

### Remove PARALLEL FOR EACH Handling

**Locations to update:**
- `extractFromBlock()` (lines 343-345): Remove case
- `extractFromControlFlow()` (lines 435-453): Remove handling
- `checkScopeInBlocks()` (lines 767-778): Remove case
- `findDelegateStatementsInBlocks()` (lines 920-937): Remove case
- `findDelegationsInBlocks()` (lines 974-989): Remove case

### Add compile() Integration (lines 228-246)

```typescript
compile(source: string, options?: CompileOptions): CompileResult {
  // ... existing setup ...
  
  this.extractMetadata(ast);
  this.buildDependencyGraph(ast);
  this.validateTypes(ast);
  this.validateScope(ast);
  this.validateReferences();
  this.validateContracts(ast);
  this.validateDelegateStatements(ast);
  this.validateReturnStatements(ast);    // v0.9: NEW
  this.validatePushStatements(ast);       // v0.9: NEW
  
  // ...
}
```

### New Error Codes

Add to diagnostic messages:
- `E018`: "RETURN must be at end of section or loop iteration"
- `E019`: "Push target must be an array" (deferred to v0.10)
- `W004`: "ASYNC DELEGATE result not collected" (optional warning)

## Measures of Success

- [ ] RETURN placement validation works
- [ ] Push statement validation works
- [ ] Optional DELEGATE target handled
- [ ] Frontmatter declarations extracted to symbol tables
- [ ] PARALLEL FOR EACH handling removed
- [ ] All compiler tests pass

## Estimated Effort

16-24 hours
