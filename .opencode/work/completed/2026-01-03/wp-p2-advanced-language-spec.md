---
size: md
category: language
---

# Advanced Language Spec Section [COMPLETED]

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

- Enhanced `/docs/internals` page with concrete code examples:
  - Real lexer tokenization examples with actual input/output
  - Complete AST node structures with TypeScript interfaces
  - Validation diagnostic examples with error codes and messages
- Added deeper technical details:
  - Indentation stack algorithm and data structures
  - Recursive descent parsing algorithms with grammar rules
  - Dependency graph construction with cycle detection
  - Trade-offs of validator-first approach vs alternatives
- Included contributor pathways:
  - How to extend the lexer for new token types
  - Adding new AST nodes and validation rules
  - LSP protocol integration challenges
- Added implementation challenges section
- Added navigation link in docs sidebar
- Content follows existing doc structure and style

## Evaluation

The enhanced internals documentation now provides concrete technical depth that attracts contributors and builds trust. By including real code examples, AST structures, and detailed algorithms, the documentation demonstrates the robustness and elegance of the MDZ architecture.

### Key Improvements:

**Concrete Code Examples**: Added actual lexer tokenization examples, AST dumps, and validation diagnostics that show how the system works in practice.

**Technical Depth**: 
- Detailed indentation stack algorithm with edge cases
- Recursive descent parsing with grammar production rules
- Dependency graph construction using DFS cycle detection
- Clear explanation of validator-first trade-offs

**Contributor Pathways**: 
- Step-by-step guides for extending lexer and parser
- Examples of adding new AST nodes and validation rules
- LSP integration patterns and challenges

**Trust Building**: Real code examples and algorithmic details show the engineering quality of the system, addressing previous concerns about superficial coverage.

The documentation now serves as both an educational resource and a practical guide for contributors looking to understand or extend the MDZ language implementation.