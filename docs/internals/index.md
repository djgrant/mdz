# Language Internals

Deep dive into how MDZ works under the hood: parser architecture, AST structure, validation pipeline, compiler internals, and LSP integration.

## Architecture Overview

When you run `mdz compile skill.mdz`, the following pipeline executes:

1. **Lexer** tokenizes the source into a stream of tokens
2. **Parser** builds an Abstract Syntax Tree (AST)
3. **Compiler** extracts metadata and validates
4. **Output** returns the original source (unchanged)
5. **LSP** provides IDE features during editing

This architecture ensures MDZ skills are validated at build time while remaining readable by both humans and LLMs at runtime.

### Core Principle: Source = Output

**The LLM sees exactly what you write.** There is no transformation layer between source and execution. The compiler:

- Parses the source into AST
- Extracts metadata and validates
- Returns the original source unchanged
- Provides diagnostics and dependency information

## Internals Documentation

Explore the detailed documentation for each component:

- [AST Structure](/docs/internals/ast) -- Parser architecture, lexer tokens, recursive descent parsing, and AST node types
- [Compilation](/docs/internals/compilation) -- Compiler internals, metadata extraction, skill registry, and dependency graph
- [Validation](/docs/internals/validation) -- Multi-stage validation pipeline with concrete diagnostic examples
- [Terminology](/docs/internals/terminology) -- Glossary of MDZ syntax elements and canonical terms

## Implementation Challenges

Key challenges encountered during MDZ development and their solutions:

### Indentation-Aware Parsing

**Challenge:** Python-style significant whitespace is complex to parse correctly, especially with mixed tabs/spaces and error recovery.

**Solution:** Indentation stack with explicit INDENT/DEDENT tokens, panic-mode error recovery, and clear error messages for inconsistent indentation.

### Source = Output Constraint

**Challenge:** Validator-first approach requires preserving exact source formatting while still validating semantics.

**Solution:** No transformation pipeline - compiler only extracts metadata and validates, returns original source unchanged.

### Skill Registry Management

**Challenge:** Cross-skill validation requires loading and caching multiple ASTs, with potential for stale data and performance issues.

**Solution:** Lazy loading with invalidation on file changes, workspace-wide registry with efficient lookup, and graceful degradation when skills are unavailable.

### LLM-Friendly Error Messages

**Challenge:** Technical error messages are confusing for LLM authors who may not understand compiler internals.

**Solution:** Context-aware error messages with suggestions, examples of correct syntax, and progressive disclosure of technical details.

### Real-Time IDE Performance

**Challenge:** LSP must provide instant feedback during typing, but full validation can be expensive.

**Solution:** Incremental parsing with AST diffing, cached validation results, and prioritized error reporting (syntax > types > references).

## Contributor Pathways

MDZ is designed to be extensible. Here are key areas where contributors can add functionality:

### Extending the Lexer

To add a new token type (e.g., a new keyword):

1. Add token type to `TokenType` union in `lexer.ts`
2. Add pattern matching in `scanIdentOrKeyword()`
3. Handle in parser grammar productions
4. Add syntax highlighting rules to editor extensions

### Adding AST Nodes

To add new language constructs:

1. Define AST interface in `ast.ts`
2. Add to appropriate union type (`Block`, `Expression`, etc.)
3. Implement parser production in `parser.ts`
4. Add validation logic in `compiler.ts`
5. Update LSP handlers for IDE features

### Validation Rules

Extend validation by adding new stages or modifying existing ones:

- **Type checking:** Add custom type rules beyond basic resolution
- **Contract validation:** Verify delegation parameter matching
- **Cross-skill analysis:** Validate data flow between skills

### LSP Protocol Integration

IDE features are implemented as LSP message handlers:

- **textDocument/completion:** Add context-aware suggestions
- **textDocument/hover:** Provide type/variable information
- **textDocument/definition:** Implement go-to-definition for new constructs
