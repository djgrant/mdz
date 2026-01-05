---
size: sm
category: language
parent: wp-p1-semantic-marker-syntax
---

# Update Documentation for Semantic Marker Syntax

## Goal/Problem

Update website documentation to reflect the new semantic marker syntax.

## Scope

- `website/src/pages/docs/syntax.astro`
- `website/src/pages/docs/concepts.astro`
- `website/src/pages/docs/types.astro`
- `website/src/pages/playground.astro` (example snippets)
- `README.md`
- Any other docs referencing `{~~}`

## Approach

### Documentation Updates

**syntax.astro:**
- Update semantic marker section
- Add inferred variables section
- Update examples

**concepts.astro:**
- Explain "LLM-inferred content" concept
- When to use `/marker/` vs `$/var/` vs `$var: /type/`

**types.astro:**
- Update semantic type syntax from `{~~description}` to `/description/`

**README.md:**
- Update any syntax examples

### New Content

Add section explaining the three forms:

1. **Semantic markers** `/thing/` - inline content the LLM interprets
2. **Inferred variables** `$/name/` - variables the LLM tracks without declaration
3. **Semantic types** `$var: /description/` - declared variables with semantic type annotation

### Editor Support

- Update `editors/vscode/syntaxes/zen.tmLanguage.json` for syntax highlighting
- Update `editors/zed/languages/mdz/highlights.scm`

## Hypothesis

Documentation updates are straightforward. Editor syntax highlighting may require careful regex work.

## Results

### Documentation Updated

**syntax.astro:**
- Replaced `{~~content}` with `/content/` syntax throughout
- Added new sections: "Inline Semantic Markers", "Inferred Variables", "Semantic Type Annotations"
- Updated "Semantic Variable Transformation" to "Semantic Type Annotations"

**concepts.astro:**
- Updated semantic marker reference from `{~~content}` to `/content/`, `$/name/`

**README.md:**
- Updated 4 occurrences of old syntax to new `/` syntax
- Added documentation for inferred variables `$/name/` and semantic types `$var: /description/`

**playground.astro:**
- Updated Monaco tokenizer to recognize `/content/` and `$/name/` patterns
- Added `variable.inferred` token styling in both dark and light themes
- Updated example skill with new syntax

### Editor Support Updated

**VS Code (zen.tmLanguage.json):**
- Replaced `{~~...}` pattern with two new patterns:
  - Inferred variables: `$/name/`
  - Semantic markers: `/content/`

**Zed (config.toml):**
- Replaced `{~~ }` auto-close with `/` auto-close

**Zed (README.md, highlights.scm):**
- Updated documentation to reflect new syntax
- Added comment documenting new syntax patterns

## Evaluation

- All documentation files updated consistently
- Example skills already had new syntax (confirmed via grep)
- Editor syntax highlighting supports both `/content/` and `$/inferred/` forms
- No remaining `{~~` in core documentation files
