# Implement DELEGATE Keyword in Parser and Compiler

## Goal/Problem

Implement the DELEGATE keyword feature in the MDZ parser and compiler:
1. Add DELEGATE token to lexer
2. Add DelegateStatement AST node
3. Add parsing logic for DELEGATE statements
4. Add compiler validation for agents frontmatter
5. Update frontmatter parsing to support `skills:` and `agents:`

## Scope

- `packages/core/src/parser/ast.ts`
- `packages/core/src/parser/lexer.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/compiler/compiler.ts`

## Approach

### AST Changes (ast.ts)

Add new AST node:
```typescript
export interface DelegateStatement extends BaseNode {
  kind: 'DelegateStatement';
  agent: Expression;  // Agent reference ($agent or "agent-name")
  task: Expression;   // The task being delegated
  parameters: VariableDeclaration[];  // WITH clause parameters
}
```

Update Block type:
```typescript
export type Block =
  | ...existing...
  | DelegateStatement;
```

Update Frontmatter interface:
```typescript
export interface Frontmatter extends BaseNode {
  kind: 'Frontmatter';
  name: string;
  description: string;
  skills: string[];    // renamed from 'uses'
  agents: string[];    // NEW: declared subagents
  tools: string[];     // external tools
  uses: string[];      // deprecated, kept for backward compatibility
  imports: ImportDeclaration[];
  raw: Record<string, unknown>;
}
```

### Lexer Changes (lexer.ts)

Add DELEGATE and TO tokens:
```typescript
export type TokenType =
  | ...existing...
  | 'DELEGATE'
  | 'TO';

// In keywords mapping:
const keywords: Record<string, TokenType> = {
  ...existing...,
  'DELEGATE': 'DELEGATE',
  'TO': 'TO',
};
```

### Parser Changes (parser.ts)

1. Update parseYaml() to handle skills/agents/tools
2. Add parseDelegateStatement() method
3. Update parseBlock() to check for DELEGATE keyword

```typescript
private parseDelegateStatement(): AST.DelegateStatement {
  const start = this.advance(); // DELEGATE
  
  // Handle "DELEGATE $task TO $agent" form
  if (!this.check('TO')) {
    const task = this.parseExpression();
    this.expect('TO');
    const agent = this.parseExpression();
    return { kind: 'DelegateStatement', agent, task, parameters: [], span: ... };
  }
  
  // Handle "DELEGATE TO $agent:" form with WITH clause
  this.expect('TO');
  const agent = this.parseExpression();
  this.expect('COLON');
  const parameters = this.parseWithParams();
  return { kind: 'DelegateStatement', agent, task: null, parameters, span: ... };
}
```

### Compiler Changes (compiler.ts)

1. Update extractMetadata() to handle skills/agents
2. Add validateAgentReferences() to check DELEGATE targets
3. Update declaredDeps tracking for both skills and agents

## Hypothesis

The implementation follows existing patterns (PARALLEL FOR EACH, BREAK/CONTINUE) and should integrate cleanly with the validator-first architecture.

## Results

Successfully implemented the DELEGATE keyword feature:

### AST Changes (`packages/core/src/parser/ast.ts`)
- Added `DelegateStatement` interface with `agent`, `task`, and `parameters` fields
- Updated `Block` type to include `DelegateStatement`
- Updated `Frontmatter` interface to add `skills`, `agents`, `tools` fields
- Maintained backward compatibility with `uses` field

### Lexer Changes (`packages/core/src/parser/lexer.ts`)
- Added `'DELEGATE'` and `'TO'` to `TokenType`
- Added them to the keywords mapping in `scanIdentOrKeyword()`

### Parser Changes (`packages/core/src/parser/parser.ts`)
- Updated `parseFrontmatter()` to parse `skills:`, `agents:`, `tools:` from frontmatter
- Added `parseDelegateStatement()` method supporting two forms:
  1. `DELEGATE $task TO $agent` (inline form)
  2. `DELEGATE TO $agent:` with optional WITH clause
- Updated `parseBlock()` and list item parsing to handle DELEGATE keyword

### Compiler Changes (`packages/core/src/compiler/compiler.ts`)
- Added `agents: string[]` and `tools: string[]` to `DocumentMetadata`
- Added `declaredAgents` tracking set
- Added `extractFromDelegateStatement()` for metadata extraction
- Added `validateDelegateStatements()` with warning W003 for undeclared agents
- Updated scope validation to check DELEGATE expressions

### LSP Fix (`packages/lsp/src/server.ts`)
- Fixed type annotation handling to support both `TypeReference` and `SemanticType`

### Verified
- Build passes: `pnpm build:packages` succeeds
- Tested parsing of DELEGATE statements
- Tested frontmatter agent extraction
- Tested compiler warning for undeclared agents

## Evaluation

Implementation is complete and follows the existing patterns in the codebase. The DELEGATE keyword is now a first-class citizen in MDZ, distinct from the existing `Delegation` type (which handles verb-based delegation like "Execute [[skill]]").
