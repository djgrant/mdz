# Changelog

All notable changes to MDZ will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-01-13

### Added - Language Extensions for Agent Orchestration

v0.9 introduces several language features designed for multi-agent orchestration patterns, particularly map-reduce workflows.

#### RETURN Statement
- Explicit return from skills with optional value
- Valid at end of section or loop iteration
- Implicit return (no RETURN keyword) means natural completion
- Example:
  ```mdz
  ## Workflow
  
  DO /analyze the problem/
  RETURN $solution
  ```

#### ASYNC/AWAIT DELEGATE
- `ASYNC DELEGATE` for fire-and-forget parallel delegation
- `AWAIT DELEGATE` for synchronous wait on result
- No modifier = LLM decides based on context
- Example:
  ```mdz
  FOR EACH $task IN $tasks:
    ASYNC DELEGATE /execute $task/ TO ~/agent/worker
  
  AWAIT DELEGATE /collect results/ TO ~/agent/aggregator
  ```

#### Optional TO in DELEGATE
- Target agent is now optional in DELEGATE statements
- Omitting TO means the runtime/LLM selects appropriate agent
- Example:
  ```mdz
  DELEGATE /analyze code/ WITH #analysis-template
  ```

#### Push Operator `<<`
- Collect values into arrays with `$array << value`
- Useful for aggregating results in loops
- Example:
  ```mdz
  $results = []
  FOR EACH $item IN $items:
    $results << /processed $item/
  ```

#### DO Instruction
- Standalone prose instruction keyword
- Distinct from `WHILE...DO` syntax (DO as delimiter)
- Example:
  ```mdz
  DO /summarize the findings into bullet points/
  ```

#### Frontmatter Declarations
- Types, input parameters, and context variables now declared in YAML frontmatter
- Cleaner separation between declarations and executable workflow
- Example:
  ```yaml
  ---
  name: my-skill
  description: When you need to process items
  
  types:
    $Task: /executable instruction/
    $Strategy: "parallel" | "sequential"
  
  input:
    $items: $Task[]
    $strategy: $Strategy = "parallel"
  
  context:
    $results: $Task[] = []
    $iteration: $Number = 0
  ---
  ```

#### WITH Parameter Syntax Change
- Parameters now use colon syntax: `param: value`
- No `$` prefix on parameter names in WITH blocks
- Example:
  ```mdz
  USE ~/skill/analyzer TO /analyze/:
    target: $codebase
    depth: 3
  ```

### Removed

#### PARALLEL FOR EACH
- **Breaking change**: `PARALLEL FOR EACH` construct removed
- Use `FOR EACH` with `ASYNC DELEGATE` instead
- Migration:
  ```mdz
  # Old (v0.8)
  PARALLEL FOR EACH $item IN $items:
    DELEGATE /process/ TO ~/agent/worker
  
  # New (v0.9)
  FOR EACH $item IN $items:
    ASYNC DELEGATE /process/ TO ~/agent/worker
  ```

#### ## Types, ## Input, ## Context Sections
- **Breaking change**: Dedicated sections for declarations removed
- All declarations now live in YAML frontmatter
- Body contains only executable workflow

### Changed

- Spec and grammar updated to v0.9
- Lexer: Added RETURN, ASYNC, AWAIT tokens; added PUSH operator; removed PARALLEL
- AST: Added ReturnStatement, PushStatement, DoStatement nodes
- Parser: Full v0.9 syntax support
- Compiler: RETURN placement validation, frontmatter declaration extraction
- Website: Updated Monaco and VS Code syntax highlighting

### Migration from v0.8

1. Replace `PARALLEL FOR EACH` with `FOR EACH` + `ASYNC DELEGATE`
2. Move `## Types`, `## Input`, `## Context` sections into frontmatter
3. Update WITH clause syntax: `$param = value` → `param: value`
4. Test with `mdz check` to verify syntax

### Tests

- Added v0.9 feature tests (RETURN, ASYNC/AWAIT, push, DO)
- Removed PARALLEL FOR EACH tests
- Total: 207 tests passing

## [0.7.0] - 2026-01-13

### Changed - Sigil-Based Reference Syntax

**Breaking change: Reference syntax has moved from wiki-links to sigils.**

v0.7 adopts a sigil-based reference syntax that is more explicit and consistent across all reference types.

#### Reference Syntax Changes

| Old Syntax | New Syntax |
|------------|------------|
| `[[skill]]` | `(~skill)` |
| `[[#section]]` | `(#section)` |
| `[[skill#section]]` | `(~skill#section)` |
| `DELEGATE TO $agent:` or `DELEGATE TO "agent"` | `DELEGATE TO (@agent):` |

#### Frontmatter Changes

The separate `skills:`, `agents:`, and `tools:` fields have been unified into a single `uses:` field with sigil prefixes:

**Before:**
```yaml
skills:
  - skill-a
  - skill-b
agents:
  - explorer
tools:
  - file-reader
```

**After:**
```yaml
uses:
  - ~skill-a
  - ~skill-b
  - @explorer
  - !file-reader
```

#### Why This Change?

- **Consistency** - All references use the same parenthesis-based syntax
- **Explicit typing** - Sigils (`~`, `@`, `#`, `!`) immediately indicate reference type
- **Cleaner parsing** - No ambiguity between wiki-links and markdown links
- **Unified frontmatter** - Single `uses:` field with typed references

### Migration

Update your `.mdz` files:

1. Replace `[[skill-name]]` with `(~skill-name)`
2. Replace `[[#section]]` with `(#section)`
3. Replace `[[skill#section]]` with `(~skill#section)`
4. Replace `DELEGATE TO "agent"` with `DELEGATE TO (@agent):`
5. Merge `skills:`, `agents:`, `tools:` into `uses:` with appropriate sigils

### Breaking Changes

- `[[wiki-link]]` syntax is no longer recognized
- Separate `skills:`, `agents:`, `tools:` frontmatter fields removed
- `DELEGATE TO` requires `(@agent)` syntax

## [0.3.0] - 2026-01-03

### Changed - Validator-First Architecture

**This release fundamentally changes how the compiler works.**

v0.3 adopts a validation-first model: the compiler validates source documents and extracts metadata, but does **not** transform the source. The LLM sees what you write.

#### Removed
- **Type expansion** - No longer transforms `$Task` → `Task (description)`
- **Semantic marker transformation** - `{~~content}` stays as `{~~content}`, not `(determine: content)`
- **Reference transformation** - References stay as written, not transformed
- **Compile flags** - Removed `--no-expand-types`, `--no-resolve-refs`, `--no-transform-sem`
- **Two-layer model** - No more "source format" vs "compiled format"

#### Added
- **Validation diagnostics** with error codes:
  - E008: Type not defined in document
  - E009: Skill not found in registry
  - E010: Section reference broken
  - W001: Skill not declared in uses/imports
- **Dependency graph extraction** - `result.dependencies` shows skill relationships
- **`MDZ graph` command** - Visualize dependencies (JSON, Mermaid, DOT formats)
- **`--metadata` flag** - Export extracted metadata to JSON
- **`buildFullDependencyGraph()`** - Detect cycles across skill registry
- **`createRegistry()`** - Build skill registry for cross-file validation

#### Why This Change?

The transformation model added complexity without clear benefits:
- LLMs can interpret MDZ syntax directly
- Transformations made debugging harder (source ≠ execution)
- "What you write is what runs" is easier to reason about

The new model is like **dbt for SQL**: you write the source, tooling validates it, the engine runs it unchanged.

### Migration

If you relied on compiled output format:
- Update any tooling that expected transformed syntax
- The source format IS the execution format now
- `compile()` returns source unchanged in `result.output`

### Breaking Changes

- `CompileResult.output` now equals the input source (plus optional debug header)
- Removed options: `expandTypes`, `resolveReferences`, `transformSemantics`
- Added options: `validateTypes`, `validateScope`, `validateReferences`
- CLI `MDZ compile` no longer transforms; use for validation + output

## [0.2.0] - 2026-01-03

### Added

#### PARALLEL FOR EACH
- New `PARALLEL FOR EACH` construct for concurrent iteration
- Enables fan-out to multiple agents
- Iterations execute independently
- Results collected when all complete
- Example:
  ```MDZ
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
    - path: "@MDZ/stdlib"
      alias:
        orchestrate-map-reduce: omr
  ```

#### Typed Parameters in WITH Clause
- Parameters in WITH clauses can now have type annotations
- Parameters without default values are marked as required
- Example:
  ```MDZ
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
  ```MDZ
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
- **Skill references** - Reference syntax with sigils
- **Semantic markers** - LLM-interpreted content (`{~~determine appropriate value}`)
- **Control flow** - FOR EACH, WHILE, IF/THEN/ELSE with CAPS keywords
- **Composition** - WITH clause for parameter passing

#### Parser
- Recursive descent parser with error recovery
- Lexer with all MDZ tokens
- Complete AST representation
- Source location tracking (spans)

#### Compiler
- Type expansion (`$Type` → `Type (description)`)
- Reference transformation (`[[ref]]` → `[ref]`)
- Semantic marker compilation (`{~~x}` → `(determine: x)`)
- Source map generation
- Compilation statistics

#### CLI
- `MDZ compile` - Compile skills to LLM-ready format
- `MDZ check` - Validate syntax
- `MDZ parse` - Export AST as JSON
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

### Planned for v0.4
- Registry-based skill resolution
- Cross-file validation
- Cycle detection across full skill graph
