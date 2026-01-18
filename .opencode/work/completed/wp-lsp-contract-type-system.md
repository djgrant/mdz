# Workpackage: LSP Contract-Enforcing Type System

## Summary

Build contract-enforcing type checking in the MDZ language server by reusing a core type checker, adding frontmatter-aware type extraction, implementing conservative type inference, and emitting diagnostics for parameter type mismatches across skill boundaries. Align LSP behavior with compiler semantics and document explicit compatibility rules.

- The type checker will live in `packages/core` to be shared between the compiler and LSP, ensuring consistent semantics.
- Type mismatches will trigger **errors** by default in the LSP.
- Compatibility will be **structural** (matching the shape of types) rather than just nominal.
- Structural matching is **recursive**, checking nested definitions (tuples, arrays, objects, functions).
- Function types require **exact structural match** (parameters + return).
- Enum compatibility follows the **subset rule** (e.g., `['A']` is compatible with `['A', 'B']`).
- Target skills outside the workspace will trigger **errors** for parameter mismatches or missing information.
- Type definitions are strictly enforced from **frontmatter** (v0.9+), legacy `## Types` sections are ignored.
- Lambda return types will be **shallowly inferred** (literals/identifiers only) to support contract checking when passed as parameters.
- Use **Any** as the fallback type (instead of `unknown`); it is always compatible.
- Semantic types (unquoted prose) are treated as **Any** and never trigger diagnostics.

## Goals

- Enforce skill contract compatibility in the LSP (type checks on delegation parameters).
- Support frontmatter `types`, `input`, and `context` (v0.9) in LSP analysis.
- Align built-in types and type resolution logic across compiler and LSP.
- Provide actionable diagnostics with accurate spans for mismatched types.
- Implement recursive structural type comparison and basic lambda return inference.

Open questions:
- How deep should lambda inference go before falling back to `unknown`? (resolved: shallow only)
- Should we provide "Quick Fix" actions to update frontmatter based on inferred types? (resolved: no, not in scope)

- For enums, is “subset allowed” the right rule, or should enums be exact? (resolved: subset allowed)
- For function types, do we want exact match or a simpler rule (e.g., return type only)? (resolved: exact match)
- Should semantic types ever cause a warning when used where a concrete type is expected? (resolved: semantic types are Any and never warn)

### 2) Extend LSP Analysis for Frontmatter

Update `packages/lsp/src/server.ts` to:
- Read `ast.frontmatter.types` and register as type definitions.
- Read `ast.frontmatter.input` as parameters (with `required` and optional `defaultValue`).
- Read `ast.frontmatter.context` as variables (with optional `initialValue`).

Store structured type info (prefer `TypeExpr` over string for compatibility checks). Keep string formatting for hover/completions.

Open questions:
- Should legacy `## Types` sections still be supported in LSP (resolved: no, frontmatter only)?
- Should `input` params be stored separately from ordinary variables for completion ordering? (resolved: yes, for ordering)

### 3) Type Resolution and Normalization

Add a resolution layer that:
- Builds a `Map<string, TypeExpr>` of local types (frontmatter + section definitions).
- Resolves `TypeReference` to underlying `TypeExpr` with cycle detection.
- Exposes a normalized form for comparison (e.g., a canonical JSON shape).

Open questions:
- Should resolution follow aliases transitively or stop at one hop? (resolved: transitive)
- How should we represent “unknown” to avoid false negatives? (resolved: use Any; unknown removed)

### 4) Conservative Type Inference

Infer expression types for delegation parameters:
- String/Number/Boolean literals map to built-ins.
- Array literals infer element type if all elements match; otherwise use `Any[]`.
- Variable reference uses declared type (if known).
- Lambda expression results in `FunctionType` with Any params and shallow inferred return (if feasible).
- Link/Anchor/SemanticMarker/InlineText infer as Any.

Open questions:
- Do we want basic inference for binary expressions (e.g., number + number)? (resolved: shallow only, no binary expression inference)
- Should array literals with mixed types produce a union or `unknown`? (resolved: Any[])

### 5) Contract Validation in LSP

Implement validation of `Delegation` blocks:
- Locate target skill via LSP registry (same as link resolution today).
- Extract target `input` parameter list and types.
- Check missing required parameters (error).
- Check extra parameters (warning).
- Compare provided parameter expression types against expected types (error; Any never errors).
- Emit diagnostics with spans on the parameter value or name.

Open questions:
- Do we warn or error when target skill is missing (external)? (resolved: error)
- Should mismatch be error only when both types are concrete and resolvable? (resolved: mismatches are errors; Any never errors)

### 6) IDE UX Improvements

- Hover on parameter name shows expected type and definition.
- Completions include frontmatter types and input/context vars.
- Quick info for type mismatch can show inferred vs expected type.

Open questions:
- Should hover for a type reference show resolved structural definition or the original alias? (resolved: show original alias)

### 7) Share Logic Between Compiler and LSP

Create a shared type-checking module under `packages/core/src/typecheck/` (or similar):
- Type normalization and compatibility checks.
- Optional inference helpers (at least for literals and arrays).
- Used by compiler and LSP to prevent divergence.

Open questions:
- Do we want to reuse compiler metadata extraction in LSP (by calling compiler), or keep LSP independent and only reuse the type checker? (resolved: keep LSP independent, reuse type checker only)

## Implementation Plan (Suggested Steps)

1) Add type-checking module in `packages/core`:
   - `normalizeTypeExpr()`, `resolveTypeRef()`, `isCompatible()`.
   - Unit tests for compatibility rules.

2) Update LSP analysis to include frontmatter types/input/context:
   - Extend `analyzeDocument()` to add frontmatter types to `types` map and params to `variables` map with a `kind` marker (parameter vs variable).
   - Ensure type expressions are stored, not just strings.

3) Add inference for delegation parameter expressions:
   - Extend `analyzeExpression()` to return inferred types.
   - Store inferred types in `VariableDeclaration` for params.

4) Implement LSP contract validation:
   - Add diagnostics pass to check delegations.
   - Leverage shared compatibility and resolution logic.

5) Update compiler to use shared type checker:
   - Replace ad hoc undefined-type checks with shared compatibility checks (if desired).
   - Add compiler diagnostics for type mismatches.

6) Add tests:
   - Compiler tests: type mismatch across skills, enum/tuple/array compatibility, unknown handling.
   - LSP tests (add harness if missing): diagnostics for mismatches, missing/extra params, frontmatter type usage.

Open questions:
- Should we implement compiler changes in the same PR as LSP, or do LSP first to avoid churn? (resolved: sequential, LSP after shared core; compiler alignment can run in parallel)
- Do we need a separate test harness for LSP diagnostics, or can we reuse compiler tests temporarily? (resolved: add LSP tests under packages/lsp/tests using vitest)

## Acceptance Criteria

- LSP recognizes types/input/context from frontmatter and uses them in completions and hover.
- LSP emits diagnostics for missing/extra parameters and type mismatches across delegation boundaries.
- Compatibility rules are documented and covered by tests.
- Built-in types are consistent across compiler and LSP.

Open questions:
- What is the minimum set of compatibility rules required for initial acceptance (e.g., only nominal matching)?

## Results

### Iteration 1
Hypothesis: Building a shared typecheck module, frontmatter LSP analysis, contract validation, compiler alignment, tests, and docs will enable contract-enforcing type checking with elegant design.
Action: Implemented 6 scoped work packages: shared typecheck core, LSP frontmatter analysis, LSP contract validation, compiler alignment, tests, and docs.
Prediction: LSP will recognize frontmatter types/input/context, emit accurate diagnostics, compiler will align with shared rules, and all acceptance criteria will be met.
Observed:
- Shared typecheck module (packages/core/src/typecheck/typecheck.ts) with 10/10 tests passing
- LSP frontmatter analysis correctly ignores legacy ## Types/Input/Context sections (2/2 tests passing)
- LSP contract validation implemented with 7 new diagnostic tests passing
- Compiler alignment complete with 37/38 tests passing (1 pre-existing $FilePath issue unrelated)
- Docs updated in docs/types.mdx and docs/internals/validation.mdx
- All acceptance criteria satisfied
Conclusion: Hypothesis validated; contract-enforcing type checking implemented with shared semantics between compiler and LSP.

### Known Issues
- Pre-existing compiler test failure: "$FilePath triggers type warning" - $FilePath is treated as built-in when it should not be. Out of scope for this WP.

## Evaluation

The implementation achieved all acceptance criteria with an elegant, shared design:
1. Shared typecheck module in packages/core provides canonical compatibility rules used by both compiler and LSP
2. Frontmatter-only type declarations are properly recognized in LSP for completions and hover
3. LSP emits accurate diagnostics for missing/extra/mismatched parameters with precise spans
4. Compiler contract validation aligns with shared typecheck rules
5. Compatibility rules (structural, enum subset, Any as universal compatible, function exact match) are documented and tested
6. One pre-existing issue ($FilePath handling) was identified but is out of scope for this WP

The strategy of centralizing type semantics in packages/core proved successful, preventing divergence between compiler and LSP. The use of Any as a universal fallback ensures type checks remain permissive while catching real mismatches.

## Risks and Mitigations

- Risk: Overly strict matching breaks existing skills relying on semantic types.
  - Mitigation: Treat semantic types as `unknown` or warnings only.
- Risk: Divergence between compiler and LSP type logic.
  - Mitigation: centralize in `packages/core`.
- Risk: Type resolution cycles or recursion cause performance issues.
  - Mitigation: cycle detection and a max depth.

Open questions:
- Should we add a configuration flag to disable type compatibility errors during migration? (resolved: no)

## References

- LSP implementation: `packages/lsp/src/server.ts`
- Compiler validation: `packages/core/src/compiler/compiler.ts`
- Type system docs: `docs/types.mdx`, `docs/internals/ast.mdx`, `docs/internals/validation.mdx`
- Tests: `tests/compiler.test.ts`

Open questions:
- Should we update docs concurrently to reflect exact compatibility semantics? (resolved: yes)
