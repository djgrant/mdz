# Link-Based References: LSP Updates

## Goal/Problem

Update the Language Server Protocol implementation to support link-based references with workspace scanning, path completion, and file-based go-to-definition.

## Scope

**File:** `packages/lsp/src/server.ts`

**Lines to modify:**
- Line 166: `skillRegistry` - name-based, passive discovery
- Lines 408-438: `getDiagnostics()` - only checks skillRegistry
- Lines 444-493: `getDefinition()` - cross-document navigation
- Lines 499-569: `getHover()` - displays reference info
- Lines 575-794: `getCompletions()` - triggers on `(~`, `(@`, `(#`, `(!`

## Approach

### 1. Replace skillRegistry with Workspace Index (line 166)

**Remove:**
```typescript
private skillRegistry: Map<string, SkillInfo>;
```

**Add:**
```typescript
interface WorkspaceFile {
  path: string;           // Relative path: 'agent/architect.mdz'
  fullPath: string;       // Absolute path
  sections: string[];     // ['overview', 'approach']
  kind: 'agent' | 'skill' | 'tool' | 'unknown';
}

private workspaceIndex: Map<string, WorkspaceFile>;
```

### 2. Add Workspace Scanner

```typescript
async scanWorkspace(root: string): Promise<void> {
  this.workspaceIndex.clear();
  
  // Scan for .mdz files
  const files = await glob('**/*.mdz', { cwd: root });
  
  for (const file of files) {
    const fullPath = path.join(root, file);
    const content = await fs.readFile(fullPath, 'utf-8');
    const ast = this.parser.parse(content);
    
    // Extract sections
    const sections = ast.sections.map(s => s.name);
    
    // Determine kind from path
    const kind = this.inferKind(file);
    
    this.workspaceIndex.set(file.replace(/\.mdz$/, ''), {
      path: file,
      fullPath,
      sections,
      kind
    });
  }
}

inferKind(filePath: string): 'agent' | 'skill' | 'tool' | 'unknown' {
  const parts = filePath.split('/');
  if (['agent', 'agents'].includes(parts[0])) return 'agent';
  if (['skill', 'skills'].includes(parts[0])) return 'skill';
  if (['tool', 'tools'].includes(parts[0])) return 'tool';
  return 'unknown';
}
```

### 3. Update getCompletions() (lines 575-794)

**Remove:**
- Triggers on `(~`, `(@`, `(#`, `(!`
- Name-based completion from skillRegistry

**Add:**
```typescript
getCompletions(position: Position): CompletionItem[] {
  const lineText = this.getLineText(position);
  const beforeCursor = lineText.substring(0, position.character);
  
  // Check if we're completing a link path
  const linkMatch = beforeCursor.match(/~\/([a-z\/]*)$/);
  if (linkMatch) {
    const partial = linkMatch[1];
    return this.getPathCompletions(partial);
  }
  
  // Check if we're completing an anchor
  const anchorMatch = beforeCursor.match(/#([a-z-]*)$/);
  if (anchorMatch) {
    // Check if this is after a link (cross-file) or standalone (same-file)
    const linkBeforeAnchor = beforeCursor.match(/~\/([^\s#]+)#/);
    if (linkBeforeAnchor) {
      return this.getCrossFileAnchorCompletions(linkBeforeAnchor[1]);
    }
    return this.getSameFileAnchorCompletions();
  }
  
  return [];
}

getPathCompletions(partial: string): CompletionItem[] {
  const items: CompletionItem[] = [];
  
  for (const [key, file] of this.workspaceIndex) {
    if (key.startsWith(partial)) {
      items.push({
        label: '~/' + key,
        kind: CompletionItemKind.File,
        detail: file.kind,
        insertText: key.substring(partial.length)
      });
    }
  }
  
  return items;
}

getCrossFileAnchorCompletions(linkPath: string): CompletionItem[] {
  const file = this.workspaceIndex.get(linkPath);
  if (!file) return [];
  
  return file.sections.map(section => ({
    label: '#' + section,
    kind: CompletionItemKind.Reference,
    insertText: section
  }));
}
```

### 4. Update getDefinition() (lines 444-493)

```typescript
getDefinition(position: Position): Location | null {
  const node = this.getNodeAtPosition(position);
  
  if (node?.type === 'Link') {
    const linkPath = node.path.join('/');
    const file = this.workspaceIndex.get(linkPath);
    
    if (!file) return null;
    
    // If link has anchor, go to section
    if (node.anchor) {
      const sectionLine = this.findSectionLine(file.fullPath, node.anchor);
      return { uri: file.fullPath, range: { start: { line: sectionLine, character: 0 } } };
    }
    
    // Otherwise go to file start
    return { uri: file.fullPath, range: { start: { line: 0, character: 0 } } };
  }
  
  if (node?.type === 'Anchor') {
    // Same-file anchor
    const sectionLine = this.findSectionLine(this.currentFile, node.name);
    return { uri: this.currentFile, range: { start: { line: sectionLine, character: 0 } } };
  }
  
  return null;
}
```

### 5. Update getDiagnostics() (lines 408-438)

```typescript
getDiagnostics(document: TextDocument): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const ast = this.parser.parse(document.getText());
  const links = this.collectLinks(ast);
  
  for (const link of links) {
    const linkPath = link.path.join('/');
    const file = this.workspaceIndex.get(linkPath);
    
    if (!file) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: link.location,
        message: `File not found: ~/${linkPath}`,
        source: 'mdz'
      });
      continue;
    }
    
    if (link.anchor && !file.sections.includes(link.anchor)) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: link.location,
        message: `Section "${link.anchor}" not found in ~/${linkPath}`,
        source: 'mdz'
      });
    }
  }
  
  return diagnostics;
}
```

### 6. Update getHover() (lines 499-569)

```typescript
getHover(position: Position): Hover | null {
  const node = this.getNodeAtPosition(position);
  
  if (node?.type === 'Link') {
    const linkPath = node.path.join('/');
    const file = this.workspaceIndex.get(linkPath);
    
    if (!file) {
      return { contents: `**Not found:** ~/${linkPath}` };
    }
    
    return {
      contents: [
        `**${file.kind}:** ~/${linkPath}`,
        `Path: ${file.fullPath}`,
        file.sections.length ? `Sections: ${file.sections.join(', ')}` : ''
      ].filter(Boolean).join('\n\n')
    };
  }
  
  return null;
}
```

### 7. Add File Watcher

```typescript
onDidChangeWatchedFiles(changes: FileEvent[]): void {
  for (const change of changes) {
    if (change.type === FileChangeType.Created || change.type === FileChangeType.Changed) {
      this.updateWorkspaceFile(change.uri);
    } else if (change.type === FileChangeType.Deleted) {
      this.removeWorkspaceFile(change.uri);
    }
  }
}
```

## Hypothesis

LSP changes provide immediate developer experience improvements:
1. Path completion is intuitive (like filesystem navigation)
2. Go-to-definition works seamlessly across files
3. Diagnostics catch broken links in real-time
4. Workspace scanning makes all files discoverable

## Results

*To be filled upon completion*

## Evaluation

*To be filled upon completion*
