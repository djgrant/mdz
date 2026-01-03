# Zen Roadmap

> How we move from current state to the refined vision.

This roadmap outlines areas for exploration, not a fixed sequence. Each area may reveal insights that reshape priorities.

## Current State (v0.3)

**Tooling Refactor: COMPLETE** ✓

The compiler has been refactored to validator-first approach:
- ✓ Source = Output (no transformations)
- ✓ Metadata extraction (types, variables, references, sections)
- ✓ Dependency graph extraction from `uses:` and `[[refs]]`
- ✓ Cycle detection across skill graphs
- ✓ Type validation (warns on undefined type references)
- ✓ Reference validation (warns on undeclared skills, errors on broken local sections)
- ✓ Source maps for IDE integration
- ✓ CLI updated with `check`, `graph`, and validation commands
- ✓ 155 tests passing

Old expansion-based compiler preserved in `compiler.ts.backup`.

## Areas for Exploration

### 1. Tooling Refactor ✓ COMPLETE

See "Current State" above.

**Remaining opportunities:**
- Advanced contract checking (call site interface matching)
- Cross-skill type consistency checking
- Required parameter validation at call sites
- Incremental validation (per-file vs whole-project)

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

### 3. Dependency Graph ✓ BASIC COMPLETE

Implemented in v0.3 compiler:
- ✓ Extract from `uses:` and `imports:` frontmatter
- ✓ Extract from inline `[[references]]`
- ✓ Cycle detection with `buildFullDependencyGraph()`
- ✓ CLI `graph` command with JSON/Mermaid/DOT output

**Remaining opportunities:**
- Visualization in playground
- Handle conditional dependencies
- Impact analysis tooling

### 4. Playground Reimagining

**Goal:** Demonstrate zen's actual value proposition.

**Ideas to explore:**
- Show validation catching errors (NOW POSSIBLE with v0.3)
- Show dependency graph visualization (NOW POSSIBLE - graph data available)
- Show compression ratio (source lines vs inlined output)
- Show preprocessing modes (if implemented)

**Open questions:**
- What demonstrations will create a "penny-drop" moment?
- Should there be elements of an interactive tutorial?

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
- Use zen validation in skill authoring workflow

**Assumptions:**
- OpenCode receives zen source directly (since source = output)
- Validation happens during skill development, not at runtime

### 7. Spec Revision

**Goal:** Language spec that matches the vision.

**Ideas to explore:**
- Remove expansion semantics ✓ (done in implementation)
- Clarify macro vs control flow distinction
- Document deterministic compilation constraint
- Add preprocessing modes

**Decided:**
- Version as v0.3
- No backward compatibility needed

### 8. Website & Documentation

**Goal:** Communicate the refined vision.

**Ideas to explore:**
- Update messaging to reflect validator-first approach
- Update playground to show validation, dependency graphs
- Documentation reflecting actual tooling behavior

## Not On Roadmap

Things we're explicitly not pursuing now:

- Expansion for smaller models
- Runtime orchestration layer
- Type enforcement at runtime
- Visual/no-code authoring

## Sequencing Thoughts

Natural dependencies with tooling refactor complete:

1. ~~**Tooling refactor**~~ ✓ DONE - unblocks other work
2. **Benchmarks** can now proceed
3. **Playground** has the tooling data it needs
4. **Spec revision** can document what's implemented

It's ok to CTRL+A DELETE. This is high-velocity experimental work.

This roadmap contains pins for explorations, not routes to destinations.
