# v0.10 LSP Semantic Tokens

## Goal
Provide precise, context-aware syntax highlighting via LSP semantic tokens.

## Scope
- `packages/lsp/src/server.ts`

## Approach
- Define semantic token legend (keywords, variables, numbers, strings, semantic markers, operators).
- Walk the AST and emit tokens based on syntactic position.
- Ensure tokens differentiate block keywords vs inline text.
- Keep TextMate as fallback; LSP provides authoritative highlighting.

## Success Criteria
- Semantic tokens cover all language constructs.
- Tokens align with actual AST positions and contexts.
- VS Code and other LSP clients render precise highlighting.

## Progress Log

### 2026-01-14
- Added semantic token legend and token generation in `packages/lsp/src/server.ts`.
- Tokenized keywords, variables, types, links, anchors, semantic markers, strings, numbers, and operators.
