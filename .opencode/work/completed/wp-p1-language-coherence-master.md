# Language Coherence Master

## Goal/Problem

A friend is reviewing MDZ. We need to ensure that all language constructs are coherent, examples are consistent and clear, and documentation is up-to-date before the review.

## Scope

- `spec/grammar.md` - Formal grammar
- `spec/language-spec.md` - Language specification
- `examples/*.mdz` - Example skills (4 files)
- `website/src/pages/docs/*.astro` - Documentation pages
- `packages/core/src/parser/` - Parser implementation
- `packages/core/src/compiler/` - Compiler implementation

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WITH clause | Implement fully | Enable contract checking at delegation sites |
| imports: | Remove | Superfluous - `uses:` is sufficient |
| Type syntax | Use `:` not `=` | `$Type: description` clearer than `$Type = description` |

## Decisions Pending (Work Packages Commissioned)

| Question | Work Package | Status |
|----------|--------------|--------|
| Semantic marker closing `}` vs `~~}` | wp-p2-semantic-marker-closing | Pending |
| Implicit variable syntax (`$@x` vs `$(x)`) | wp-p2-implicit-variable-syntax | Pending |
| IF statement brace rules | wp-p2-if-brace-rules | Pending |
| Interface parameter syntax | wp-p2-interface-parameter-syntax | Pending |
| Brace usage audit (when required?) | wp-p2-brace-usage-audit | Pending |
| Operator naming glossary | wp-p2-operator-naming | Pending |

## Sub-Work Packages

### Design Decisions (investigate and recommend)

1. **wp-p2-semantic-marker-closing** - Should closing be `}` or `~~}`?
2. **wp-p2-implicit-variable-syntax** - Syntax for LLM-inferred variables (`$@x`, `$(x)`, etc.)
3. **wp-p2-if-brace-rules** - When are parens required in IF conditions?
4. **wp-p2-interface-parameter-syntax** - How to define input params without `=` confusion
5. **wp-p2-brace-usage-audit** - Document when each brace type is needed
6. **wp-p2-operator-naming** - Name all operators for developer communication

### Implementation (after decisions)

7. **wp-p2-implement-with-clause** - Parser support for WITH: delegation
8. **wp-p2-remove-imports-syntax** - Remove imports: from spec/parser/docs
9. **wp-p2-type-syntax-colon** - Change type definitions from `=` to `:`
10. **wp-p2-unused-var-detection** - LSP enhancement for unused variable warnings
11. **wp-p2-example-cleanup** - Update all examples with new syntax
12. **wp-p2-example-feature-coverage** - Add PARALLEL FOR EACH, BREAK/CONTINUE examples
13. **wp-p2-docs-spec-sync** - Sync all documentation with final spec

## Execution Order

### Phase 1: Design Decisions
Run WPs 1-6 in parallel. Each should investigate and recommend, then await approval.

### Phase 2: Implementation
After all decisions approved:
- Update spec (grammar.md, language-spec.md)
- Update parser/compiler
- Update examples
- Update docs

### Phase 3: Validation
- Run `mdz check` on all examples
- Review for consistency
- Final documentation pass

## Acceptance Criteria

- [ ] All 6 design decisions made
- [ ] Spec updated with all decisions
- [ ] Parser implements all syntax changes
- [ ] All examples updated and compile clean
- [ ] Documentation matches implementation
- [ ] Operator glossary published
- [ ] Brace rules documented clearly

## Results

{To be filled out upon completion}

## Evaluation

{What did we learn? Did the coherence review help?}
