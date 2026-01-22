# MDZ Specification

## 1. Overview

MDZ extends a host text format e.g. Markdown with a small set of all-caps keywords that opt a line into programmatic control flow. Everything else remains
host text and is preserved as-is.

The parser yields a stream of blocks that alternate between:
- host blocks (raw host text), and
- MDZ blocks (AST nodes for statements and expressions).

MDZ is indentation-insensitive. Line breaks are meaningful for separating statements and host text, but indentation is treated as presentation only.

Conformance is defined by the fixture suite in `grammar/tests/`.

MDZ differs from conventional programming languages  by its flexibility to express non-deterministic behaviours. The language is designed to be intuitive to both humans and LLMs.  

This spec documents both syntax and the intended runtime semantics.

## 2. Lexical and Layout Rules

MDZ is case-sensitive. Keywords are written in all caps to clearly signal an opt-in to programmatic control flow.

MDZ is indentation-insensitive. Indentation is treated as presentation only and must not affect parsing or runtime behavior.

Blocks are delimited by grammar rules, including keywords and line breaks. Prose may be nested within the MDZ AST.

Statements start when a line begins with an MDZ keyword, optionally preceded by a list marker (see below). 

Blank lines are preserved as host text unless inside an MDZ block, in which case they are ignored.

List markers are optional in Markdown hosts to prevent formatters (e.g. Prettier) from stripping indentation. When present, a list marker immediately preceding an
MDZ keyword is ignored by the parser. 

Numbered list markers are not treated as MDZ statements and are parsed as host text.

MDZ does not define its own comment syntax. Use host-language comments (e.g. `<!-- -->` in Markdown).

## 3. Host Text and Block Stream

The parser emits a block stream, preserving host text exactly as it appears in the source, including whitespace and punctuation. Host text is emitted as contiguous blocks until a statement is encountered.

MDZ statements and blocks interleave with host text. A block may contain nested host blocks (e.g. prose inside `FOR`, `IF`, `WHILE`, or `CASE`), which are emitted as `host` nodes inside that block’s AST.

Block boundaries are determined by construct grammar. Once a statement begins, if the required syntax does not follow, parsing fails. For example, after `FOR` the parser expects `IN`.
