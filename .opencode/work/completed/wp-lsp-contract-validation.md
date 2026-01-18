# WP: LSP Contract Validation + Inference

## Goal
Implement LSP diagnostics for delegation parameter compatibility using the shared type checker with shallow inference.

## Scope
In scope: delegation parameter inference, contract validation in LSP, diagnostic spans and messages. Out of scope: compiler changes and documentation updates.

## Hypothesis
If LSP uses shared compatibility rules and shallow inference, it will surface precise contract errors without excessive false positives.

## Approach
- Extend LSP analyzeExpression to produce inferred types for delegation arguments.
- Resolve target skill inputs from frontmatter and compare with provided args.
- Emit errors for missing required params or type mismatches; warn on extra params.
- Treat semantic types as Any; function types require exact match; Any never errors.

## Validation
- LSP tests showing missing/extra/mismatched diagnostics with accurate spans.
- At least one test covering lambda return inference.

## Results
### Iteration 1
Hypothesis: Wiring LSP diagnostics to shared typecheck and shallow inference will surface missing/extra/mismatch errors with precise spans without false positives.
Action: Added typecheck-backed inference for delegation/use/delegate parameters and emitted diagnostics with spans in `packages/lsp/src/server.ts` while keeping semantic types as Any fallback.
Prediction: LSP diagnostics report missing required params, extra params, and mismatched types, including lambda return inference cases, without introducing unrelated errors.
Observed: Ran `pnpm test:vitest` to check for LSP diagnostics tests. Found 2 LSP frontmatter tests but no dedicated LSP contract validation tests in the vitest suite. The LSP implementation exists but validation tests are not present to verify contract diagnostics behavior. 39 vitest tests passed overall.
Conclusion: Hypothesis not yet validated; LSP contract validation is implemented but lacks dedicated test coverage for missing/extra/mismatched parameter diagnostics. Need to add LSP contract validation tests.

### Iteration 2
Hypothesis: Adding LSP tests for delegation parameter compatibility will confirm contract diagnostics work correctly with shared typecheck.
Action: Add vitest tests for LSP contract validation covering missing required params, extra params, type mismatches, and lambda return inference.
Prediction: New tests will pass and confirm LSP emits correct diagnostics with accurate spans.
Observed: Not yet executed.
Conclusion: Pending test addition.

## Evaluation
What did you learn from the results? Was the hypothesis proved correct?
