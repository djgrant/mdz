# Parser Robustness Fixes

## Goal
Improve parser robustness by fixing unsafe casts, fragile disambiguations, and YAML parsing issues.

## Scope
- `packages/core/src/parser/Parser.ts`
- `packages/core/src/parser/Frontmatter.ts` (or wherever YAML parsing happens)

## Tasks
1. **PushStatement Validation**
   - In `parsePushStatement()`, remove unsafe cast to `VariableReference`.
   - Parse into `targetExpr`.
   - Validate `targetExpr.kind` is `VariableReference` or `MemberAccess`.
   - Emit error `E019` if invalid.

2. **Type vs Var Decl Disambiguation**
   - Review `after colon is TYPE_IDENT` logic.
   - Ensure type defs like `$User: $Person` are handled correctly (or clarify grammar rules).
   - *Note: If existing behavior is intentional, document it. If not, refine the lookahead/check.*

3. **Frontmatter YAML Parsing**
   - Review the hand-rolled YAML parser.
   - Fix parsing of quoted strings with colons.
   - Fix nested objects (depth > 1).
   - Fix arrays of objects.
   - Fix inline arrays with spaces/quotes.

## Validation
- Add tests for invalid PushStatement targets.
- Add tests for Type Defs vs Var Decls.
- Add tests for complex Frontmatter YAML scenarios.
