# Advanced Language Spec Section

## Goal/Problem

Documentation lacks deep dive on how MDZ works under the hood.

**Reference:** ROADMAP.md - Documentation Ideas

## Scope

- New docs section
- Technical deep dive

## Approach

1. Parser architecture
2. AST structure
3. Validation pipeline
4. Compiler internals
5. LSP integration

## Hypothesis

Technical documentation attracts contributors and builds trust.

## Results

- Created new `/docs/internals` page covering:
  - Parser architecture (lexer + recursive descent)
  - AST structure (complete type definitions)
  - Validation pipeline (5-stage process)
  - Compiler internals (validator-first approach)
  - LSP integration (full IDE support)
- Added navigation link in docs sidebar
- Content includes code examples and technical details
- Follows existing doc structure and style

## Evaluation

The internals documentation successfully bridges the gap between high-level concepts and implementation details. Contributors can now:

- Understand the parsing pipeline from source to AST
- Navigate the comprehensive type system
- Follow the validation flow for debugging
- See how the validator-first compiler works
- Learn about LSP features for tooling development

This helps contributors understand the codebase by providing a clear technical foundation while maintaining accessibility. The documentation is detailed enough for developers but not overwhelming for those just learning the system.
