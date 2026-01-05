---
size: md
category: docs
---

# Internals Section Restructure

## Goal/Problem

Current website has a single "Language Internals" page. Need to:
1. Create an "Internals" section with multiple pages
2. Split current internals content into focused pages
3. Add Terminology/Glossary page

## Current State

- `website/src/pages/docs/internals.astro` - Single page covering AST, compilation, etc.

## Target State

```
website/src/pages/docs/internals/
  index.astro        - Internals overview/landing
  ast.astro          - AST structure and node types
  compilation.astro  - Compilation pipeline
  validation.astro   - Validation passes and error codes
  terminology.astro  - Glossary of terms (from spec)
```

## Scope

- Create `website/src/pages/docs/internals/` directory
- Split `internals.astro` into multiple pages
- Add `terminology.astro` with glossary from `spec/language-spec.md`
- Update navigation/sidebar
- Update any links to old internals page

## Content Mapping

### From current internals.astro:
- "How it Works" → `index.astro` (overview)
- "Parsing" → `ast.astro`
- "Compilation" → `compilation.astro`
- "Validation" → `validation.astro`

### New content:
- Terminology glossary from spec → `terminology.astro`

## Implementation

1. Create internals directory
2. Create index.astro with overview and links to sub-pages
3. Extract AST content to ast.astro
4. Extract compilation content to compilation.astro
5. Extract validation content to validation.astro
6. Create terminology.astro from spec glossary
7. Update DocsLayout sidebar navigation
8. Redirect or update old internals.astro

## Acceptance Criteria

- [x] Internals section with 5 pages
- [x] Terminology/glossary is discoverable
- [x] Navigation updated
- [x] No broken links
- [x] Content preserved from original page

## Results

### Completed: 2026-01-05

Successfully restructured the website's internals section from a single page into 5 focused pages.

### Changes Made

1. **Created `website/src/pages/docs/internals/` directory** with 5 pages:
   - `index.astro` - Overview with architecture pipeline, implementation challenges, and contributor pathways
   - `ast.astro` - Lexical analysis, parser architecture, grammar productions, and AST node types
   - `compilation.astro` - Source=Output principle, metadata extraction, skill registry, dependency graph, LSP integration
   - `validation.astro` - 5-stage validation pipeline with concrete error examples and error code reference
   - `terminology.astro` - Complete glossary from spec/language-spec.md covering sigils, delimiters, keywords, operators, document structure, type forms, variable forms, control flow, and composition

2. **Updated `DocsLayout.astro`**:
   - Added new "Internals" navigation section with links to all 5 pages
   - Removed "Language Internals" from the Language section
   - Navigation now shows: Overview, AST Structure, Compilation, Validation, Terminology

3. **Removed old `website/src/pages/docs/internals.astro`** - replaced by new directory structure

### Verification

- Website builds successfully (`pnpm build`)
- All 5 internals pages generated in dist/
- No broken links
- All content from original page preserved and expanded
- Navigation updated with proper active states
