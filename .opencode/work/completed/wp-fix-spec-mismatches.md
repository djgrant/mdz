# Master Work Package: MDZ Spec Alignment (v0.3/v0.7 refined)

## Goal
Align the MDZ implementation (lexer, parser, compiler) with the refined specification (v0.3/v0.7). This involves fixing several core mismatches that lead to misparses and incorrect behavior.

## Scope
- Lexer: Add line classification/gating, template escaping, keyword handling.
- Parser: Remove colon-based parameter blocks, implement `WITH { ... }`, handle headings as non-boundaries, fix delimiter termination rules.
- Compiler: Update RETURN reachability checks.
- AST: Potential updates for list handling or parameter structure.

## Success Criteria
- [ ] MDZ statements are only parsed if they start a line (after indentation) with `$` or a CAPS keyword.
- [ ] Headings do not terminate MDZ blocks (e.g., `IF` blocks can span across headings).
- [ ] `WITH { ... }` syntax is implemented and colon-based parameter blocks are removed/deprecated.
- [ ] Templates support escaping backticks (\`) and `${`.
- [ ] `RETURN` reachability is enforced correctly even with prose.
- [ ] All examples and tests pass or are updated to match the new spec.

## Work Packages
- [ ] WP-1: Lexer Gating & Line Classification
- [ ] WP-2: Parameter Syntax Refactor (WITH { ... })
- [ ] WP-3: Heading & Block Boundary Refactor
- [ ] WP-4: Template Escaping & Delimiter Tightening
- [ ] WP-5: List Handling & RETURN Reachability

## Validation
- New test suite covering the "mismatch" cases identified by the user.
- Existing examples updated and validated.
