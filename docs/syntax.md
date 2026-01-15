# Syntax Reference

Complete reference for MDZ syntax, from document structure to control flow.

## Document Structure

An MDZ document is a valid markdown file with these extensions:

<!-- mdz-snippet: docs/snippets/syntax/document-structure.mdz -->

### Frontmatter

Required and optional fields in YAML frontmatter:

<!-- mdz-snippet: docs/snippets/syntax/frontmatter.mdz -->

**Note:** Dependencies can be declared in `uses:` or inferred from links in your document.

## Types

### Type Definitions

Types provide semantic hints about values:

<!-- mdz-snippet: docs/snippets/syntax/type-definitions.mdz -->

### Type Forms

- **Semantic type**: `$Task: /any executable instruction/`
- **Enum type**: `$Strategy: "fast" | "thorough"` (variants separated by **union** operator `|`)
- **Tuple type**: `($Task, $Strategy)`
- **Array type**: `$Task[]` (uses **array suffix**)
- **Function type**: `$fn = $x => expression` (uses **arrow** operator)

## Variables

Variables use the **dollar sigil** (`$`) prefix. The **type annotation** (`:`) is optional:

### Variable Declaration

<!-- mdz-snippet: docs/snippets/syntax/variable-declaration.mdz -->

### Examples

<!-- mdz-snippet: docs/snippets/syntax/variable-examples.mdz -->

### Lambda Expressions

Functions use the **arrow** operator (`=>`):

<!-- mdz-snippet: docs/snippets/syntax/lambda-expressions.mdz -->

### Semantic Type Annotations

When a variable needs a semantic description rather than a named type, use the **semantic type** syntax:

<!-- mdz-snippet: docs/snippets/syntax/semantic-type-annotations.mdz -->

This pattern makes semantic transformations explicit and avoids confusion about where properties come from.

## Links

Links reference other files using path syntax. The type is inferred from the folder:

### Link Syntax

- `~/skill/name` -- Link to a skill in the `skill/` folder
- `~/agent/name` -- Link to an agent in the `agent/` folder
- `~/tool/name` -- Link to a tool in the `tool/` folder
- `#section` -- Anchor to a section in the current file
- `~/skill/name#section` -- Link with anchor to a specific section

### Folder Conventions

The folder in the path determines the reference type:

- `agent/` -- Agents for delegation
- `skill/` -- Reusable skill modules
- `tool/` -- Tool integrations

### Examples

<!-- mdz-snippet: docs/snippets/syntax/link-examples.mdz -->

### Section Anchors

Section names are derived from headings by:

1. Converting to lowercase
2. Replacing spaces with hyphens
3. Removing special characters

<!-- mdz-snippet: docs/snippets/syntax/section-anchors.mdz -->

## Semantic Markers

The `/content/` syntax marks content for LLM interpretation. There are three forms:

### Inline Semantic Markers

Mark inline content that the LLM should interpret contextually:

<!-- mdz-snippet: docs/snippets/syntax/semantic-inline.mdz -->

Variables are expanded before interpretation:

<!-- mdz-snippet: docs/snippets/syntax/semantic-interpolation.mdz -->

### Inferred Variables

Use `$/name/` for variables the LLM infers and tracks without explicit declaration:

<!-- mdz-snippet: docs/snippets/syntax/inferred-variables.mdz -->

The LLM maintains these values implicitly based on context.

### Semantic Type Annotations

Use `/description/` as a type annotation for variables that need semantic descriptions:

<!-- mdz-snippet: docs/snippets/syntax/semantic-annotation-short.mdz -->

## Control Flow

### For Loop

Iterate over a collection using the **collection operator** (`IN`):

<!-- mdz-snippet: docs/snippets/syntax/for-loop.mdz -->

With **destructuring**:

<!-- mdz-snippet: docs/snippets/syntax/for-loop-destructuring.mdz -->

### While Loop

Loop with a **condition**. The `DO` keyword delimits the condition:

<!-- mdz-snippet: docs/snippets/syntax/while-loop.mdz -->

### Conditional

Branch with `IF`/`THEN` and optional **else clause**:

<!-- mdz-snippet: docs/snippets/syntax/conditional.mdz -->

### GOTO

Jump to a section anchor:

<!-- mdz-snippet: docs/snippets/syntax/goto.mdz -->

## Composition

### USE (Skill Invocation)

Invoke a skill to perform a task:

<!-- mdz-snippet: docs/snippets/syntax/use.mdz -->

### WITH Clause (Passing Templates)

Pass a section template when invoking:

<!-- mdz-snippet: docs/snippets/syntax/with-clause.mdz -->

### EXECUTE (Tool Invocation)

Execute a tool to perform an action:

<!-- mdz-snippet: docs/snippets/syntax/execute.mdz -->

### DELEGATE (Agent Delegation)

Delegate to an agent for autonomous work:

<!-- mdz-snippet: docs/snippets/syntax/delegate.mdz -->

### Pattern Summary

- **USE** -- Invoke skills for reusable workflows
- **EXECUTE** -- Run tools for external actions
- **DELEGATE** -- Spawn autonomous agents
- **GOTO** -- Jump to section anchors
- **WITH** -- Pass template sections

## Conventional Sections

While not required, these sections are conventional:

<!-- mdz-snippet: docs/snippets/syntax/conventional-sections.mdz -->
