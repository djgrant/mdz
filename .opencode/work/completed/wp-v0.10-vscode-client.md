# v0.10 VS Code Language Client

## Goal
Wire up the MDZ LSP server for semantic tokens in the VS Code extension.

## Scope
- `editors/vscode/src/extension.ts`
- `packages/lsp/` (stdio wrapper or server entrypoint)

## Approach
- Add a stdio launcher for the LSP server.
- Initialize `LanguageClient` in the extension activation.
- Register semantic token capabilities.
- Verify extension activation and server lifecycle.

## Success Criteria
- VS Code connects to the MDZ LSP server.
- Semantic tokens render in VS Code.
- Extension remains stable during open/close cycles.

## Progress Log

### 2026-01-14
- Added stdio LSP launcher in `packages/lsp/src/stdio.ts`.
- Wired VS Code extension to start the LSP client on activation.
