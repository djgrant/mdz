# Link-Based References

## Goal/Problem

Remove sigils (`@`, `~`, `#`, `!`) entirely and treat references as **links** - markdown links with syntactic sugar. Validation becomes simple: does the file exist at the resolved path?

**Current syntax (v0.7):**
```mdz
uses:
  - @explore
  - ~work-packages

DELEGATE /task/ TO (@explore)
Execute (~work-packages) WITH:
```

**Proposed syntax (v0.8):**
```mdz
DELEGATE /task/ TO ~/agent/explore
USE ~/skill/work-packages TO /track iterations/
EXECUTE ~/tool/browser TO /screenshot/
```

## Design Decisions

### Core Model: References Are Links

References are workspace-relative paths using `~/` prefix. The `~` means "workspace root" (like shell home directory convention). Validation = file existence at resolved path.

### Reference Syntax

| Reference | Resolves to |
|-----------|-------------|
| `~/agent/architect` | `./agent/architect.mdz` |
| `~/skill/work-packages` | `./skill/work-packages.mdz` |
| `~/tool/browser` | `./tool/browser.mdz` |
| `~/skill/learnings#apply` | `./skill/learnings.mdz#apply` |
| `#section` | current file `#section` |

- Extension `.mdz` is optional (bare identifiers supported)
- `#section` remains for same-file anchors only

### Keywords

| Keyword | Purpose | Example |
|---------|---------|---------|
| `DELEGATE ... TO` | Spawn agent | `DELEGATE /task/ TO ~/agent/architect` |
| `USE` | Follow skill/section | `USE ~/skill/work-packages TO /track/` |
| `USE ... WITH` | Include template | `DELEGATE /task/ TO ~/agent/builder WITH #prompt` |
| `EXECUTE` | Invoke tool | `EXECUTE ~/tool/browser TO /screenshot/` |
| `GOTO` | Control flow to section | `GOTO #next-phase` |

### Type System

Single `Link` type - path determines the reference kind:

```mdz
$agents: Link[] = [~/agent/architect, ~/agent/critic]
```

Future: `Link<Agent>` for bare identifier disambiguation when inferred-prefix syntax is added.

### Filesystem Convention

Type determined by folder location:
- `agent/` or `agents/` → Agent
- `skill/` or `skills/` → Skill
- `tool/` or `tools/` → Tool

### What's Removed

- Sigils (`@`, `~`, `#`, `!`) for typed references
- `#` remains ONLY for same-file section anchors
- Frontmatter `uses:` - dependencies inferred from statements

## Scope

### Grammar & Spec Updates
- `spec/grammar.md` - Remove sigil productions, add link syntax with `~/` prefix
- `spec/language-spec.md` - Document link-based reference model

### Parser Changes
- `packages/core/src/parser/lexer.ts`
  - Remove: `AGENT_REF`, `SKILL_REF`, `SECTION_REF`, `TOOL_REF` tokens
  - Add: `LINK` token for `~/path/to/thing` and `~/path#anchor`
  - Keep: `ANCHOR` token for `#section` (same-file only)
  
- `packages/core/src/parser/ast.ts`
  - Simplify to `LinkNode` with path and optional anchor
  - Add `UseStatement`, `ExecuteStatement`, `GotoStatement` nodes
  
- `packages/core/src/parser/parser.ts`
  - Update `parseDelegateStatement()` - expect link after `TO`
  - Add `parseUseStatement()` - `USE link TO /task/`
  - Add `parseExecuteStatement()` - `EXECUTE link TO /action/`
  - Add `parseGotoStatement()` - `GOTO #section`

### Compiler Changes
- `packages/core/src/compiler/compiler.ts`
  - Remove frontmatter `uses:` parsing
  - Infer dependencies by scanning for links in statements
  - Validate links by resolving paths:
    - `~/agent/x` → check `./agent/x.mdz` exists
    - `~/skill/x#anchor` → check file exists AND anchor exists
    - `#anchor` → check anchor exists in current file

### LSP Updates
- `packages/lsp/src/server.ts`
  - Workspace scanning to index available `.mdz` files by folder
  - Path completion after `~/` prefix
  - Anchor completion after `#`
  - Go-to-definition for links
  - Error diagnostics: "file not found", "anchor not found"

### Test Updates
- All test files need syntax migration to link paths
- New tests for link resolution
- Tests for anchor validation
- Tests for path completion

### Example Updates
- All `.mdz` files in `examples/` need migration
- Ensure organized into `agent/`, `skill/`, `tool/` folders

### Documentation Updates
- Website docs
- README
- CHANGELOG with migration guide

## Open Questions

1. **Bare identifiers** - Should `DELEGATE TO architect` be sugar for `DELEGATE TO ~/agent/architect` when unambiguous? (Leave for future - start with explicit paths)

2. **Cross-project references** - What syntax for referencing files in other packages? e.g., `~package/agent/x`? (Leave for future)

3. **Manifest file** - Projects with non-standard folder structures may need a manifest to configure type resolution. (Leave for future)

4. **`Link<Type>` annotations** - When bare identifiers are added, may need `Link<Agent>` to disambiguate. (Leave for future)

## Hypothesis

Link-based references will:
1. Reduce syntactic noise (no sigils to remember, just paths)
2. Be intuitive (paths are familiar, `~/` echoes shell convention)
3. Simplify validation (file exists = valid reference)
4. Enable IDE features naturally (path completion, go-to-definition)
5. Support future extension (bare identifiers as sugar, cross-project refs)

## Results

*To be filled upon completion*

## Evaluation

*To be filled upon completion*
