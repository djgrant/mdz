# MDZ Language Extension for VS Code

Syntax highlighting and language support for MDZ (Zen Markdown) files.

## Features

- Syntax highlighting for `.mdz` files
- Control flow keywords (FOR EACH, WHILE, IF/THEN/ELSE)
- Variable and type highlighting
- Skill references ([[links]])
- Semantic markers (/content/)

## Development

This extension is part of the MDZ workspace. To work on it:

```bash
# From the repository root
pnpm install
pnpm -F @zenmarkdown/vscode-extension build

# Watch mode
pnpm -F @zenmarkdown/vscode-extension watch
```

## Installation

### From VSIX

Package and install the extension locally:

```bash
# From the repository root
cd editors/vscode
pnpm package
code --install-extension zenmarkdown-vscode-extension-0.3.0.vsix
```

You may need to reload VS Code for the extension to fully activate.

## Commands

- **MDZ: Check Syntax** - Validate the current MDZ file
- **MDZ: Compile Current File** - Compile and validate the current file

## Configuration

- `mdz.expandTypes` - Expand type references during compilation (default: true)
- `mdz.resolveReferences` - Resolve skill references during compilation (default: true)
- `mdz.transformSemantics` - Transform semantic markers during compilation (default: true)

## About MDZ

MDZ is a markdown extension language for multi-agent systems. For more information, see the [main repository](https://github.com/djgrant/mdz).
