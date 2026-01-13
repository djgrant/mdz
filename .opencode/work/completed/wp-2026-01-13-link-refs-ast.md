# Link-Based References: AST Updates

## Goal/Problem

Simplify AST node types from four reference types to a unified `LinkNode`, and add nodes for new statement types (USE, EXECUTE, GOTO).

## Scope

**File:** `packages/core/src/parser/ast.ts`

**Lines to modify:**
- Lines 160-178: Expression union type
- Lines 222-245: Reference node definitions
- Lines 527-530: `isReference()` type guard

## Approach

### 1. Replace Reference Nodes (lines 222-245)

**Remove:**
```typescript
interface AgentReference extends BaseNode {
  type: 'AgentReference';
  name: string;
}

interface ToolReference extends BaseNode {
  type: 'ToolReference';
  name: string;
}

interface SkillReference extends BaseNode {
  type: 'SkillReference';
  name: string;
}

interface SectionReference extends BaseNode {
  type: 'SectionReference';
  name: string;
}
```

**Add:**
```typescript
interface LinkNode extends BaseNode {
  type: 'Link';
  path: string[];           // ['agent', 'architect']
  anchor: string | null;    // 'section' or null
  raw: string;              // '~/agent/architect#section'
}

interface AnchorNode extends BaseNode {
  type: 'Anchor';
  name: string;             // 'section-name'
}
```

### 2. Update Expression Union (lines 160-178)

**Remove from union:**
- `AgentReference`
- `ToolReference`
- `SkillReference`
- `SectionReference`

**Add to union:**
- `LinkNode`
- `AnchorNode`

### 3. Add Statement Nodes

```typescript
interface UseStatement extends BaseNode {
  type: 'UseStatement';
  link: LinkNode;
  task: TaskNode | null;  // Optional TO /task/
}

interface ExecuteStatement extends BaseNode {
  type: 'ExecuteStatement';
  link: LinkNode;
  task: TaskNode | null;  // Optional TO /task/
}

interface GotoStatement extends BaseNode {
  type: 'GotoStatement';
  anchor: AnchorNode;
}
```

### 4. Update DelegateStatement

```typescript
interface DelegateStatement extends BaseNode {
  type: 'DelegateStatement';
  task: TaskNode;
  target: LinkNode;         // Was: AgentReference | SkillReference
  template: AnchorNode | null;  // Optional WITH #section
}
```

### 5. Update Type Guards (lines 527-530)

**Remove:**
```typescript
function isReference(node: Node): node is AgentReference | ToolReference | SkillReference | SectionReference {
  return ['AgentReference', 'ToolReference', 'SkillReference', 'SectionReference'].includes(node.type);
}
```

**Add:**
```typescript
function isLink(node: Node): node is LinkNode {
  return node.type === 'Link';
}

function isAnchor(node: Node): node is AnchorNode {
  return node.type === 'Anchor';
}
```

### 6. Update Statement Union

Add new statement types to the Statement union type.

### 7. Helper Functions

```typescript
// Resolve link to file path
function resolveLinkPath(link: LinkNode): string {
  return link.path.join('/') + '.mdz';
}

// Get reference kind from path
function getLinkKind(link: LinkNode): 'agent' | 'skill' | 'tool' | 'unknown' {
  const folder = link.path[0];
  if (folder === 'agent' || folder === 'agents') return 'agent';
  if (folder === 'skill' || folder === 'skills') return 'skill';
  if (folder === 'tool' || folder === 'tools') return 'tool';
  return 'unknown';
}
```

## Hypothesis

Simplified AST provides:
1. Single node type for external references (less branching in compiler)
2. Path array enables easy folder-based type inference
3. Raw string preserved for error messages
4. Statement nodes cleanly separate concerns

## Results

Implementation complete. AST changes in `packages/core/src/parser/ast.ts`:

1. **Removed old reference types:** `AgentReference`, `ToolReference`, `SkillReference`, `SectionReference`
2. **Added new link-based types:** `LinkNode`, `AnchorNode`
3. **Added new statement types:** `UseStatement`, `ExecuteStatement`, `GotoStatement`, `ParameterBlock`
4. **Updated `DelegateStatement`:** Now uses `target: LinkNode`, `task: SemanticMarker`, optional `withAnchor?: AnchorNode`, optional `parameters?: ParameterBlock`
5. **Updated type unions:** `Expression`, `InlineContent`, `Block` all updated with new types
6. **Added helper functions:** `isLink()`, `isAnchor()`, `resolveLinkPath()`, `getLinkKind()`

Parser compiles without errors. Compiler has 27 errors (expected - needs separate work package).

## Evaluation

Success criteria met:
- [x] AST compiles without errors
- [x] LinkNode with path[], anchor, raw properties
- [x] AnchorNode with name property  
- [x] New statement nodes follow BaseNode pattern
- [x] DelegateStatement updated with new structure
- [x] Helper functions for link manipulation
