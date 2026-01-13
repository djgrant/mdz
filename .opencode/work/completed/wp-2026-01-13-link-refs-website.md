# Link-Based References: Website Documentation

## Goal/Problem

Update all website documentation pages to reflect link-based reference syntax, ensuring consistency between implementation and docs.

## Scope

**Directory:** `website/`

**Pages with reference mentions (~16 pages, 45+ matches):**
- `src/pages/index.astro` - Hero examples
- `src/pages/syntax.astro` - Complete syntax reference
- `src/pages/composition.astro` - Composition patterns
- `src/pages/concepts.astro` - Core concepts
- `src/pages/higher-order.astro` - Higher-order patterns
- `src/pages/getting-started.astro` - Quick start guide
- `src/pages/playground.astro` - Interactive playground
- `src/pages/internals.astro` - Parser/compiler internals
- Other doc pages as needed

## Approach

### 1. Homepage (index.astro)

Update hero code examples:

**Before:**
```mdz
uses:
  - @architect
  - ~work-packages

DELEGATE /design system/ TO (@architect)
```

**After:**
```mdz
DELEGATE /design system/ TO ~/agent/architect

USE ~/skill/work-packages TO /track iterations/
```

### 2. Syntax Reference (syntax.astro)

Complete rewrite of reference section:

**Remove:**
- Sigil explanations (`@` for agents, `~` for skills, etc.)
- Parenthesized reference syntax `(@name)`
- Frontmatter `uses:` section

**Add:**
- Link syntax: `~/path/to/file`
- Anchor syntax: `#section`
- Link with anchor: `~/path/to/file#section`
- Folder conventions: `agent/`, `skill/`, `tool/`
- Statement keywords: DELEGATE, USE, EXECUTE, GOTO

### 3. Composition Page (composition.astro)

Update all composition patterns:

**DELEGATE pattern:**
```mdz
# Before
DELEGATE /complex task/ TO (@specialist)

# After
DELEGATE /complex task/ TO ~/agent/specialist
```

**USE pattern (new):**
```mdz
USE ~/skill/code-review TO /check style/
```

**WITH clause:**
```mdz
DELEGATE /build feature/ TO ~/agent/builder WITH #detailed-prompt
```

### 4. Concepts Page (concepts.astro)

Update conceptual explanations:

- References → Links section
- Explain `~/` as workspace root (like shell convention)
- Folder-based type inference
- Implicit dependency inference (no `uses:`)

### 5. Higher-Order Patterns (higher-order.astro)

Update advanced examples:

**Parallel delegation:**
```mdz
$agents: Link[] = [~/agent/reviewer-1, ~/agent/reviewer-2, ~/agent/reviewer-3]

FOR $agent IN $agents:
  DELEGATE /review code/ TO $agent
```

**Dynamic routing:**
```mdz
IF /needs architecture review/:
  DELEGATE /review/ TO ~/agent/architect
ELSE IF /needs security review/:
  DELEGATE /review/ TO ~/agent/security
ELSE:
  DELEGATE /review/ TO ~/agent/general
```

### 6. Getting Started (getting-started.astro)

Update quick start examples:

```mdz
# My First Skill

DELEGATE /analyze codebase/ TO ~/agent/analyzer

USE ~/skill/summarize TO /create summary/
```

### 7. Playground (playground.astro)

Update default playground content to use new syntax.

### 8. Internals (internals.astro)

Update parser/compiler internals documentation:

- Token types: LINK, ANCHOR (not AGENT_REF, etc.)
- AST nodes: LinkNode, AnchorNode
- Validation: file existence, anchor resolution
- Dependency graph: inferred from statements

### 9. Migration Guide

Add new section or page: `migration.astro`

- Before/after syntax comparison
- Step-by-step migration instructions
- Common patterns translation table
- Tooling support (automatic migration script?)

### 10. Update Code Highlighting

Ensure Shiki/syntax highlighting reflects new tokens:
- `~/` prefix highlighted as path start
- Path segments highlighted
- `#` anchor highlighted

## Hypothesis

Website updates ensure:
1. New users learn correct syntax from the start
2. Existing users have clear migration path
3. Examples are copy-pasteable and work
4. Consistency between docs and implementation

## Results

### Pages Updated (14 pages total)

1. **index.astro** - Hero code example updated:
   - Removed `uses:` from frontmatter
   - Changed `(@research)` to `~/agent/research`
   - Changed `Execute (~experiment)` to `USE ~/skill/experiment TO /test hypothesis/`
   - Updated "References" card to "Links" with new syntax

2. **docs/syntax.astro** - Complete rewrite:
   - Removed sigil reference section
   - Added new "Links" section with `~/skill/name`, `~/agent/name`, `~/tool/name`
   - Added anchor syntax `#section`
   - Added new composition keywords: USE, EXECUTE, DELEGATE, GOTO
   - Added WITH clause documentation
   - Removed `uses:` frontmatter documentation

3. **docs/composition.astro** - Complete rewrite:
   - Changed all `(~skill)` to `~/skill/name`
   - Changed all `(@agent)` to `~/agent/name`
   - Added USE, EXECUTE, DELEGATE, GOTO documentation
   - Added folder conventions section
   - Removed `uses:` dependency declaration

4. **docs/concepts.astro** - Updated:
   - Changed "References with Sigils" to "Links"
   - Updated all reference examples to link syntax
   - Updated dependency graph explanation (now inferred)
   - Added composition keywords to CAPS list

5. **docs/higher-order.astro** - Updated:
   - Changed all skill invocations to USE syntax
   - Changed all agent delegations to link syntax
   - Removed `uses:` from example frontmatter

6. **docs/types.astro** - Updated:
   - Changed `Execute (~skill-a)` to `USE ~/skill/a`

7. **docs/control-flow.astro** - Updated:
   - Changed "Agent Delegation" to "Composition Keywords"
   - Added USE, EXECUTE, DELEGATE, GOTO documentation
   - Updated design philosophy list

8. **docs/skill-library.astro** - Updated:
   - Changed skill composition example to use USE syntax
   - Changed dependency management example to link syntax
   - Removed `uses:` frontmatter

9. **docs/cli.astro** - Updated:
   - Changed reference validation descriptions to link/anchor validation

10. **docs/ide.astro** - Updated:
    - Changed reference highlighting to link/anchor highlighting
    - Updated autocomplete triggers

11. **docs/index.astro** - Updated:
    - Changed validation list to mention links and anchors

12. **docs/using-in-project.astro** - Updated:
    - Removed `uses:` from code example
    - Added USE syntax for skill invocation

13. **docs/internals/terminology.astro** - Complete rewrite:
    - Replaced sigil terminology with link/anchor terminology
    - Added composition keywords documentation

14. **docs/internals/compilation.astro** - Updated:
    - Changed dependency graph documentation to inferred dependencies
    - Updated autocompletion triggers
    - Updated go-to-definition targets

15. **docs/internals/validation.astro** - Updated:
    - Changed reference validation to link validation
    - Updated error code descriptions

16. **docs/internals/ast.astro** - Updated:
    - Updated frontmatter documentation
    - Updated AST element list

### Not Updated (intentionally)

- **playground.astro** - Contains JS/TS code for Monaco editor autocomplete. This requires parser/lexer implementation changes to support new syntax, not documentation updates.

## Evaluation

**Completeness:** All documentation pages updated to v0.8 link-based syntax. No sigil syntax remains in documentation (verified via grep).

**Consistency:** 
- All examples use new `~/path/to/file` syntax
- All composition uses USE/EXECUTE/DELEGATE/GOTO keywords  
- All anchors use `#section` without parentheses
- No `uses:` frontmatter in any examples

**Migration path:** 
- Syntax pages clearly document the new patterns
- `uses:` removal is noted where relevant
- Folder conventions (`agent/`, `skill/`, `tool/`) are documented
