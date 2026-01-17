# Proz Core Specification (Interface)

Proz is the host-agnostic interface for MDZ-style documents. It defines the execution constructs and the validation rules, plus the minimal contract a host parser must satisfy. Proz itself is not a parser.

## What Proz Defines

- Execution constructs (variables, types, control flow, delegation, expressions)
- Validation and scoping rules
- The shape of metadata (frontmatter) if the host supports it

## Host Contract

A host parser (Markdown, HTML, etc.) provides Proz with a **structured stream** of text blocks and their source spans. Proz scans those blocks for its constructs and ignores host-specific markup.

A host must provide:

- **Block stream**: ordered blocks with a `kind`, raw text, and source span
- **Inline spans**: a way to identify inline tokens inside block text (at minimum `$name`, `~/path`, `#anchor`)
- **Optional sections**: if the host has a section concept, provide titles + anchors
- **Optional metadata**: frontmatter as a structured map if the host supports it

This contract is intentionally abstract. Hosts decide how to segment text (paragraphs, list items, headings, etc.) as long as Proz can consistently locate constructs and spans.

## Execution Constructs

- Variable declarations
- Type definitions
- Control flow (`IF`, `FOR`, `WHILE`, `DO`, `END`)
- Delegation (`DELEGATE`, `USE`, `EXECUTE`, `GOTO`)
- Expressions (literals, references, calls, comparisons)

## Validation Rules

- Required frontmatter fields (if present)
- Variable/type reference validity
- Control-flow structure (`END` matching)
- Link and anchor resolution

## Versioning

Proz versions track semantic compatibility, not host syntax.
