# Programmatic API

Use MDZ programmatically in your TypeScript or JavaScript projects.

## Installation

```bash
npm install zenmarkdown
```

## Parsing

```typescript
import { parse } from 'zenmarkdown';

const source = `---
name: my-skill
description: When you need to do something
---

## Workflow

1. Do the thing
`;

const ast = parse(source);

console.log(ast.frontmatter?.name);  // "my-skill"
console.log(ast.sections.length);    // 1
```

## Compiling

The primary use case: validate that a skill is correct before the LLM sees it.

```typescript
import { compile } from 'zenmarkdown';

const result = compile(source);

// Source is unchanged (no transformation)
console.log(result.output);  // === source

// Access validation results
for (const diag of result.diagnostics) {
  const prefix = diag.severity === 'error' ? 'x' : '!';
  console.log(`${prefix} [${diag.code}] ${diag.message}`);
}

// Access extracted metadata
console.log(result.metadata.types);
console.log(result.metadata.variables);
console.log(result.metadata.references);

// Access dependency graph
console.log(result.dependencies.nodes);
console.log(result.dependencies.edges);
```

### Compile Options

```typescript
interface CompileOptions {
  // Validate type references
  validateTypes?: boolean;

  // Validate variable scope
  validateScope?: boolean;

  // Validate skill/section references
  validateReferences?: boolean;

  // Include validation header comment
  includeHeader?: boolean;

  // Generate source map
  generateSourceMap?: boolean;
}
```

## AST Types

```typescript
import * as AST from 'zenmarkdown/ast';

// Document structure
interface Document {
  kind: 'Document';
  frontmatter: Frontmatter | null;
  sections: Section[];
  errors: ParseError[];
  span: Span;
}

// Section
interface Section {
  kind: 'Section';
  level: number;
  title: string;
  anchor: string;
  content: Block[];
  span: Span;
}
```

## Skill Registry

Create a registry for reference resolution:

```typescript
import { compile, createRegistry } from 'zenmarkdown';

const registry = createRegistry({
  'helper-skill': helperSource,
  'another-skill': anotherSource,
});

// Compile with registry for reference checking
const result = compile(source, {
  validateReferences: true,
});
```

## Tokenizer

```typescript
import { tokenize } from 'zenmarkdown';

const tokens = tokenize(source);
for (const token of tokens) {
  console.log(token.type, token.value);
}
```

## Dependency Graph

```typescript
import { buildFullDependencyGraph, createRegistry } from 'zenmarkdown';

const registry = createRegistry({
  'skill-a': sourceA,
  'skill-b': sourceB,
});

const graph = buildFullDependencyGraph(registry);

// Graph contains all nodes and edges
console.log(graph.nodes);  // ['skill-a', 'skill-b', ...]
console.log(graph.edges);  // [{ source: 'skill-a', target: 'skill-b', type: 'uses' }, ...]
```
