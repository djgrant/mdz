# v0.10 Block Syntax — Parser/Lexer

## Goal
Replace indentation-based blocks with END-delimited blocks and align core parsing with the new control flow syntax.

## Scope
- `packages/core/src/parser/lexer.ts`
- `packages/core/src/parser/parser.ts`
- `packages/core/src/parser/ast.ts` (if needed)

## Approach
- Remove INDENT/DEDENT token generation and `indentStack` handling.
- Add an `END` keyword token.
- Update block parsers for `FOR`, `WHILE`, `IF`, `ELSE IF`, and `ELSE` to consume `END`.
- Accept optional `DO` after `FOR`/`WHILE` and optional `THEN` after `IF`/`ELSE IF`.
- Support single-line `DO /instruction/` and multi-line `DO` blocks with `END`.
- Update error messages to expect `END` instead of indentation.

## Decisions
- Blocks open at line start with CAPS keywords.
- `FOR EACH` becomes `FOR $x IN $y`.
- No colon delimiters (`THEN:` → `THEN`, `DO:` → `DO`).
- Indentation is cosmetic only.

## Success Criteria
- Parser compiles without INDENT/DEDENT tracking.
- `FOR`/`WHILE`/`IF` accept optional delimiters.
- `DO` works in single-line and multi-line forms.
- `END` closes all blocks consistently.
