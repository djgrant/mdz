---
size: md
category: language
---

# Phase 3: Convergence - Synthesize Direction

## Goal/Problem

Synthesize Phase 1-2 findings into a coherent language design. Make decisions, not present options.

## Status: COMPLETED

## Approach

Based on validation evidence:
- Direction A (Minimal Extension) validated strongly across all experiments
- Two-layer compilation model proved feasible
- LSP tooling is viable with the chosen syntax
- CAPS keywords work reliably with LLMs

## Key Design Decisions

### Decision 1: Core Syntax Model
**Choice**: Direction A (Minimal Extension)
**Rationale**: 
- Validated in E1, E2, E3, E4, E5, E6
- Best balance of readability and parseability
- Sufficient for tooling (LSP viable)
- Natural markdown extension that reads as prose

### Decision 2: Architecture
**Choice**: Two-Layer Model (source → compiled)
**Rationale**:
- Validated in E5 with modest 140% expansion
- Decouples human DX from LLM consumption
- Enables source maps for debugging
- Allows future optimization without changing source format

### Decision 3: Control Flow
**Choice**: CAPS keywords (FOR EACH, WHILE, IF THEN ELSE)
**Rationale**:
- Validated in E2 with actual LLM calls
- Familiar (SQL, BASIC heritage)
- Visually distinct in prose
- Parseable via simple regex

### Decision 4: Reference System
**Choice**: Wiki-links [[skill]] and [[#section]] + $variables
**Rationale**:
- Validated in E3, E6
- Enables go-to-definition
- Enables autocomplete
- Visual distinction between literal and reference

### Decision 5: Semantic Markers
**Choice**: {~~content} with explicit scope
**Rationale**:
- Validated in E4
- Clear boundary between deterministic and semantic
- Variable expansion BEFORE semantic interpretation
- No nested semantics (deliberate constraint)

### Decision 6: Type System
**Choice**: Semantic types with gradual adoption
**Rationale**:
- Types as hints, not enforcement
- $TypeName = natural language definition
- Enables documentation and tooling
- No runtime type checking

## Artifacts Produced

1. spec/language-spec.md - Complete specification (400+ lines)
2. poc/parser-minimal.ts - Updated parser aligned with spec
3. poc/compiler.ts - Updated compiler aligned with spec
4. experiments/e3-orchestrate-map-reduce.md - Reference skill (updated)
5. experiments/e3-simplify-skill.md - Reference skill (updated)
6. experiments/e4-work-packages.md - New reference skill

## Results

### Specification Complete

The specification covers:
- Document structure and frontmatter schema
- Type system (semantic types, enums, compounds, arrays, functions)
- Variable declarations and references
- Skill and section references
- Semantic markers with variable interpolation
- Control flow (FOR EACH, WHILE, IF THEN ELSE)
- Composition model (delegation, parameter passing)
- Compilation transformations
- Runtime semantics
- Tooling requirements
- Grammar summary

### Edge Cases Addressed

1. **Variable interpolation in semantic markers**: Expand vars BEFORE semantic interpretation
2. **Nested semantics**: Explicitly NOT supported (deliberate constraint)
3. **Error handling**: Through explicit checks and work package logging
4. **Parallel execution**: Deferred to future version

### POC Validation

- Parser successfully extracts all constructs from reference skills
- Compiler achieves 140% expansion ratio (modest, within budget)
- Type expansion, reference resolution, and semantic transformation work

## Evaluation

### Success Criteria Assessment

1. **Decisions Made**: ✓ All 6 major design decisions documented with rationale
2. **Specification Draft**: ✓ Complete v0.1 spec at spec/language-spec.md
3. **No Options**: ✓ Every section presents THE design, not alternatives
4. **Consistency**: ✓ All parts work together (validated by parser/compiler)
5. **Testability**: ✓ POCs demonstrate implementation viability

### Open Issues (Minimal)

1. Source maps not yet implemented in compiler (structure in place)
2. Full LSP implementation deferred to Phase 4
3. Parallel execution (PARALLEL FOR EACH) deferred to v0.2
4. Exception/error propagation mechanism needs design

### Recommendations for Phase 4

1. Implement full LSP based on lsp-prototype.ts
2. Add source map generation to compiler
3. Build CLI tool for compiling skills
4. Create VS Code extension skeleton
5. Write formal test suite for parser/compiler
