---
size: sm
category: website
---

# Website Messaging Alignment

## Goal/Problem

The website currently communicates the wrong value proposition. It emphasizes:
- "Compile to optimized prompts"
- "Transform for LLM consumption"
- "Expanded types and transformed markers"

The refined vision (VISION.md) establishes:
- "Source is the execution format"
- "Validate logical coherence before runtime"
- "Tooling that checks pieces fit - not transforming source to target"

This misalignment confuses potential users about what zen actually is.

## Scope

Primary:
- `/website/src/pages/index.astro` - Homepage messaging ✅
- `/website/src/pages/docs/index.astro` - Docs overview ✅
- `/website/src/pages/docs/getting-started.astro` - First impressions ✅
- `/website/src/pages/docs/concepts.astro` - Core concepts explanation ✅
- `/website/src/pages/docs/composition.astro` - Reference handling ✅
- `/website/src/pages/docs/types.astro` - Type system ✅
- `/website/src/pages/docs/cli.astro` - CLI reference ✅
- `/website/src/pages/docs/api.astro` - API reference ✅
- `/website/src/pages/playground.astro` - Interactive playground ✅

Deferred to Stream 3 (Playground):
- Playground-v2 already implements validation-focused approach

## Approach

### Phase 1: Homepage Revision ✅

**Hero section:**
- FROM: "Language for AI Agents" + "Write agent behaviors in readable markdown"
- TO: "Markdown for Multi-Agent Systems" + "Catch errors before the LLM sees them"

**Feature descriptions:**
- FROM: "Compile to optimized prompts"
- TO: "The LLM sees what you write—no hidden transformation layer"

**New section added:**
- "What Zen Catches" - showcasing validation value (missing refs, cycles, type mismatches, etc.)

### Phase 2: Docs Landing Page ✅

- Removed "Two-Layer Model" framing
- Added "The Validation Layer" concept
- Added "The Runtime" section (LLM is the runtime)

### Phase 3: Getting Started ✅

- Removed "expanded types and transformed markers"
- Reframed `zen check` as primary command (validation)
- Reframed `zen build` as preprocessing (optional, for macros)

### Phase 4: Core Concepts ✅

- Removed "Source Format vs Compiled Format" section
- Added "The LLM is the Runtime" as first concept
- Added "Build-time Validation" section
- Added "Source is the Execution Format" section

### Phase 5: Composition ✅

- Removed compile-time transformation language
- Reframed reference handling as optional preprocessing

### Phase 6: Types Page ✅ (NEW)

- Removed "Type Expansion" section entirely
- Added "Types as Contracts" section explaining build-time checking
- Added "What Tooling Checks" section

### Phase 7: CLI Page ✅ (NEW)

- Reordered: `check` is now primary command (was `compile`)
- Removed transformation flags (`--no-expand-types`, `--no-transform-sem`)
- Added "What It Checks" section listing validation capabilities
- Added `graph` command for dependency visualization
- Added CI/CD integration example

### Phase 8: API Page ✅ (NEW)

- Primary API is now `validate()` not `compile()`
- Removed `expandTypes`, `transformSemantics` options
- Added `validate()` with options for reference checking, contracts, cycles
- Added `build()` for optional preprocessing (reference inlining, macros)
- Added `buildDependencyGraph()` for analyzing skill relationships

### Phase 9: Playground Page ✅ (NEW)

- Removed "Compiled Output" panel
- Removed "Expand types", "Transform semantics", "Resolve refs" toggles
- Added "Validation" panel showing diagnostics
- Added "Structure" panel showing parsed AST
- Added insight messages explaining validation value
- Added "🔴 Broken Reference" example to demonstrate error catching
- Preprocessing options collapsed by default (de-emphasized)

## Key Messages Communicated

1. **"Zen extends markdown with signals for multi-agent systems"** ✅
   - Homepage description updated

2. **"Tooling catches errors before runtime - not during"** ✅
   - New "What Zen Catches" section on homepage
   - Validation framing throughout docs
   - Playground shows live validation

3. **"The LLM sees what you write (with optional preprocessing)"** ✅
   - Core concepts page lead with this
   - Getting started shows validation-first workflow
   - Types page: "$Task stays $Task"

4. **"The LLM is the runtime"** ✅
   - New section in core concepts
   - Referenced in docs overview

5. **"Composition over configuration"** ✅
   - Composition page updated

6. **"zen check is the primary workflow"** ✅
   - CLI page restructured
   - Getting started uses validation-first flow
   - API page leads with validate()

## Results

### Pages Updated (Session 2)

1. **docs/types.astro**
   - Removed: "Type Expansion" section with "When compiled, type references are expanded"
   - Added: "Types as Contracts" section showing build-time error catching
   - Added: "What Tooling Checks" explaining validation capabilities

2. **docs/cli.astro**
   - Removed: `compile` as primary command
   - Removed: `--no-expand-types`, `--no-transform-sem`, `--no-resolve-refs` flags
   - Added: `check` as primary command with "What It Checks" section
   - Added: `graph` command for dependency visualization
   - Added: CI/CD integration example

3. **docs/api.astro**
   - Removed: `compile()` with transformation options
   - Added: `validate()` as primary API
   - Added: `build()` for optional preprocessing only
   - Added: `buildDependencyGraph()` for dependency analysis

4. **playground.astro**
   - Removed: "Compiled Output" panel
   - Removed: "Expand types", "Transform semantics", "Resolve refs" checkboxes
   - Added: "Validation" panel with live error display
   - Added: "Structure" panel showing parsed skill structure
   - Added: Dynamic insight messages explaining errors
   - Added: "Broken Reference" example

### Build Verification

Site builds successfully (14 pages, 670ms)

## Evaluation

### What Changed (Complete Summary)

**Before (old messaging):**
- "Compile to optimized prompts"
- "Two-Layer Model: Source Format vs Compiled Format"
- "Compiled skill with expanded types and transformed markers"
- Primary command: `zen compile`
- Primary API: `compile()` with expandTypes, transformSemantics options
- Playground: Shows "Compiled Output" with transformation toggles

**After (new messaging):**
- "Catch errors before the LLM sees them"
- "The LLM is the runtime" + "The Validation Layer"
- "The LLM sees what you write"
- Primary command: `zen check`
- Primary API: `validate()` with contract checking options
- Playground: Shows "Validation" panel with live diagnostics

### Remaining Work

1. **Syntax highlighting in docs** - Code blocks don't have zen syntax highlighting yet

2. **Docs/syntax.astro** - Should review for any stale transformation references

3. **playground-v2** - Already well-designed for validation; could become the primary playground

### Design System Observations

- Typography and spacing are consistent across all pages
- Dark/light mode works well
- CSS custom properties used effectively for theming
- Mobile responsiveness handled via Tailwind classes

### Recommendations

1. Consider making playground-v2 the main playground (more polished validation UX)
2. Add syntax highlighting to code blocks in documentation
3. Review docs/syntax.astro for any remaining transformation language
