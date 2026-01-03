# MDZ Roadmap

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
- Advanced contract checking (call site interface matching) - AST defined but not produced by parser
- Cross-skill type consistency checking - single-file type validation exists, cross-file does not
- Required parameter validation at call sites - `isRequired` parsing exists, no validation logic
- Incremental validation (per-file vs whole-project) - no caching or incremental logic

### 2. Macro System

**Status:** NOT IMPLEMENTED

Runtime control flow (IF, FOR EACH, WHILE, etc.) is fully implemented. Build-time macro system is not.

**Goal:** `{{IF}}` expansion to clean, single-path outputs.

**Ideas to explore:**
- When values known at build time → prune branches
- When unknown → split into variant files (dbt-style)
- What triggers variant selection at runtime?
- Should macros support loops? (`{{FOR EACH variant IN variants}}`)

**Open questions:**
- How do variants get named?
- How does the runtime know which variant to load?

### 3. Dependency Graph ✓ MOSTLY COMPLETE

Implemented in v0.3 compiler:
- ✓ Extract from `uses:` and `imports:` frontmatter
- ✓ Extract from inline `[[references]]`
- ✓ Cycle detection with `buildFullDependencyGraph()`
- ✓ CLI `graph` command with JSON/Mermaid/DOT output
- ✓ Basic visualization in playground (SVG-based, typed edges)

**Remaining opportunities:**
- Handle conditional dependencies (dependencies inside IF blocks treated same as unconditional)
- Impact analysis tooling (reverse dependency lookup: "What skills depend on X?")
- `getDependents()` API documented but not implemented

### 4. Playground Reimagining ✓ MOSTLY COMPLETE

**Implemented:**
- ✓ Validation catching errors with diagnostics panel
- ✓ Inline Monaco editor markers for issues
- ✓ Dependency graph visualization (SVG with typed edges)
- ✓ Pre-built scenarios demonstrating error types (valid, broken-ref, missing-type, undeclared, complex)
- ✓ Status bar with skill/reference/type counts
- ✓ Real-time validation via web worker

**Remaining opportunities:**
- Interactive tutorial (guided step-by-step walkthrough)
- Advanced graph features (click-to-navigate, zoom/pan, hierarchical layout)
- Compression ratio display (less relevant since source = output)

### 5. Benchmarks ✓ MOSTLY COMPLETE

**Implemented:**
- ✓ "Less prompt is better" - COMPLETE with Medium-High confidence
  - 2-3x token reduction with compact syntax
  - Task completion parity or better
- ✓ "LLM as runtime" - COMPLETE with High confidence
  - 86% success on deterministic control flow
  - 100% success on semantic conditions
  - 100% success on edge cases

**Remaining opportunities:**
- Collect real-world examples of validation errors caught (document what validator prevents)

### 6. OpenCode Integration

**Status:** NOT IMPLEMENTED

**Goal:** MDZ as a first-class authoring format for OpenCode skills.

**Ideas to explore:**
- Output structure matching OpenCode conventions
- Grammar preamble as part of skill loading
- Use mdz validation in skill authoring workflow

**What exists:**
- Full validation tooling (types, scope, references)
- CLI commands work standalone

**Assumptions:**
- OpenCode receives mdz source directly (since source = output)
- Validation happens during skill development, not at runtime

### 7. Spec Revision ⚠️ PARTIAL

**Goal:** Language spec that matches the vision.

**Implemented:**
- ✓ Remove expansion semantics (language-spec.md v0.3 has "Source = Output" principle)

**Remaining:**
- Clarify macro vs control flow distinction (control flow documented but macro distinction unclear)
- Document deterministic compilation constraints more explicitly
- Add preprocessing modes documentation (if applicable)
- Align grammar.md (v0.2) with language-spec.md (v0.3)

**Decided:**
- Version as v0.3
- No backward compatibility needed

### 8. Website & Documentation ⚠️ PARTIAL

**Goal:** Communicate the refined vision.

**Implemented:**
- ✓ Messaging reflects validator-first approach ("Tooling Catches Errors", "You Write → Tooling Validates → LLM Executes")
- ✓ Playground shows validation and dependency graphs
- ✓ Core concepts documentation accurate

**Needs updating:**
- Homepage CLI example shows `mdz build` but command is `mdz compile`
- API docs reference `validate()` and `build()` functions that don't exist (actual: `parse()`, `compile()`)
- Standardize CLI prefix (mdz vs mdz used inconsistently)
- Graph command signature documented as directory but takes file
- IDE/LSP docs marked "planned" but LSP server exists

### 9. Data Persistence in Markdown

**Status:** NOT IMPLEMENTED (exploratory)

**Goal:** Explore language constructs for persisting data within markdown documents.

**Ideas to explore:**
- Could skills define persistent state that survives across executions?
- What syntax would represent stored/cached values?
- How would this interact with version control?
- Is this a dead end or a genuine capability gap?

**Open questions:**
- What use cases require persistence that can't be handled externally?
- How would LLMs read/write persistent sections?
- Is this better solved at the runtime/platform level?

*Note: This may be a dead end, but worth exploring to understand the boundary between document and state.*

## Not On Roadmap

Things we're explicitly not pursuing now:

- Expansion for smaller models
- Runtime orchestration layer
- Type enforcement at runtime
- Visual/no-code authoring

## Sequencing Thoughts

Natural dependencies with tooling refactor complete:

1. ~~**Tooling refactor**~~ ✓ DONE - unblocks other work
2. ~~**Benchmarks**~~ ✓ MOSTLY DONE - core hypotheses validated
3. ~~**Playground**~~ ✓ MOSTLY DONE - demonstrates value proposition
4. **Spec revision** - needs alignment pass
5. **Website & Documentation** - needs accuracy pass

It's ok to CTRL+A DELETE. This is high-velocity experimental work.

This roadmap contains pins for explorations, not routes to destinations.
