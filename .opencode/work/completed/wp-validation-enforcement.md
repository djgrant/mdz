# Parser Validation & Error Enforcement

## Goal
Enforce specific error codes (`E018`, `E019`, `E020`) during parsing where applicable.

## Scope
- `packages/core/src/parser/parser.ts`
- `packages/core/src/parser/ast.ts`

## Tasks
1. **RETURN placement (E018)**
   - Enforce that `RETURN` must be the last statement in a section or a control-flow block (loop/if).
   - In `parseReturnStatement()`, check if the next token is a block-ending token (`END`, `ELSE`, `EOF`, or new section).
   - Emit `E018` if it's not at the end.

2. **Push target array check (E019)**
   - While full type checking is in the compiler, the parser can emit `E019` if the target is obviously not an array (though this might be better left for the compiler). 
   - *Refined Task:* Ensure `E019` is emitted for invalid targets (already partially done, but review).

3. **Parameter type mismatch (E020)**
   - Identify where `E020` should be emitted in the parser (e.g., malformed type annotations or obviously wrong parameter types in `WITH` clauses).

## Validation
- Add tests for `RETURN` in the middle of a block to verify `E018`.
- Verify error emission for `E019` and `E020` scenarios.
