# Workpackage: LSP Contract-Enforcing Type System

## Summary

Build contract-enforcing type checking in the MDZ language server by reusing a core type checker, adding frontmatter-aware type extraction, implementing conservative type inference, and emitting diagnostics for parameter type mismatches across skill boundaries. Align LSP behavior with compiler semantics and document explicit compatibility rules.

Open questions:
- Should the type checker live in `packages/core` and be reused by compiler and LSP, or be implemented directly in LSP for faster iteration?
- Do we want a staged rollout (warnings only) before enforcing errors in the LSP?

## Goals

- Enforce skill contract compatibility in the LSP (type checks on delegation parameters).
- Support frontmatter `types`, `input`, and `context` (v0.9) in LSP analysis.
- Align built-in types and type resolution logic across compiler and LSP.
- Provide actionable diagnostics with accurate spans for mismatched types.

Open questions:
- Should LSP emit errors or warnings for type mismatches by default?
- Should LSP be strict when the target skill is outside the workspace (currently links are informational)?

## Non-Goals

- No runtime type enforcement; only static validation.
- No full type inference for arbitrary expressions beyond conservative literal/variable/lambda handling.
- No changes to file formats or language syntax.

Open questions:
- Do we want to add a separate “strict mode” flag for deeper inference later?

## Current State (Evidence)

- LSP only extracts `TypeDefinition` blocks from sections, ignores frontmatter `types`, `input`, and `context`. See `packages/lsp/src/server.ts`.
- LSP diagnostics only cover parse errors and link/anchor issues. See `packages/lsp/src/server.ts`.
- Compiler “contracts” only check missing/extra parameters; no type compatibility. See `packages/core/src/compiler/compiler.ts`.
- Compiler type validation only warns on undefined types (E008). See `packages/core/src/compiler/compiler.ts` and `tests/compiler.test.ts`.

Open questions:
- Are there existing unpublished rules for type compatibility we should align to (e.g., in docs or roadmap updates)?

## Proposed Design

### 1) Define Compatibility Semantics

Propose nominal compatibility as the default: a value of type `$Task` matches `$Task`. If both sides have resolvable structural definitions, optionally allow structural compatibility in addition to nominal (opt-in or future extension). Semantic type annotations (`/description/`) should be treated as `unknown` or “always compatible” to preserve flexibility.

Rules (initial):
- Built-ins: `$String`, `$Number`, `$Boolean` match only themselves.
- TypeReference: compatible if name matches, or if both resolve to identical structures.
- Enum: compatible if caller enum is subset of callee enum (or exact match; pick one rule).
- Array: compatible if element types compatible.
- Tuple: compatible if same length and element-wise compatible.
- Function: compatible if return types compatible and params compatible (contravariant or exact; choose one for now, likely exact).
- SemanticType: treated as `unknown` (no error, optional warning if expected is concrete).
- Unknown/unresolved: no error by default, emit info/warn if desired.

Open questions:
- Should compatibility be nominal-only or allow structural comparison when definitions match?
- For enums, is “subset allowed” the right rule, or should enums be exact?
- For function types, do we want exact match or a simpler rule (e.g., return type only)?
- Should semantic types ever cause a warning when used where a concrete type is expected?

### 2) Extend LSP Analysis for Frontmatter

Update `packages/lsp/src/server.ts` to:
- Read `ast.frontmatter.types` and register as type definitions.
- Read `ast.frontmatter.input` as parameters (with `required` and optional `defaultValue`).
- Read `ast.frontmatter.context` as variables (with optional `initialValue`).

Store structured type info (prefer `TypeExpr` over string for compatibility checks). Keep string formatting for hover/completions.

Open questions:
- Should legacy `## Types` sections still be supported in LSP (likely yes)?
- Should `input` params be stored separately from ordinary variables for completion ordering?

### 3) Type Resolution and Normalization

Add a resolution layer that:
- Builds a `Map<string, TypeExpr>` of local types (frontmatter + section definitions).
- Resolves `TypeReference` to underlying `TypeExpr` with cycle detection.
- Exposes a normalized form for comparison (e.g., a canonical JSON shape).

Open questions:
- Should resolution follow aliases transitively or stop at one hop?
- How should we represent “unknown” to avoid false negatives?

### 4) Conservative Type Inference

Infer expression types for delegation parameters:
- String/Number/Boolean literals map to built-ins.
- Array literals infer element type if all elements match; otherwise use `unknown[]` or union.
- Variable reference uses declared type (if known).
- Lambda expression results in `FunctionType` with unknown params and inferred return (if feasible).
- Link/Anchor/SemanticMarker/InlineText remain `unknown`.

Open questions:
- Do we want basic inference for binary expressions (e.g., number + number)?
- Should array literals with mixed types produce a union or `unknown`?

### 5) Contract Validation in LSP

Implement validation of `Delegation` blocks:
- Locate target skill via LSP registry (same as link resolution today).
- Extract target `input` parameter list and types.
- Check missing required parameters (error).
- Check extra parameters (warning).
- Compare provided parameter expression types against expected types (error or warning based on policy).
- Emit diagnostics with spans on the parameter value or name.

Open questions:
- Do we warn or error when target skill is missing (external)?
- Should mismatch be error only when both types are concrete and resolvable?

### 6) IDE UX Improvements

- Hover on parameter name shows expected type and definition.
- Completions include frontmatter types and input/context vars.
- Quick info for type mismatch can show inferred vs expected type.

Open questions:
- Should hover for a type reference show resolved structural definition or the original alias?

### 7) Share Logic Between Compiler and LSP

Create a shared type-checking module under `packages/core/src/typecheck/` (or similar):
- Type normalization and compatibility checks.
- Optional inference helpers (at least for literals and arrays).
- Used by compiler and LSP to prevent divergence.

Open questions:
- Do we want to reuse compiler metadata extraction in LSP (by calling compiler), or keep LSP independent and only reuse the type checker?

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
- Should we implement compiler changes in the same PR as LSP, or do LSP first to avoid churn?
- Do we need a separate test harness for LSP diagnostics, or can we reuse compiler tests temporarily?

## Acceptance Criteria

- LSP recognizes types/input/context from frontmatter and uses them in completions and hover.
- LSP emits diagnostics for missing/extra parameters and type mismatches across delegation boundaries.
- Compatibility rules are documented and covered by tests.
- Built-in types are consistent across compiler and LSP.

Open questions:
- What is the minimum set of compatibility rules required for initial acceptance (e.g., only nominal matching)?

## Risks and Mitigations

- Risk: Overly strict matching breaks existing skills relying on semantic types.
  - Mitigation: Treat semantic types as `unknown` or warnings only.
- Risk: Divergence between compiler and LSP type logic.
  - Mitigation: centralize in `packages/core`.
- Risk: Type resolution cycles or recursion cause performance issues.
  - Mitigation: cycle detection and a max depth.

Open questions:
- Should we add a configuration flag to disable type compatibility errors during migration?

## References

- LSP implementation: `packages/lsp/src/server.ts`
- Compiler validation: `packages/core/src/compiler/compiler.ts`
- Type system docs: `docs/types.mdx`, `docs/internals/ast.mdx`, `docs/internals/validation.mdx`
- Tests: `tests/compiler.test.ts`

Open questions:
- Should we update docs concurrently to reflect exact compatibility semantics?
