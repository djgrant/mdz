---
size: sm
category: language
---

# zen → MDZ Naming Sweep

## Goal/Problem

Replace remaining "zen" references with "MDZ" in prose and `mdz` in code for consistency.

## Scope

- All markdown documentation
- Website content
- Code comments
- CLI help text
- Package names if applicable

## Approach

1. Grep for "zen" (case insensitive) across the codebase
2. Review each occurrence - some may be intentional (e.g., "zen philosophy")
3. Replace with "MDZ" in prose, `mdz` in code/CLI
4. Verify no broken references

## Hypothesis

A clean sweep will improve brand consistency and reduce confusion.

## Results

**Updated 18 files:**

Spec files:
- `spec/language-spec.md` - "Zen Language Specification" → "MDZ Language Specification"
- `spec/grammar.md` - "Zen Grammar Specification" → "MDZ Grammar Specification"

Source files:
- `src/index.ts` - "Zen Language" → "MDZ (ZenMarkdown)", 'zen-lang' → 'zenmarkdown'
- `src/parser/parser.ts` - "Zen Parser" → "MDZ Parser"
- `src/parser/lexer.ts` - "Zen Lexer" → "MDZ Lexer"
- `src/parser/ast.ts` - "Zen AST" → "MDZ AST"
- `src/lsp/server.ts` - "Zen Language Server" → "MDZ Language Server"

Test files:
- `tests/compiler.test.ts` - updated comments and output
- `tests/parser.test.ts` - updated comments and output
- `tests/integration.test.ts` - updated output
- `tests/stress/edge-cases.test.ts` - updated comments and output
- `tests/v02-features.test.ts` - updated output

Other:
- `website/README.md` - "Zen Website" → "MDZ Website"
- `website/src/zen-worker-entry.ts` - updated all comments
- `editors/vscode/src/extension.ts` - updated activation log
- `poc/compiler.ts`, `poc/parser-minimal.ts`, `poc/lsp-prototype.ts` - updated headers
- `ROADMAP.md` - marked this task as complete

**Preserved intentionally:**
- `IDENTITY.md` - "Why Zen?" section explains philosophical origin
- CSS class names like `.zen-keyword` - internal identifiers in website
- Monaco language ID `zen` - internal identifier for syntax highlighting
- File names like `zen.tmLanguage.json` - keeping for now (could rename later)

## Evaluation

The sweep was straightforward. The codebase now consistently uses "MDZ" in user-facing prose while preserving "zen" where it serves as an internal identifier or refers to the philosophy behind the name.
