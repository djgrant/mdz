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

### 9. Persistent State Interface

**Status:** DESIGN PHASE

**Goal:** Define how MDZ skills can declare persistent state, without mandating a specific storage backend.

#### The Design Question

MDZ needs to support skills that persist data across executions. The question is: should MDZ define the storage mechanism, or just the interface?

**Our position:** MDZ defines the *interface*, not the implementation.

#### Potential Syntax Approaches

```mdz
# Option A: Explicit backend reference
PERSIST $tasks TO [[beads]]
PERSIST $learnings TO [[markdown-store]]

# Option B: Declare persistence, runtime decides
$tasks: $Task[] (persistent)

# Option C: Persistent sections
## State (persistent)
$completed_items: $Item[]
$learning_log: $String[]
```

The skill author declares *what* persists. The runtime/platform decides *how*.

#### Storage Backend Comparison

We evaluated several approaches for persistent state:

**SQLite + JSONL (e.g., Beads)**
- Pros: Fast indexed queries, dependency graphs, transactions, multi-agent safe
- Cons: Data not human-editable, requires CLI for all interactions, sync daemon complexity
- Best for: Complex queries, relationships between items, high-volume data

**Markdown Files**
- Pros: Human readable/editable, git-friendly, shared ownership, browsable in editor
- Cons: Queries require parsing all files, no transactions, relationships are awkward
- Best for: Human-agent collaboration, simple state, <500 items

**Hybrid (Markdown + Query Tool)**
- Pros: Human editable, efficient queries via filename metadata, no daemon
- Cons: Limited query complexity, no relationships
- Best for: Structured task tracking, roadmaps, backlogs

#### Performance Analysis

File system operations vs SQLite at scale:

| Scale | Files | Directory listing | SQLite query |
|-------|-------|-------------------|--------------|
| Small | 10-100 | instant | overkill |
| Medium | 100-1,000 | <100ms | <5ms |
| Large | 1,000-10,000 | 100-500ms | <10ms |
| Very Large | 10,000+ | 1s+ | <50ms |

**Key insight:** The scaling wall for markdown isn't item count—it's query complexity and relationships.

- Simple priority/status queries: Markdown scales to ~1,000 items comfortably
- "What blocks X?" queries: Need indexed storage regardless of count
- Dependency graphs: Need structured storage from the start

#### Decision Framework

Choose **markdown** when:
- Humans need to browse/edit directly
- State is simple (priority, status, tags)
- Items are independent (no dependency graphs)
- Count stays under ~500

Choose **structured storage** (SQLite/Beads) when:
- Queries involve relationships ("what depends on X?")
- Multi-agent concurrent writes
- Count exceeds ~1,000
- Complex filtering/aggregation needed

Choose **hybrid** when:
- Want human editability AND efficient queries
- Metadata fits in filenames
- No complex relationships needed

#### For MDZ

The language should be agnostic. A skill might declare:

```mdz
---
persists:
  - $task_queue
  - $completed_items
---
```

The runtime binds this to whatever storage backend is configured. This keeps skills portable across different execution environments.

**Open questions:**
- What's the minimal interface MDZ needs to define?
- How do skills declare schema for persistent state?
- Should MDZ support querying persistent state, or leave that to the runtime?

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

---

## Issues & Ideas Backlog

### Issues (bugs/fixes)

- [ ] Fix all type assignment references to use `:` not `=`
- [ ] Check all code examples to ensure they make sense and are meaningful
- [x] Replace remaining "zen" references with "MDZ" in prose and `mdz` in code

### Tooling Ideas

- [ ] **Prompt-to-MDZ** - Convert natural language prompts to efficient MDZ syntax (for those who prefer writing in English)
- [ ] **Unit testing framework** - Test workflows with mock data; vitest and/or evalite compatibility
- [ ] **Execution tracing** - Observe how LLM interpreted the program, what paths it took. Dump for analysis. Investigate: fork evalite or build on vitest?
- [ ] **Model comparison** - Compare performance between different models
- [ ] **Production observability** - Shallow exploration of monitoring/debugging in production
- [ ] **Zed extension** - Editor support for Zed

### Documentation Ideas

- [ ] **Advanced language spec section** - Deep dive on how it works under the hood
- [ ] **Documentation review** - Full audit of how well docs explain the concepts
- [ ] **Real-world example** - Something that shows a genuine, compelling use case

### Research

- [ ] **Onboarding flow** - Optimal ways to get developers started. What should the flow be?
- [ ] **UX research** - Does user understand proposition in 3 seconds? Tech at high level in 30 seconds? Ship something in 30 minutes? (aim lower)

### Marketing & Growth

- [ ] **Stickiness exploration** - What workflows should we suggest to make the tool really sticky?
- [ ] **HN post strategy** - Approach beyond usual "best timing" advice
- [ ] **Audience capture** - Email list, followers, Discord? Target: developers
- [ ] **GitHub stars** - Strategy to grow visibility

### Transparency & Build in Public

- [ ] **Everything on website** - Knowledge graph, roadmap, all code properly documented
- [ ] **Documentation hooks** - Ensure code stays documented (automated checks)
- [ ] **Build in public** - Show we're using LLM workflows to build this (transparency/meta-demonstration)
