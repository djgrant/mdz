# Complete LSP Integration

## Goal/Problem

LSP server exists (`src/lsp/server.ts`) but isn't fully wired to VS Code extension. This is the #1 stickiness lever.

**Reference:** See findings in `.opencode/work/completed/wp-2026-01-03-stickiness-research.md`

## Scope

- `src/lsp/server.ts`
- `editors/vscode/src/extension.ts`
- `editors/vscode/package.json`

## Approach

1. Audit current LSP capabilities
2. Wire LSP to VS Code extension
3. Test real-time validation in editor
4. Document setup for users

## Hypothesis

Real-time validation in the editor creates daily touchpoint and stickiness.

## Results

{To be filled out upon completion}

## Evaluation

{Does validation work in real-time? Is setup frictionless?}
