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

- [ ] Internals section with 5 pages
- [ ] Terminology/glossary is discoverable
- [ ] Navigation updated
- [ ] No broken links
- [ ] Content preserved from original page

## Results

{To be filled out upon completion}
