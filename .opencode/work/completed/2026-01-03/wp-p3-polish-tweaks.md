---
size: sm
category: website
---

# MDZ Website & Repo Polish Tweaks

## Goal/Problem

Final polish pass on MDZ website messaging, styling, documentation, and repository cleanup before public release.

## Scope

- `website/src/pages/index.astro` - Homepage messaging
- `website/src/pages/playground.astro` - File extension references
- `website/src/pages/docs/*.astro` - Code block syntax highlighting
- `website/src/layouts/DocsLayout.astro` - Navigation update
- New: `website/src/pages/docs/higher-order.astro`

## Approach

Executed as parallel streams.

## Hypothesis

These are polish-level changes that will improve the professional appearance and messaging clarity of MDZ before public release. The structured language messaging better captures the value proposition for technical audiences.

## Results

### Stream 1: Docs Code Block Syntax Highlighting ✅
Updated all documentation pages to use CSS class-based syntax highlighting matching the homepage:
- `syntax.astro` - 15+ code blocks
- `concepts.astro` - 1 code block
- `getting-started.astro` - 1 code block
- `types.astro` - 8 code blocks
- `control-flow.astro` - 7 code blocks
- `composition.astro` - 10 code blocks
- `api.astro` - 1 code block
- `higher-order.astro` - 3 code blocks

CSS classes used: `.zen-type`, `.zen-variable`, `.zen-keyword`, `.zen-reference`, `.zen-semantic`, `.zen-string`, `.zen-comment`, `.zen-heading`

### Stream 2: Hero Bottom Margin ✅
Reduced spacing between hero and code example sections:
- Hero: `py-16 md:py-20` → `pt-16 pb-10 md:pt-20 md:pb-12`
- Code Example: `py-16 md:py-24` → `pt-8 pb-16 md:pt-12 md:pb-24`
- Net reduction: ~40% tighter layout

### Stream 3: Homepage Messaging ✅
Updated for technical audience:
1. "Write in Natural Language" → "Write in Structured Language"
   - New copy: "Express complex agent behaviors in a structured format that can be reasoned about, tested, and predicted. The structure is the specification."

2. Hero description updated:
   - New: "MDZ is a superset of markdown designed for LLMs. Define typed variables, control flow, and skill composition in a structured format that tooling validates and LLMs execute directly."

3. Removed marketing phrases:
   - "No more confused LLMs hitting broken references" → "catching structural issues before the LLM sees them"

### Stream 4: Playground .zen.md → .mdz ✅
Updated all 6 file extension references:
- `skill.zen.md` → `skill.mdz`
- All scenario names updated

### Stream 5: Higher-Order Skills Documentation ✅
Created `website/src/pages/docs/higher-order.astro`:
- What are higher-order skills
- Patterns: map-reduce, iteration, pipeline
- Example breakdown of the-scientist.mdz
- Template for higher-order skill structure
- Updated DocsLayout sidebar navigation
- Updated docs index with link

### Stream 6: GitHub Repo Rename ⏸️
Deferred - requires manual action by user to rename `djgrant/zen` → `djgrant/mdz`

## Evaluation

All implementation streams completed successfully. Build verified with 14 pages. The GitHub rename is the only remaining item and requires manual user action.
