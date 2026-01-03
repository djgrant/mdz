# Zen Roadmap

> How we move from current state to the refined vision.

This roadmap outlines areas for exploration, not a fixed sequence. Each area may reveal insights that reshape priorities.

## Current State

A very early stage prototype that will be barely representative of what we're moving to.

- Parser and compiler exist but do transformations we no longer want (type expansion, semantic marker transformation)
- Website and playground exist but demonstrate the wrong value proposition
- 148 tests, most testing behaviors we're moving away from
- Language spec (v0.2) needs revision to match new vision

## Areas for Exploration

### 1. Tooling Refactor

**Goal:** Parser for validation, not transformation.

**Ideas to explore:**
- Strip compiler of expansion logic, keep only preprocessing (macros, grammar preamble, reference inlining)
- Implement contract checking: do call sites match declared interfaces?
- Build dependency graph extraction from `uses:` and `[[refs]]`
- Consider: should validation be incremental (per-file) or whole-project?

**Open questions:**
- How strict? Errors vs warnings?
- What's the error message UX?

### 2. Macro System

**Goal:** `{{IF}}` expansion to clean, single-path outputs.

**Ideas to explore:**
- When values known at build time → prune branches
- When unknown → split into variant files (dbt-style)
- What triggers variant selection at runtime?
- Should macros support loops? (`{{FOR EACH variant IN variants}}`)

**Open questions:**
- How do variants get named?
- How does the runtime know which variant to load?

### 3. Dependency Graph

**Goal:** Visualize and validate module relationships.

**Ideas to explore:**
- Extract graph from `uses:` declarations and `[[references]]`
- Cycle detection
- Visualization output (Mermaid, DOT, interactive)
- Integration with playground

**Open questions:**
- Include runtime delegations or just static refs?
- How to handle conditional dependencies?

### 4. Playground Reimagining

**Goal:** Demonstrate zen's actual value proposition.

**Ideas to explore:**
- Show preprocessing modes (grammar preamble vs natural language)
- Show macro expansion / variant splitting
- Show dependency graph visualization
- Show validation catching errors before runtime
- Show compression ratio (source lines vs inlined output)

**Open questions:**
- What demonstrations will create a "penny-drop" moment?
- Should there be elements of an interactive tutorial as well as a sandbox?

### 5. Benchmarks

**Goal:** Validate core assumptions.

**Ideas to explore:**
- "Less prompt is better" - compare compact vs expanded prompts on same tasks
- "LLM as runtime" - can LLMs reliably execute control flow constructs?
- "Deterministic checking catches real bugs" - collect examples of errors caught

**Open questions:**
- What tasks/scenarios to benchmark?
- What metrics matter?

### 6. OpenCode Integration

**Goal:** Zen as a first-class authoring format for OpenCode skills.

**Ideas to explore:**
- Output structure matching OpenCode conventions
- Grammar preamble as part of skill loading

**Assumptions:**
- OpenCode does not need to understand zen, it just receives compiled output?
- Precompilation happens by compiling files into an .opencode directory

### 7. Spec Revision

**Goal:** Language spec that matches the vision.

**Ideas to explore:**
- Remove expansion semantics
- Clarify macro vs control flow distinction
- Document deterministic compilation constraint
- Add preprocessing modes

**Decided:**
- Version as v0.3
- No need to maintain any backward compatibility

### 8. Website & Documentation

**Goal:** Communicate the refined vision.

**Ideas to explore:**
- Update messaging
- UI design system
- Documentation reflecting actual tooling behavior

**Open questions:**
- What's the primary audience? (developers building MAS)
- What's the learning path?

## Not On Roadmap

Things we're explicitly not pursuing now:

- Expansion for smaller models
- Runtime orchestration layer
- Type enforcement at runtime
- Visual/no-code authoring

## Sequencing Thoughts

No fixed order, but some natural dependencies:

1. **Tooling refactor** unblocks most other work
2. **Benchmarks** could validate or invalidate assumptions early
3. **Playground** depends on having the right tooling to demonstrate
4. **Spec revision** should follow experimentation, not lead it

It's ok to CTRL+A DELETE. This is high-velocity experimental work.

This roadmap contains pins for explorations, not routes to destinations.
