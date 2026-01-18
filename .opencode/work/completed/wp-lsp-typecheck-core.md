# WP: Shared Typecheck Core

## Goal
Create a shared, elegant typecheck module in packages/core that provides canonical resolution, normalization, and structural compatibility for use by both compiler and LSP.

## Scope
In scope: core TypeExpr resolution, normalization, compatibility checks, shallow expression inference, and unit tests for the shared rules. Out of scope: LSP extraction and compiler wiring changes.

## Hypothesis
If we centralize type compatibility in packages/core with a small API, the compiler and LSP will stay semantically aligned and the implementation will be simpler and less error-prone.

## Approach
- Add a typecheck module under packages/core/src/typecheck/.
- Implement resolve + normalize with cycle detection and depth caps.
- Implement structural compatibility (exact function match, enum subset, semantic types as Any, Any as universal compatible).
- Implement shallow inference (literals, identifiers, arrays/objects/tuples, lambda return inference limited to literals/identifiers).
- Add unit tests that encode the agreed rules.

## Validation
- Unit tests covering built-ins, arrays, tuples, objects, enums subset, functions exact match, semantic types, alias cycles.
- At least one test exercising shallow lambda return inference.

## Results
### Iteration 1
Hypothesis: A shared typecheck module plus focused tests will align compiler and LSP semantics.
Action: Added a core typecheck module with resolution, normalization, compatibility, and inference plus unit tests.
Prediction: Tests will cover enum subset, Any semantics, alias cycles, and shallow inference without touching compiler/LSP wiring.
Observed: Ran `node dist/tests/typecheck.test.js` after `pnpm build`. All 10 tests passed, including enum subset compatibility, alias chain depth guard, exact function parameter match, semantic Any compatibility, array element type checks, lambda return inference from literals, mixed array inference, variable type inference, and template literal inference. No existing failures noted.
Conclusion: Hypothesis supported; shared typecheck module provides canonical resolution, normalization, and compatibility for both compiler and LSP with full test coverage.

## Evaluation
What did you learn from the results? Was the hypothesis proved correct?
