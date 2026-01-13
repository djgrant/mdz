# Reference Syntax Refactor

## Goal/Problem

Refactor MDZ reference syntax from `[[wiki-links]]` to a sigil-based `(reference)` system that:
1. Distinguishes agents, skills, tools, and sections explicitly
2. Uses consistent sigils in both frontmatter declaration and body references
3. Unifies `skills:`, `agents:`, `tools:` into single `uses:` field
4. Is markdown-safe (parentheses don't conflict with markdown rendering)

## Design

### Sigils

| Sigil | Meaning | Declaration | Reference |
|-------|---------|-------------|-----------|
| `@` | Agent | `- @explore` | `(@explore)` |
| `~` | Skill | `- ~work-packages` | `(~work-packages)` |
| `#` | Section | n/a | `(#section)` |
| `!` | Tool | `- !browser` | `(!browser)` |

### Frontmatter

```yaml
---
name: orchestrator
description: Coordinate exploration and analysis
uses:
  - @explore
  - @architect
  - ~work-packages
  - !browser
---
```

### Body Syntax

```mdz
DELEGATE /initial research/ TO (@explore)

Execute (~work-packages) WITH:
  - $name = "analysis"

Use (!browser) to verify the result

See (#methodology) for the approach

Cross-skill section: (~other-skill#section)
```

### Variables

```mdz
$selectedAgent = (@explore)
DELEGATE /task/ TO $selectedAgent

FOR EACH $agent IN [(@architect), (@critique)]:
  DELEGATE /review/ TO $agent
```

## Scope

### Spec Updates
- `spec/grammar.md` - New reference productions, remove `[[]]`
- `spec/language-spec.md` - New reference documentation

### Parser Changes
- `packages/core/src/parser/lexer.ts`
  - Remove: `DOUBLE_LBRACKET`, `DOUBLE_RBRACKET` tokens
  - Add: `AGENT_REF`, `SKILL_REF`, `SECTION_REF`, `TOOL_REF` tokens
  - Pattern: `(` + sigil + identifier + `)` with optional `#section` for skills
  
- `packages/core/src/parser/ast.ts`
  - Update `SkillReference` to parse from `(~skill)`
  - Update `SectionReference` to parse from `(#section)`
  - Add `AgentReference` node
  - Add `ToolReference` node
  
- `packages/core/src/parser/parser.ts`
  - Rewrite `parseReference()` for new syntax
  - Update `parseDelegateStatement()` to expect `(@agent)` after TO
  - Handle cross-skill sections: `(~skill#section)`

### Compiler Changes
- `packages/core/src/compiler/compiler.ts`
  - Update frontmatter parsing for unified `uses:` with sigils
  - Validate `@` refs against declared agents
  - Validate `~` refs against declared skills
  - Validate `!` refs against declared tools
  - Update dependency extraction

### LSP Updates
- `packages/lsp/src/server.ts`
  - Update hover/completion for new syntax

### Test Updates
- All test files need updating for new syntax
- New tests for each reference type

### Example Updates
- All `.mdz` files in `examples/`
- All examples in `website/`

### Documentation Updates
- `website/src/pages/docs/composition.astro`
- `website/src/pages/docs/syntax.astro`
- `website/src/pages/index.astro`
- Other docs as needed

## Approach

### Phase 1: Parser Foundation
1. Update lexer with new token types
2. Update AST with new node types
3. Update parser for new syntax
4. Update compiler validation

### Phase 2: Backward Compatibility (Optional)
- Keep `[[]]` parsing with deprecation warning
- Or: clean break, remove entirely

### Phase 3: Migration
1. Update all examples
2. Update all tests
3. Update all documentation
4. Update website

## Breaking Changes

This is a **major breaking change**:
- All `[[skill]]` references become invalid
- All `[[#section]]` references become invalid
- Frontmatter `skills:`, `agents:`, `tools:` replaced by `uses:`
- DELEGATE syntax changes from `TO "agent"` to `TO (@agent)`

Recommend versioning as v0.7 or v1.0.

## Hypothesis

The sigil-based syntax will be:
1. More explicit about reference types
2. Easier to parse and validate
3. More consistent (declaration mirrors reference)
4. Safer in markdown contexts

## Results

The v0.7 reference syntax refactor has been successfully completed. All components updated:

### Completed Work

1. **Specs Updated** (grammar.md, language-spec.md)
   - New sigil-based reference productions
   - Unified `uses:` frontmatter field
   - Updated all examples and terminology

2. **Parser Foundation** (lexer.ts, ast.ts, parser.ts)
   - New tokens: AGENT_REF, SKILL_REF, SECTION_REF, TOOL_REF
   - New AST nodes: AgentReference, ToolReference
   - Updated reference parsing for new syntax
   - Fixed DELEGATE statement parameter parsing

3. **Compiler Updates** (compiler.ts)
   - Unified `uses:` frontmatter parsing with sigil extraction
   - Validation for agent, skill, and tool references
   - Updated dependency extraction

4. **LSP Updates** (server.ts)
   - New hover info for all reference types
   - Updated completions for `(~`, `(@`, `(#`, `(!` triggers
   - Updated reference tracking

5. **Test Updates** (8 test files)
   - All `[[]]` syntax replaced with sigil-based syntax
   - Updated frontmatter to use unified `uses:` field
   - Updated assertions and test descriptions

6. **Examples Migration** (25 MDZ files)
   - All example files updated to v0.7 syntax
   - Frontmatter migrated to unified `uses:` format

7. **Documentation Updates** (README, ROADMAP, VISION, CHANGELOG)
   - CHANGELOG includes migration guide
   - All documentation reflects new syntax

8. **Website Updates** (16 Astro pages)
   - Landing page, playground, and all docs updated
   - Syntax highlighting and autocomplete updated

9. **Version Bump**
   - All packages updated to v0.7.0

### Files Modified

- Specs: 2 files
- Parser/Compiler: 4 files
- LSP: 1 file
- Tests: 8 files
- Examples: 25 files
- Docs: 4 files
- Website: 16 files
- Config: 4 files (package.json)

### Verification

- All packages build successfully
- Full v0.7 syntax parses without errors
- Frontmatter correctly extracts skills, agents, and tools from unified `uses:` field

## Evaluation

**Hypothesis Confirmed:**

1. **More explicit** - Sigils make reference types immediately visible: `(@agent)` vs `(~skill)`
2. **Easier to parse** - Single-character sigil lookahead disambiguates reference types
3. **More consistent** - Declaration (`- @explorer`) mirrors usage (`(@explorer)`)
4. **Markdown-safe** - Parentheses don't conflict with markdown rendering

**Design Decision Made:**
- Clean break approach (no backward compatibility with `[[]]`)
- This simplifies the parser and avoids confusing mixed syntax

**Lessons Learned:**
- Unified `uses:` field with sigils is cleaner than separate `skills:`/`agents:`/`tools:` fields
- Sigil prefix extraction from frontmatter values is straightforward
- The migration was mechanical but extensive - touched nearly every file in the project
