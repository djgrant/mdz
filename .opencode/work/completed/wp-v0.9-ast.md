# v0.9 AST Updates

## Goal

Add new AST node types and modify existing interfaces for v0.9.

## Scope

- `packages/core/src/parser/ast.ts` (570 lines)

## Approach

### New Interfaces

**ReturnStatement (insert ~line 330):**
```typescript
// v0.9: RETURN statement
// Syntax: RETURN [$value]
export interface ReturnStatement extends BaseNode {
  kind: 'ReturnStatement';
  value?: Expression;
}
```

**PushStatement:**
```typescript
// v0.9: Push statement
// Syntax: $array << value
export interface PushStatement extends BaseNode {
  kind: 'PushStatement';
  target: VariableReference;
  value: Expression;
}
```

**DoStatement:**
```typescript
// v0.9: DO instruction
// Syntax: DO /prose instruction/
export interface DoStatement extends BaseNode {
  kind: 'DoStatement';
  instruction: SemanticMarker;
}
```

**Frontmatter Declaration Types (insert ~line 65):**
```typescript
// v0.9: Type declaration in frontmatter
export interface FrontmatterTypeDecl extends BaseNode {
  kind: 'FrontmatterTypeDecl';
  name: string;
  typeExpr: TypeExpr;
}

// v0.9: Input parameter in frontmatter
export interface FrontmatterInputDecl extends BaseNode {
  kind: 'FrontmatterInputDecl';
  name: string;
  type?: TypeExpr;
  defaultValue?: Expression;
  required: boolean;
}

// v0.9: Context variable in frontmatter
export interface FrontmatterContextDecl extends BaseNode {
  kind: 'FrontmatterContextDecl';
  name: string;
  type?: TypeExpr;
  initialValue?: Expression;
}
```

### Modified Interfaces

**DelegateStatement (lines 335-341):**
```typescript
export interface DelegateStatement extends BaseNode {
  kind: 'DelegateStatement';
  task?: SemanticMarker;
  target?: LinkNode;              // v0.9: Now OPTIONAL
  withAnchor?: AnchorNode;
  parameters?: ParameterBlock;
  async?: boolean;                // v0.9: ASYNC modifier
  awaited?: boolean;              // v0.9: AWAIT modifier
}
```

**Frontmatter (lines 46-56):**
```typescript
export interface Frontmatter extends BaseNode {
  kind: 'Frontmatter';
  name: string;
  description: string;
  // v0.9: Declarations moved from body sections
  types: FrontmatterTypeDecl[];
  input: FrontmatterInputDecl[];
  context: FrontmatterContextDecl[];
  // Existing fields (may be deprecated)
  skills: string[];
  agents: string[];
  tools: string[];
  uses: string[];
  imports: ImportDeclaration[];
  raw: Record<string, unknown>;
}
```

### Block Union Update (lines 78-95)

```typescript
export type Block =
  | TypeDefinition
  | VariableDeclaration
  | ForEachStatement
  // REMOVED: | ParallelForEachStatement
  | WhileStatement
  | IfStatement
  | BreakStatement
  | ContinueStatement
  | ReturnStatement           // v0.9: NEW
  | PushStatement             // v0.9: NEW
  | DoStatement               // v0.9: NEW
  | DelegateStatement
  | UseStatement
  | ExecuteStatement
  | GotoStatement
  | Delegation
  | Paragraph
  | CodeBlock
  | List
  | HorizontalRule;
```

### Remove

- `ParallelForEachStatement` interface (lines 294-300)
- `ParallelForEachStatement` from Block union
- `ParallelForEachStatement` from `isLoopStatement()` (lines 543-546)
- `ParallelForEachStatement` from `isControlFlow()` (lines 538-541)

### New Error Codes (lines 486-503)

```typescript
| 'E018' // RETURN not at end of section/loop
| 'E019' // Push target not array
| 'E020' // AWAIT without assignment
```

### New Type Guards

```typescript
export function isReturnStatement(node: BaseNode): node is ReturnStatement {
  return node.kind === 'ReturnStatement';
}

export function isPushStatement(node: BaseNode): node is PushStatement {
  return node.kind === 'PushStatement';
}

export function isDoStatement(node: BaseNode): node is DoStatement {
  return node.kind === 'DoStatement';
}
```

## Measures of Success

- [ ] New interfaces defined
- [ ] DelegateStatement modified for async/optional target
- [ ] Frontmatter extended for declarations
- [ ] ParallelForEachStatement removed
- [ ] Block union updated
- [ ] Type guards added
- [ ] TypeScript compiles without errors

## Estimated Effort

3-4 hours
