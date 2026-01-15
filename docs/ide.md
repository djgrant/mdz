# IDE Support

Syntax highlighting, LSP features, and editor support for MDZ.

## VS Code

Install the `zenmarkdown` extension for:

- Syntax highlighting for `.mdz` files
- Control flow keywords (FOR, WHILE, IF/THEN/ELSE, END)
- Composition keywords (USE, EXECUTE, DELEGATE, GOTO)
- Variable and type highlighting
- Link highlighting (`~/skill/name`, `~/agent/name`)
- Anchor highlighting (`#section`)
- Semantic markers

### Installing from Source

```bash
cd editors/vscode
npm install
npm run compile
# Copy to ~/.vscode/extensions/
```

## TextMate Grammar

A standalone TextMate grammar is available at `editors/vscode/syntaxes/mdz.tmLanguage.json` for use with other editors that support TextMate grammars:

- Sublime Text
- Atom
- TextMate
- Any editor with TextMate bundle support

## Language Features

The grammar highlights:

- **Frontmatter** -- YAML metadata
- **Headings** -- Section markers
- **Types** -- `$TypeName` in cyan
- **Variables** -- `$varName` in yellow
- **Keywords** -- FOR, WHILE, USE, DELEGATE, etc. in purple
- **Links** -- `~/skill/name`, `~/agent/name` in blue
- **Anchors** -- `#section` in blue
- **Semantics** -- semantic markers in pink
- **Strings** -- "quoted" in green

TextMate highlighting is best-effort. For precise, context-aware highlighting, use the LSP semantic tokens below.

## Highlighter Sources

The project currently maintains three highlighters:

- **TextMate grammar** -- `editors/vscode/syntaxes/mdz.tmLanguage.json`
- **Monaco Monarch tokenizer** -- `website/src/pages/playground.astro`
- **LSP semantic tokens** -- `packages/lsp/src/server.ts`

## Language Server (LSP)

MDZ includes a language server with the following features:

- Autocomplete after `~/`, `#`, `$`, and `/`
- Hover information for types and variables
- Go-to-definition for links and anchors
- Error diagnostics
- Document symbols
- Semantic tokens for context-aware highlighting

### Using the LSP

```typescript
import { createLanguageServer } from 'zenmarkdown/lsp/server';

const server = createLanguageServer();
// Connect to your editor's LSP client
```

For VS Code integration, the extension handles LSP setup automatically. See `editors/vscode/` for implementation details.
