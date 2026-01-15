# v0.10 Tests, Examples, and Spec Updates

## Goal
Bring tests, examples, and specs in line with END-delimited block syntax and updated control-flow rules.

## Scope
- `tests/**/*.mdz`
- `examples/**/*.mdz`
- `spec/language-spec.md`
- `spec/grammar.md`

## Approach
- Replace `FOR EACH` with `FOR ... IN` and remove colon delimiters.
- Update `WHILE` and `IF` examples to use optional `DO`/`THEN` without colons.
- Add `END` to all multi-line blocks.
- Update the formal grammar and control-flow sections of the spec.
- Ensure fixtures align with new `DO` single-line vs multi-line rules.

## Success Criteria
- Specs describe the new syntax accurately.
- All tests and examples use END-delimited blocks.
- Spec, grammar, and fixtures are mutually consistent.
