# MDZ (ZenMarkdown)

MDZ is a component-based architecture for multi-agent systems. It provides a markdown-based language for authoring LLM skills with static validation.

## Project Structure

```
packages/
├── core/              # Parser, compiler, AST (the core library)
│   └── src/
│       ├── parser/    # Lexer, parser, AST definitions
│       ├── compiler/  # Validator-first compiler
│       └── index.ts   # Main exports
├── cli/               # CLI tool (mdz command)
│   └── src/
└── lsp/               # Language Server Protocol implementation
    └── src/

src/                   # Legacy location (still used by tests, being migrated)
├── cli/
├── compiler/
├── lsp/
└── parser/

spec/
├── grammar.md         # Formal grammar specification (v0.3)
└── language-spec.md   # Language specification (v0.3)

editors/
├── vscode/            # VS Code extension (syntax highlighting)
└── zed/               # Zed extension (syntax highlighting)

examples/              # Example MDZ skills
tests/                 # Test suites
website/               # Documentation website and playground
```

## Key Principles

- **Source = Output**: No transformations. LLM sees what you write.
- **Validator-first**: Tooling catches errors before runtime.
- **LLM as Runtime**: Control flow is interpreted by the LLM, not expanded.

## CLI Commands

```bash
mdz compile <file>    # Compile and validate
mdz check <file>      # Validate only
mdz parse <file>      # Parse and output AST
mdz graph <file>      # Show dependency graph
mdz lsp               # Start language server
```

## Work Tracking

Work packages are tracked in `.opencode/work/`:
- `todo/` - Ready for work
- `in-progress/` - Currently being worked on
- `backlog/` - Future work
- `completed/` - Finished work

## Key Files

- `ROADMAP.md` - Project roadmap and exploration areas
- `VISION.md` - Design philosophy and goals
- `IDENTITY.md` - Project identity and positioning
- `CHANGELOG.md` - Version history

## Development

```bash
pnpm install          # Install dependencies
pnpm test             # Run tests
pnpm build            # Build root package
pnpm build:packages   # Build all packages
```

## Current State (v0.3)

- ✓ Validator-first compiler
- ✓ Type, scope, and reference validation
- ✓ Dependency graph extraction and cycle detection
- ✓ LSP server for IDE integration
- ✓ VS Code and Zed extensions
- ✓ Web playground with live validation
- ✓ Monorepo structure with packages/
