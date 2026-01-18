# WP: Typecheck Compatibility Docs

## Goal
Document the shared type compatibility rules and Any behavior for compiler and LSP consumers.

## Scope
In scope: docs updates in docs/types.mdx and docs/internals/validation.mdx (or appropriate locations) describing structural compatibility, enum subset rules, and Any semantics. Out of scope: code changes.

## Hypothesis
If compatibility rules are documented clearly, users will understand diagnostics and avoid breaking changes.

## Approach
- Update docs to describe structural compatibility, enum subset rule, Any behavior, and function exact match.
- Document shallow inference for lambdas and Any as fallback.
- Align terminology with v0.9+ frontmatter types.

## Validation
- Docs reviewed for consistency with implemented rules and acceptance criteria.

## Results

### Iteration 1

#### Observation
The existing type docs describe syntax and validation but do not spell out the shared compatibility rules, `Any` behavior, or frontmatter-only declarations.

#### Hypothesis
Adding a focused compatibility section plus validation notes will make contract diagnostics predictable and reduce confusion about enum/function/lambda behavior.

#### Experiment
Update `docs/types.mdx` with frontmatter-only declarations, structural compatibility rules, `Any` behavior, and shallow lambda inference examples. Add a contract compatibility note in `docs/internals/validation.mdx` to align validation language with the shared rules.

#### Result
The type system docs now document structural compatibility, enum subset behavior, function exact match, `Any` semantics, shallow lambda inference, and frontmatter-only declarations. Validation docs now reference the same rules at the type-validation stage.

#### Conclusion
The hypothesis is supported. The compatibility rules are now explicit and consistent across user-facing docs.

## Evaluation
What did you learn from the results? Was the hypothesis proved correct?
