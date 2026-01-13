# Link-Based References: Compiler Updates

## Goal/Problem

Update the compiler to validate link-based references by checking file existence and anchor validity, replacing frontmatter-based dependency declarations.

## Scope

**File:** `packages/core/src/compiler/compiler.ts`

**Lines to modify:**
- Lines 269-306: `extractMetadata()` - frontmatter parsing
- Lines 279-305: `declaredDeps`, `declaredAgents`, `declaredTools` Sets
- Lines 662-691: `buildDependencyGraph()` - uses frontmatter `uses:`
- Lines 815-889: `validateReferences()` - validates against declarations

## Approach

### 1. Remove Frontmatter uses: Parsing (lines 269-306)

**Remove from `extractMetadata()`:**
- Parsing of `uses:` field
- Population of `declaredDeps`, `declaredAgents`, `declaredTools` Sets

**Keep:**
- Other frontmatter fields (version, id, description, etc.)

### 2. Add Link Collection Phase

```typescript
interface CollectedLinks {
  links: LinkNode[];
  anchors: AnchorNode[];
}

collectLinks(ast: SkillNode): CollectedLinks {
  const links: LinkNode[] = [];
  const anchors: AnchorNode[] = [];
  
  // Walk AST and collect all LinkNode and AnchorNode instances
  walkAst(ast, (node) => {
    if (node.type === 'Link') links.push(node);
    if (node.type === 'Anchor') anchors.push(node);
  });
  
  return { links, anchors };
}
```

### 3. Update validateReferences() (lines 815-889)

**Remove:**
- Validation against `declaredDeps` set
- "Reference not declared in uses:" errors

**Add:**
```typescript
validateLinks(links: LinkNode[], workspaceRoot: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  
  for (const link of links) {
    // Resolve path: ~/agent/x → ./agent/x.mdz
    const resolvedPath = path.join(workspaceRoot, ...link.path) + '.mdz';
    
    // Check file exists
    if (!fs.existsSync(resolvedPath)) {
      diagnostics.push({
        severity: 'error',
        message: `File not found: ${link.raw}`,
        range: link.location,
        code: 'link-not-found'
      });
      continue;
    }
    
    // If link has anchor, validate anchor exists in target file
    if (link.anchor) {
      const targetAst = this.parseFile(resolvedPath);
      const sections = this.collectSections(targetAst);
      
      if (!sections.has(link.anchor)) {
        diagnostics.push({
          severity: 'error',
          message: `Section "${link.anchor}" not found in ${link.raw}`,
          range: link.location,
          code: 'anchor-not-found'
        });
      }
    }
  }
  
  return diagnostics;
}

validateAnchors(anchors: AnchorNode[], sections: Set<string>): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  
  for (const anchor of anchors) {
    if (!sections.has(anchor.name)) {
      diagnostics.push({
        severity: 'error',
        message: `Section "${anchor.name}" not found in current file`,
        range: anchor.location,
        code: 'anchor-not-found'
      });
    }
  }
  
  return diagnostics;
}
```

### 4. Update buildDependencyGraph() (lines 662-691)

**Remove:**
- Reading from frontmatter `uses:` field

**Replace with:**
```typescript
buildDependencyGraph(ast: SkillNode): DependencyGraph {
  const deps = new Set<string>();
  const { links } = this.collectLinks(ast);
  
  for (const link of links) {
    // Normalize to canonical path
    const depPath = link.path.join('/');
    deps.add(depPath);
  }
  
  return {
    file: ast.meta.id,
    dependencies: Array.from(deps)
  };
}
```

### 5. Add Workspace Context

```typescript
interface CompilerOptions {
  workspaceRoot: string;  // Required for path resolution
  // ... other options
}
```

### 6. Update Error Messages

Replace:
- "undeclared reference" → "file not found"
- "missing from uses:" → removed entirely

### 7. Folder-Based Type Inference

```typescript
inferLinkType(link: LinkNode): 'agent' | 'skill' | 'tool' | 'unknown' {
  const folder = link.path[0];
  if (['agent', 'agents'].includes(folder)) return 'agent';
  if (['skill', 'skills'].includes(folder)) return 'skill';
  if (['tool', 'tools'].includes(folder)) return 'tool';
  return 'unknown';
}
```

Use for semantic validation (e.g., DELEGATE target should be agent).

## Hypothesis

Compiler changes simplify validation:
1. File existence is binary and unambiguous
2. No need to track declared vs actual dependencies
3. Dependency graph derived directly from AST
4. Cross-file anchor validation provides real value

## Results

*To be filled upon completion*

## Evaluation

*To be filled upon completion*
