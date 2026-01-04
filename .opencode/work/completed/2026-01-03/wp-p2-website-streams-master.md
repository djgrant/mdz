---
size: lg
category: website
---

# Website Improvement Streams - Master Work Package

## Goal/Problem

Polish the zen website and playground across four improvement streams:
1. Homepage messaging - shift from "validator" to "LLM as runtime" vision
2. Docs design system - rationalize spacing, typography, layout
3. Playground autocomplete - intelligent suggestions based on document context
4. Header width fix - full-width content for full-width pages

## Context

Zen is a markdown extension language for multi-agent systems. The v0.3 refactor established that "the LLM is the runtime" - source is executed directly, no transformation. The website and playground need polish to communicate this vision.

## Scope

- Stream 1: `website/src/pages/index.astro`, `website/src/styles/global.css`
- Stream 2: `website/src/layouts/DocsLayout.astro`, `website/src/styles/global.css`, doc pages
- Stream 3: `website/src/pages/playground.astro`, `website/src/zen-worker-entry.ts`
- Stream 4: `website/src/components/Header.astro`

## Approach

Delegate each stream to a sub-agent via work packages:

### Stream 1: Homepage Messaging & Syntax Highlighting

**Current state:** "Catch errors before the LLM sees them" - validator-focused messaging.

**New direction:** Emphasize that zen is a NEW LANGUAGE that leverages LLMs as the world's most powerful runtime. This is more exciting than "catches errors."

**Tasks:**
- Update hero copy to lead with "LLM as runtime" vision
- Update feature descriptions accordingly  
- Add syntax highlighting to homepage code sample (currently plain `<pre>` tags)
- The code should show proper zen syntax coloring (keywords, types, variables, references)

### Stream 2: Docs Design System

**Current observations:**
- DocsLayout uses Tailwind prose classes but may need tightening
- Need to verify visual appearance and rationalize spacing/typography

**Tasks:**
- Review current layout visually
- Define clear spacing scale, type scale, component patterns
- Implement fixes to create cohesive design system

### Stream 3: Playground Autocomplete

**Current state:** Monaco editor with zen syntax highlighting but limited autocomplete.

**Goal:** Context-aware suggestions:
- After `$` - suggest defined variables and types from current document
- After `[[` - suggest skills from `uses:` declarations
- After `[[#` - suggest sections from current document

**Files:**
- `website/src/pages/playground.astro` - Monaco configuration
- `website/src/zen-worker-entry.ts` - Worker for LSP-like features

### Stream 4: Header Width Fix

**Issue:** When page content is full-width (e.g., playground), header content should also be full-width but is currently constrained by `max-w-[var(--max-width-content)]`.

**Tasks:**
- Make header width adapt to page type
- Maintain consistency with page content width

## Constraints

- Maintain dark/light mode support
- Keep experimental/honest tone
- Don't break existing functionality

## Sub-Work Packages

- [ ] wp-stream1-homepage-messaging.md
- [ ] wp-stream2-docs-design.md
- [ ] wp-stream3-playground-autocomplete.md
- [ ] wp-stream4-header-width.md

## Results

_To be filled as streams complete_

## Evaluation

_To be filled upon completion_
