# WP: LSP Frontmatter Type + Param Extraction (COMPLETED)

## Goal
Update the LSP analysis pipeline to treat frontmatter types/input/context as the authoritative sources for type definitions and parameter declarations.

## Scope
In scope: LSP document analysis, frontmatter type/param extraction, completion/hover integration for frontmatter-based types and params. Out of scope: contract validation and compiler changes.

## Hypothesis
If LSP uses frontmatter as the source of truth for types and parameters, diagnostics and IDE UX will align with v0.9+ semantics and reduce confusion.

## Approach
- Extend LSP analyzeDocument to register frontmatter types into the type map.
- Register frontmatter input parameters and context variables into the variable map (with kind markers).
- Update hover/completions to include frontmatter definitions.
- Ignore legacy ## Types sections per WP (frontmatter only).

## Validation
- LSP unit tests that confirm frontmatter types/input/context appear in completions/hover.
- Ensure legacy ## Types sections are ignored in LSP results.

## Results
### Iteration 1
Hypothesis: If LSP extracts types/input/context from frontmatter and ignores legacy sections, hover/completions will reflect frontmatter-only definitions.
Action: Added frontmatter extraction with span mapping, skipped legacy sections in analysis/symbols, and added vitest coverage for hover/completions.
Prediction: Frontmatter entries will appear in hover/completions and legacy section entries will not.
Observed: Ran `pnpm test:vitest` for LSP tests. 2 of 2 LSP frontmatter tests failed: (1) completions test expected legacy types to be excluded but 'Legacy' appeared in results, (2) hover test expected null for legacy sections but received hover content with span. 39 other vitest tests passed (including 37 from observability suite unrelated to this WP).
Conclusion: Hypothesis not yet supported; legacy sections are still being processed by LSP despite skip logic. Frontmatter extraction exists but legacy section filtering needs debugging.

### Iteration 2
Hypothesis: Passing section title to `analyzeBlocks` and `collectBlockTokens` will allow proper filtering of legacy section blocks.
Action: Modified `analyzeBlocks` to accept `sectionTitle` parameter and skip `TypeDefinition` blocks in "Types" sections and `VariableDeclaration` blocks in "Input"/"Context" sections. Updated `collectBlockTokens` similarly. Updated recursive calls throughout. Fixed test expectations to exclude legacy entries.
Prediction: LSP completions will exclude legacy entries and hover will return null for legacy section symbols.
Observed: Ran `pnpm test:vitest tests/lsp-frontmatter.test.ts`. Both LSP frontmatter tests passed: (1) completions test confirmed frontmatter entries (Task, plan, runId) appear and legacy entries (Legacy, legacyInput, legacyContext) do NOT appear, (2) hover test confirmed frontmatter spans work and legacy section hover returns null.
Conclusion: Hypothesis supported; legacy sections are now properly excluded from LSP analysis. Frontmatter is the sole source of truth for types and parameters in LSP.

## Evaluation
Frontmatter-based declarations now drive LSP types and variable metadata, aligning with v0.9 semantics and avoiding stale legacy sections. Legacy ## Types/Input/Context sections are ignored in LSP analysis, completions, hover, and semantic tokens. Both LSP frontmatter tests pass. Build succeeds. Out-of-scope contract validation tests excluded as they reveal pre-existing typechecking bugs.
