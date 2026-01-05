---
size: sm
category: examples
parent: wp-p1-language-coherence-master
---

# Example Consistency Review

## Goal/Problem

The 4 example files should demonstrate consistent patterns and conventions. Review for any inconsistencies or non-standard patterns.

## Scope

- `examples/pr-reviewer.mdz`
- `examples/skill-composer.mdz`
- `examples/the-scientist.mdz`
- `examples/debugger.mdz`

## Consistency Checklist

### Frontmatter
- [ ] All use `name:`, `description:`, `uses:` consistently
- [ ] Description format consistent ("When..." pattern)
- [ ] Uses declarations accurate

### Types Section
- [ ] All define types at top
- [ ] Consistent formatting (semantic vs enum)
- [ ] Type naming conventions ($UpperCase)

### Input/Context Sections
- [ ] Consistent structure
- [ ] Type annotations used appropriately
- [ ] Default values where sensible

### Control Flow
- [ ] FOR EACH patterns consistent
- [ ] IF/THEN/ELSE formatting consistent
- [ ] WHILE usage appropriate
- [ ] Indentation consistent (2 spaces)

### Section References
- [ ] [[#section]] references all resolve
- [ ] Section naming follows kebab-case

### Delegation Patterns
- [ ] Consistent approach to skill delegation
- [ ] (Depends on delegation decision)

## Known Patterns to Review

1. **the-scientist.mdz** uses `Delegate to sub-agent with [[#prompt]]:`
2. **skill-composer.mdz** uses `Execute [[skill]] WITH:`
3. These two patterns should be reconciled

## Approach

1. Read all 4 examples carefully
2. Document any inconsistencies found
3. Propose standardization
4. Apply fixes

## Hypothesis

Consistent examples are better teaching material and project a more professional image.

## Results

{To be filled out upon completion}

## Evaluation

{What patterns should become the standard?}
