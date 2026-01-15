# v0.10 TextMate Grammar Update

## Goal
Update TextMate grammar to support END-delimited blocks for best-effort syntax highlighting.

## Scope
- `editors/vscode/syntaxes/mdz.tmLanguage.json`
- `editors/zed/languages/mdz/highlights.scm` (review for consistency)

## Approach
- Introduce begin/end patterns for `IF`/`FOR`/`WHILE`/`DO` blocks using `END`.
- Scope block-only keywords (`ELSE`, `ELSE IF`, `THEN`, `IN`, `DO`) within block contexts.
- Ensure semantic markers are not highlighted inside backticks or quotes.
- Keep limitations documented (no AST awareness, heuristic scoping only).

## Success Criteria
- Block structures are scoped correctly in TextMate.
- Keyword highlighting is constrained to block contexts.
- Escapes prevent false positives in inline code and strings.

## Progress Log

### 2026-01-14
- Updated TextMate grammar keywords for END-delimited blocks and line-start control flow.
- Prevented semantic markers from highlighting inside backticks/quotes by adjusting pattern order.
- Added begin/end block patterns for IF/FOR/WHILE and DO blocks using END.
