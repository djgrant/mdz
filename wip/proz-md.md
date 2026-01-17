# Proz-MD (MDZ) Host Specification

Proz-MD defines how Markdown implements the Proz interface. MDZ is the Markdown host for Proz (MD(pro)Z).

## Scope

This document specifies the Markdown mapping rules and host-specific constraints. It does not redefine Proz semantics.

## Block Mapping

Markdown is segmented into blocks and passed to Proz using these rules:

- Headings (`#`, `##`, ...) → section blocks with `level`, `title`, `anchor`
- Fenced code blocks (```lang) → code block with `language`, `content`
- Unordered/ordered lists (`-`, `1.`) → list blocks with list items
- Horizontal rule (`---`) → horizontal rule block
- Blockquote (`>`) → paragraph block (host may override)

## Inline Mapping

Inline tokens inside paragraphs/list items are exposed to Proz:

- Text → inline text
- `~/path` → link token
- `#anchor` (not at line start) → anchor token
- `$name` → variable reference token

Markdown emphasis/strong/code spans may be preserved but are not required for Proz semantics.

## Frontmatter

If the document begins with YAML frontmatter:

- Delimiter is `---` on its own line
- Parsed YAML is provided to Proz as structured metadata

## Anchor Rules

Section anchors are generated from heading text by:

- Lowercasing
- Replacing whitespace with `-`
- Removing non-word characters

## Conflict Rules

- Proz constructs take precedence when unambiguous.
- Fenced code blocks are opaque to Proz.

## Versioning

- Proz-MD versions track Markdown mapping changes.
- Proz core versions remain the source of truth for semantics.
