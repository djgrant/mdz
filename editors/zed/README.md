# MDZ for Zed

Syntax support for MDZ (ZenMarkdown) files in [Zed](https://zed.dev).

## Features

- File association for `.mdz` files
- Markdown-based syntax highlighting
- Auto-closing brackets: `[]`, `{}`, `()`, `""`, backticks
- Auto-closing for MDZ constructs: `[[]]`, `//`
- Block quote comment style

## Installation

### From Extension Registry (when published)

1. Open Zed
2. Go to Extensions (⌘+Shift+X)
3. Search for "MDZ"
4. Click Install

### Development Installation

1. Clone this repository
2. In Zed, use `zed: install dev extension`
3. Select the `editors/zed` directory

## MDZ-Specific Syntax

MDZ extends markdown with:

- **Variables**: `$varName`
- **Types**: `$TypeName`
- **Skill references**: `[[skill-name]]`
- **Section references**: `[[#section-name]]`
- **Semantic markers**: `/interpret this/`, `$/inferred-var/`
- **Control flow**: `FOR EACH`, `WHILE`, `IF THEN ELSE`

Note: Full MDZ syntax highlighting requires a custom Tree-sitter grammar.
This extension provides basic markdown highlighting as a foundation.

## License

MIT
