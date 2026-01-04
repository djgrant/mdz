---
size: sm
category: docs
---

# Content Audit - Code & Research Not on Website

## Goal/Problem

We have code, research, benchmarks, and documentation scattered across the repo that isn't surfaced on the website. For "build in public" transparency, this should be accessible.

## Scope

- Audit what exists in repo vs what's on website
- Identify gaps
- Recommend what should be surfaced

## Approach

1. Inventory existing content:
   - `benchmarks/` - BENCHMARK-REPORT.md
   - `spec/` - grammar.md, language-spec.md
   - `experiments/` - various explorations
   - `.opencode/work/completed/` - finished work packages
   - `ROADMAP.md`, `VISION.md`, `IDENTITY.md`
   - `CHANGELOG.md`

2. Check what's currently on website:
   - Docs pages
   - Examples page
   - Any linked resources

3. Gap analysis:
   - What's valuable but hidden?
   - What should remain internal?
   - What needs polish before publishing?

4. Recommend surfacing strategy:
   - Direct links to GitHub?
   - Rendered on website?
   - Summary pages with links?

## Hypothesis

Surfacing our work builds trust and demonstrates the "LLM building LLM tools" story.

## Results

### Inventory: What Exists in Repo

**Root-level documents:**
- `README.md` - Basic intro (links to website)
- `ROADMAP.md` - Comprehensive roadmap with status, issues backlog, exploration areas (318 lines)
- `VISION.md` - Core philosophy, design decisions, open questions (354 lines)
- `IDENTITY.md` - Brand guidelines, MDZ vs Zen naming (22 lines)
- `CHANGELOG.md` - Version history with detailed changes (202 lines)

**Specifications (`spec/`):**
- `grammar.md` - Formal EBNF grammar (511 lines) - NOW v0.3 aligned
- `language-spec.md` - Full language reference (664 lines)

**Benchmarks (`benchmarks/`):**
- `BENCHMARK-REPORT.md` - Validation of "less prompt is better" and "LLM as runtime" (230 lines)
  - Token efficiency data (2-3x reduction)
  - Control flow success rates
  - Semantic condition validation

**Examples (`examples/`):**
- `debugger.mdz` - Tracing and debugging skill
- `skill-composer.mdz` - Multi-skill composition
- `the-scientist.mdz` - Hypothesis-driven iteration
- `pr-reviewer.mdz` - NEW real-world example

**Experiments (`experiments/`):**
- `e1-syntax-a-minimal.md` - Syntax exploration
- `e1-syntax-b-tagged.md` - Tagged syntax variant
- `e1-syntax-c-twolayer-source.md` - Two-layer source model
- `e3-orchestrate-map-reduce.md` - Map-reduce pattern
- `e3-simplify-skill.md` - Simplification methodology
- `e4-work-packages.md` - Work package pattern
- `e5-enhancements.md` - Enhancement ideas
- `e6-database-optimization.md` - Database optimization

**Completed Work Packages (`.opencode/work/completed/`):**
- 36+ completed work packages documenting the entire development journey
- Notable: `wp-2026-01-03-genesis.md` - Origin story with patterns from the-scientist

### Inventory: What's on Website

**Docs pages (`website/src/pages/docs/`):**
- `index.astro` - Overview
- `getting-started.astro` - Quick start
- `syntax.astro` - Syntax reference
- `types.astro` - Type system
- `concepts.astro` - Core concepts
- `control-flow.astro` - Control flow
- `composition.astro` - Skill composition
- `higher-order.astro` - Higher-order skills
- `cli.astro` - CLI reference
- `api.astro` - API reference
- `ide.astro` - IDE support

**Examples page:**
- Links to playground with 4 examples (scientist, debugger, composer, hello world)

**Homepage:**
- Hero with core messaging
- "World's most powerful runtime" positioning
- Syntax at a glance
- Quick start instructions

### Gap Analysis

**HIGH VALUE - Should Surface:**

1. **Benchmark Report** - Validates core claims with data
   - "Less prompt is better" - 2-3x token reduction
   - "LLM as runtime" - 86-100% success rates
   - Status: NOT on website

2. **ROADMAP.md** - Shows project direction and transparency
   - Current state, exploration areas, issues backlog
   - Status: NOT on website

3. **VISION.md** - Explains design philosophy
   - Why source = output, why compact syntax, open questions
   - Status: NOT on website

4. **Genesis Work Package** - Origin story, patterns observed
   - Shows the-scientist as inspiration
   - Status: NOT on website

5. **Formal Specs** - For technical deep-dive
   - grammar.md, language-spec.md
   - Status: NOT linked from website

6. **PR Reviewer Example** - NEW real-world example
   - Status: NOT on examples page yet

**MEDIUM VALUE - Consider:**

7. **Experiments folder** - Shows exploration process
   - Could be "Research" or "Lab" section
   - Status: NOT on website

8. **CHANGELOG.md** - Version history
   - Status: NOT on website (could be on docs)

**LOW VALUE - Keep Internal:**

9. **Work packages** - Too granular for public
   - Keep as internal process artifact
   - Exception: Genesis WP for origin story

10. **IDENTITY.md** - Brand guidelines
    - Too meta for public consumption

### Surfacing Recommendations

**Strategy 1: GitHub Links (Quick Win)**
Add a "Resources" section to docs with GitHub links:
- Benchmark Report → `benchmarks/BENCHMARK-REPORT.md`
- Language Spec → `spec/language-spec.md`
- Grammar → `spec/grammar.md`
- Roadmap → `ROADMAP.md`
- Vision → `VISION.md`
- Changelog → `CHANGELOG.md`

**Strategy 2: Website Pages (Higher Effort)**
Create dedicated pages for:
- `/docs/benchmarks` - Render benchmark report
- `/docs/roadmap` - Render roadmap
- `/docs/vision` - Render vision

**Strategy 3: Examples Page Update**
Add PR Reviewer to examples page (immediate action)

**Strategy 4: "Lab" or "Research" Section (Future)**
- Surface experiments as exploration journal
- Shows "building in public" ethos

### Immediate Actions Recommended

1. Add PR Reviewer to examples page
2. Add "Resources" links section to docs index
3. Link to GitHub for specs, roadmap, vision, benchmarks
4. Consider rendering CHANGELOG in docs/changelog page

## Evaluation

**What's valuable but hidden:**
- Benchmark data (validates claims)
- Roadmap (shows transparency)
- Vision document (explains philosophy)
- Genesis story (demonstrates evolution)

**What should remain internal:**
- Most work packages (process artifacts)
- Brand guidelines (too meta)

**Recommended approach:**
- Start with GitHub links (low effort, high value)
- Consider rendered pages for benchmark and roadmap (medium effort)
- Create experiments/lab section later (lower priority)

The "build in public" story is compelling but currently invisible. Surfacing benchmarks and roadmap would significantly strengthen the value proposition by showing rigorous methodology behind the project.
