# LSP Sync Fixes

## Goal
Fix compilation errors and logic mismatches between `packages/lsp/src/stdio.ts` and `packages/lsp/src/server.ts`.

## Scope
- `packages/lsp/src/stdio.ts`
- `packages/lsp/src/server.ts`

## Tasks
1. **`setWorkspaceFolders`**
   - Add `setWorkspaceFolders(uris: string[]): void` to `ZenLanguageServer`.
   - Store `workspaceFolders`.

2. **`analyzeDocument` Visibility**
   - Expose a public `indexDocument(uri: string, content: string, registryKey?: string): void`.
   - Update `stdio.ts` to call `indexDocument` instead of `analyzeDocument`.
   - Update `server.ts` to use `indexDocument`.

3. **Registry Key Mismatch**
   - In `stdio.ts` (or wherever scanning happens), compute workspace-relative path for the registry key.
     - Strip `.mdz`.
     - Normalize separators.
   - Pass this key to `indexDocument`.
   - In `server.ts`, ensure `indexWorkspaceDocument` (or `indexDocument`) uses the passed key for the `skillRegistry`.

## Validation
- Ensure `packages/lsp` compiles without errors (`pnpm build` or `tsc`).
- Verify cross-file link resolution logic (mental check or test if possible).
