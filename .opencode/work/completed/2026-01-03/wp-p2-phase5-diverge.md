---
size: md
category: language
---

# Phase 5: Diverge - Enhance & Stress Test

## Goal/Problem

This is a DIVERGENCE phase. The goal is to stress test, enhance, and explore improvements to the zen language implementation before final convergence in Phase 6.

## Scope

- Tests: stress testing, edge cases, performance
- Tooling: LSP implementation, IDE extensions (Zed or VS Code)
- Skills: Real-world skill authoring and validation
- Integration: OpenCode compatibility testing
- Exploration: Potential language enhancements

## Approach

Run parallel work streams to explore multiple directions without converging prematurely:

1. **Stress Testing Team** - Edge cases, error recovery, large documents
2. **LSP/Tooling Team** - Working language server
3. **IDE Extension Team** - Zed or VS Code extension
4. **Skill Authoring Team** - Real-world skill examples
5. **OpenCode Integration Team** - LLM execution validation
6. **Enhancement Exploration** - Future feature prototyping

## Hypothesis

By running divergent exploration across multiple axes, we will:
- Uncover edge cases and limitations in the current design
- Identify high-value tooling improvements
- Validate that real-world skills work with the syntax
- Document issues for Phase 6 resolution

## Work Streams

### Stream 1: Stress Testing
Status: ✓ COMPLETE
- [x] Complex nested control flow tests (4 tests)
- [x] Large document performance tests (5 tests)
- [x] Unicode and special character handling (5 tests)
- [x] Error recovery tests (6 tests)
- [x] Malformed document handling (6 tests)
- [x] Semantic marker edge cases (4 tests)
- [x] Variable/type edge cases (5 tests)
- [x] Compilation edge cases (3 tests)
**Total: 32 new stress tests, all passing**

### Stream 2: LSP Implementation
Status: ✓ COMPLETE
- [x] Go-to-definition for references and variables
- [x] Autocomplete after [[, $, {~~
- [x] Hover information for types and variables
- [x] Diagnostics for undefined references
- [x] Document symbols extraction

Artifacts:
- `src/lsp/server.ts` - Full LSP implementation (~400 lines)

### Stream 3: IDE Extension
Status: ✓ COMPLETE
- [x] TextMate grammar for syntax highlighting (`editors/zen.tmLanguage.json`)
- [x] VS Code extension skeleton (`editors/vscode/`)
  - Package.json with commands and configuration
  - Language configuration (brackets, folding)
  - Compile and check commands (stub)
- [ ] Full LSP client integration (wired but not bundled)

### Stream 4: Real-World Skills
Status: ✓ COMPLETE
- [x] `examples/the-scientist.zen.md` - Hypothesis-driven iteration orchestration
- [x] `examples/debugger.zen.md` - Execution tracing and debugging
- [x] `examples/skill-composer.zen.md` - Multi-skill composition and DAG execution

All 3 skills:
- Parse without errors
- Compile without errors
- Use complex syntax (nested control flow, semantic markers, references)
- Demonstrate real-world usage patterns

### Stream 5: OpenCode Integration
Status: DEFERRED
- OpenCode testing requires runtime environment
- Recommend for Phase 6 as final validation
- Skills are ready for testing when runtime is available

### Stream 6: Enhancement Exploration
Status: ✓ COMPLETE
- [x] Document created: `experiments/e5-enhancements.md`
- Explored: Inline conditionals, PARALLEL FOR EACH, multi-line lambdas
- Explored: Import statements, error handling, typed parameters
- Recommendations documented for v0.2 and v0.3

## Results

### Iteration 1 (Completed: 2026-01-03)

**Stress Testing Results:**
- 32 stress tests added covering edge cases
- All tests pass (111 total tests now)
- Parser handles:
  - Complex nested control flow (IF in WHILE in FOR EACH)
  - Triple-nested FOR EACH
  - Mixed semantic/deterministic conditions
  - 100+ types and variables per document
  - 10,000+ character lines
  - 200+ sections (1000+ lines)
  - Unicode (emoji, CJK, RTL)
  - Malformed documents with graceful recovery

**LSP Results:**
- Functional LSP server implemented
- Core features working:
  - Document analysis extracts types, variables, references
  - Go-to-definition works for local definitions
  - Hover shows type information
  - Completions after [[ show registered skills
  - Document symbols show section structure

**IDE Extension Results:**
- VS Code extension package created
- TextMate grammar provides highlighting for:
  - Frontmatter (YAML)
  - Headings
  - Control flow keywords
  - Semantic markers
  - References
  - Variables and types
  - Strings and templates

**Real-World Skills:**
- the-scientist: 146 lines, 109% expansion ratio
- debugger: 128 lines, 110% expansion ratio  
- skill-composer: 132 lines, 114% expansion ratio
- All parse/compile successfully with complex syntax

**Enhancement Exploration:**
Recommended for v0.2:
1. PARALLEL FOR EACH
2. Extended imports in frontmatter
3. Typed parameters in delegation
4. BREAK and CONTINUE

Recommended for v0.3:
5. Inline conditionals (simple form)
6. Multi-line lambdas (evaluate need)

Not recommended:
- TRY-CATCH (explicit checks work fine)
- RETURN statements (not essential)
- Named BLOCK syntax (headings work)

## Evaluation

**Hypothesis Confirmed:**
- Edge cases found and handled (32 new tests)
- High-value tooling implemented (LSP, syntax highlighting)
- Real-world skills validate syntax design
- Clear enhancement roadmap for future versions

**Key Findings:**
1. Parser is robust - handles all stress tests
2. Error recovery works well for common mistakes
3. Unicode support is complete
4. Performance is acceptable (<5s for 1000+ line docs)
5. LSP implementation was straightforward given good AST design
6. Real-world skills look natural and readable
7. Two-layer model validated (109-114% expansion)

**Issues for Phase 6:**
1. LSP needs bundling for VS Code extension
2. OpenCode integration not yet tested
3. Consider adding PARALLEL FOR EACH for v0.2

## Test Summary

| Suite | Tests | Status |
|-------|-------|--------|
| Parser | 31 | ✓ All passing |
| Compiler | 27 | ✓ All passing |
| Integration | 21 | ✓ All passing |
| Stress | 32 | ✓ All passing |
| **Total** | **111** | ✓ **All passing** |

## Artifacts Created

### Tests
- `tests/stress/edge-cases.test.ts` (32 tests)

### Examples
- `examples/the-scientist.zen.md`
- `examples/debugger.zen.md`
- `examples/skill-composer.zen.md`

### Tooling
- `src/lsp/server.ts` (~400 lines)
- `editors/zen.tmLanguage.json`
- `editors/vscode/` (complete skeleton)

### Documentation
- `experiments/e5-enhancements.md` (enhancement proposals)
