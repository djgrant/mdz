# Changelog

All notable changes to zen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-03

### Added

#### PARALLEL FOR EACH
- New `PARALLEL FOR EACH` construct for concurrent iteration
- Enables fan-out to multiple agents
- Iterations execute independently
- Results collected when all complete
- Example:
  ```zen
  PARALLEL FOR EACH $item IN $items:
    - Process $item independently
  ```

#### Extended Imports in Frontmatter
- New `imports` field in frontmatter for explicit skill loading
- Support for path-based imports from local directories or packages
- Skill lists specify which skills to import
- Aliases allow shorter names in document body
- Example:
  ```yaml
  imports:
    - path: "./skills/"
      skills: [simplify, work-packages]
    - path: "@zen/stdlib"
      alias:
        orchestrate-map-reduce: omr
  ```

#### Typed Parameters in WITH Clause
- Parameters in WITH clauses can now have type annotations
- Parameters without default values are marked as required
- Example:
  ```zen
  Execute [[skill]] WITH:
    - $param: $Type = value     # Optional
    - $required: $Task          # Required
  ```

#### BREAK and CONTINUE
- New `BREAK` statement for early loop exit
- New `CONTINUE` statement to skip to next iteration
- Valid in FOR EACH, PARALLEL FOR EACH, and WHILE loops
- Parser error if used outside loops
- Example:
  ```zen
  FOR EACH $item IN $items:
    - IF $item.skip THEN:
      - CONTINUE
    - IF $found THEN:
      - BREAK
  ```

### Changed

- Lexer now recognizes PARALLEL, BREAK, CONTINUE keywords
- Parser tracks loop depth for BREAK/CONTINUE validation
- Compiler tracks statistics for new constructs
- Package version bumped to 0.2.0

### Tests

- Added 37 new tests for v0.2 features
- Total test count: 148 tests
- All existing tests pass (backward compatible)

### Documentation

- Updated language-spec.md to v0.2
- Updated grammar.md to v0.2
- Added examples for all new features

## [0.1.0] - 2026-01-03

### Added

#### Language Features
- **Frontmatter** - YAML metadata with name, description, and uses fields
- **Type definitions** - Semantic types (`$TypeName = description`) and enums (`$Enum = "a" | "b"`)
- **Variable declarations** - Typed variables (`$name: $Type = value`) and lambdas (`$fn = $x => expr`)
- **Skill references** - Wiki-link syntax (`[[skill-name]]`, `[[skill#section]]`, `[[#section]]`)
- **Semantic markers** - LLM-interpreted content (`{~~determine appropriate value}`)
- **Control flow** - FOR EACH, WHILE, IF/THEN/ELSE with CAPS keywords
- **Composition** - WITH clause for parameter passing

#### Parser
- Recursive descent parser with error recovery
- Lexer with all zen tokens
- Complete AST representation
- Source location tracking (spans)

#### Compiler
- Type expansion (`$Type` → `Type (description)`)
- Reference transformation (`[[ref]]` → `[ref]`)
- Semantic marker compilation (`{~~x}` → `(determine: x)`)
- Source map generation
- Compilation statistics

#### CLI
- `zen compile` - Compile skills to LLM-ready format
- `zen check` - Validate syntax
- `zen parse` - Export AST as JSON
- Verbose mode with statistics
- Source map output

#### LSP Server
- Document analysis
- Go-to-definition for references and variables
- Hover information for types
- Autocomplete for `[[`, `$`, and `{~~`
- Document symbols
- Diagnostics

#### IDE Support
- VS Code extension skeleton
- TextMate grammar for syntax highlighting
- Language configuration (brackets, comments)

#### Documentation
- Language specification (v0.1)
- Formal EBNF grammar
- Example skills

#### Testing
- 111 tests total
- Parser tests (31)
- Compiler tests (27)
- Integration tests (21)
- Stress tests (32)

### Technical Details

- Pure TypeScript implementation
- No external runtime dependencies
- Node.js 20+ required
- ~6,000 lines of code

## [Unreleased]

### Planned for v0.3
- Inline conditionals (simple form only)
- Multi-line lambda bodies (evaluate need)
- TRY-CATCH (if use cases emerge)
