---
size: lg
category: website
---

# Multi-File Playground: Demonstrating Compositional Power

## Goal/Problem

The playground currently only supports single-file editing. This prevents demonstrating MDZ's key value proposition: **compositional prompt engineering** where skills build on skills with validated dependencies.

Users cannot see:
- How skills compose via `uses:` declarations
- Cross-skill dependency graphs
- The full system architecture of a real skill library

## Scope

- `examples/projects/the-scientist/` (new directory for multi-file example)
- `website/src/pages/playground.astro` (multi-file support)
- Web worker updates for multi-file validation

## Hypothesis

By showing a complete, working skill system (translated from the-scientist), users will immediately grasp that MDZ enables modular, composable prompt engineering with tooling that validates the whole system.

## Approach

### Phase 1: Create Example Content (WP1-WP5)

Translate 5 skills from the-scientist to proper MDZ syntax:

1. **work-packages** - Foundation skill (no dependencies)
2. **orchestrate** - Base orchestration (uses: work-packages)  
3. **scientific-method** - Hypothesis-driven iteration (uses: work-packages)
4. **orchestrate-map-reduce** - Fan-out strategy (uses: orchestrate, work-packages)
5. **simplify** - Simplification skill (uses: orchestrate-map-reduce)

This creates a dependency tree:
```
simplify
└── orchestrate-map-reduce
    ├── orchestrate
    │   └── work-packages
    └── work-packages

scientific-method
└── work-packages
```

### Phase 2: Playground Infrastructure (WP6)

- Add project selector dropdown
- File tabs/tree for navigation
- Unified dependency graph showing all skills
- Cross-file validation display

## Success Criteria

1. User can select "the-scientist" project in playground
2. Can navigate between 5 skill files
3. Dependency graph shows full system
4. Validation works across file boundaries
5. Editing one file updates the graph

## Results

*To be filled after work packages complete*

## Work Packages

| ID | Task | Status | Agent |
|----|------|--------|-------|
| WP1 | Translate work-packages to MDZ | pending | - |
| WP2 | Translate orchestrate to MDZ | pending | - |
| WP3 | Translate scientific-method to MDZ | pending | - |
| WP4 | Translate orchestrate-map-reduce to MDZ | pending | - |
| WP5 | Translate simplify to MDZ | pending | - |
| WP6 | Build playground infrastructure | pending | - |


## Results

### Phase 1: Example Content ✓

Translated 5 skills from the-scientist to proper MDZ syntax:

| File | Types | Variables | Dependencies | Status |
|------|-------|-----------|--------------|--------|
| work-packages.mdz | 3 | 2 | 0 | ✓ Valid |
| orchestrate.mdz | 3 | 0 | 1 (work-packages) | ✓ Valid |
| scientific-method.mdz | 4 | 4 | 1 (work-packages) | ✓ Valid |
| orchestrate-map-reduce.mdz | 3 | 15 | 2 (orchestrate, work-packages) | ✓ Valid |
| simplify.mdz | 5 | 8 | 1 (orchestrate-map-reduce) | ✓ Valid |

Files located at: `examples/projects/the-scientist/`

### Phase 2: Playground Infrastructure ✓

**Files modified:**
- `website/src/pages/playground.astro` - Multi-file UI, project selector, file tabs, unified graph
- `website/src/zen-worker-entry.ts` - Project-wide validation support

**Features implemented:**
1. Project selector dropdown with "📁 The Scientist" option
2. File tabs showing all project files
3. Unified dependency graph showing full project hierarchy
4. Click-to-navigate on graph nodes
5. Project-wide validation via web worker
6. Current file highlighting in graph (indigo vs green)

### Browser Testing ✓

Verified in browser:
- Single-file scenarios still work
- Project selection loads all 5 files
- File tabs switch correctly
- Graph shows correct hierarchy with all dependencies
- Status bar updates per-file stats
- Insight message shows project status

## Evaluation

**Hypothesis confirmed:** The multi-file playground successfully demonstrates MDZ's compositional power.

Users can now:
1. See a complete skill system (5 interconnected skills)
2. Understand the dependency hierarchy visually
3. Navigate between files to explore the system
4. See how skills reference each other via `uses:` and `[[refs]]`

This directly addresses the original gap: proving that MDZ enables modular, composable prompt engineering with validated dependencies across files.

**Work packages completed:** 6 (WP1-WP5 for translations, WP6 for infrastructure)
**Sub-agents used:** 6 (5 parallel for translations, 1 for infrastructure)
