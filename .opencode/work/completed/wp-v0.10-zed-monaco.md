# v0.10 Zed + Monaco Integration

## Goal
Enable semantic tokens in Zed and the web playground (Monaco).

## Scope
- `editors/zed/extension.toml`
- `website/src/pages/playground.astro`
- `website/src/zen-worker-entry.ts`

## Approach
- Configure Zed to connect to the MDZ language server.
- Add semantic token wiring in the playground’s Monaco setup.
- Ensure workers or server connection are compatible with the hosting model.

## Success Criteria
- Zed highlights MDZ via semantic tokens.
- Playground highlighting matches LSP output.
- No regressions to existing editor behavior.

## Progress Log

### 2026-01-14
- Added Zed language server config targeting `mdz-lsp` binary.
- Wired Monaco semantic tokens provider to the LSP worker.
