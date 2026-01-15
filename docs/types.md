# Type System

Types in MDZ are contracts for tooling and semantic hints for LLMs--not runtime enforcement.

## Philosophy

Unlike traditional programming languages, MDZ types are:

- **Descriptive** -- They document intent for humans
- **Interpretive** -- They guide LLM behavior
- **Tooling-friendly** -- They enable validation and autocomplete
- **Build-time checked** -- Contract compatibility verified before runtime

## Types as Contracts

Types enable tooling to check that modules fit together correctly:

<!-- mdz-snippet: docs/snippets/types/type-contracts.mdz -->

This mismatch is caught at build time--before the LLM ever sees it. Without MDZ, you'd discover it at runtime with a confused LLM.

## Defining Types

### Semantic Types

Natural language descriptions that help LLMs understand values:

<!-- mdz-snippet: docs/snippets/types/semantic-types.mdz -->

### Enum Types

Constrained sets of string values using the **union** operator (`|`):

<!-- mdz-snippet: docs/snippets/types/enum-types.mdz -->

### Tuple Types

**Tuples** combine multiple types:

<!-- mdz-snippet: docs/snippets/types/tuple-types.mdz -->

### Array Types

Collections using the **array suffix** (`[]`):

<!-- mdz-snippet: docs/snippets/types/array-types.mdz -->

### Function Types

**Lambda expressions** using the **arrow** operator (`=>`):

<!-- mdz-snippet: docs/snippets/types/function-types.mdz -->

## Using Types

### Typed Declarations

Use the **type annotation** (`:`) to declare variable types:

<!-- mdz-snippet: docs/snippets/types/typed-declarations.mdz -->

### What Tooling Checks

The MDZ validator performs static analysis on types:

- **Undefined types** -- Using `$Foo` without defining it
- **Contract mismatches** -- Passing wrong type across skill boundaries
- **Typos** -- `$Numbr` flagged with "did you mean `$Number`?"

The LLM sees the types as you wrote them--`$Task` stays `$Task`. Types are signals to both tooling and the LLM, not something that gets transformed.

## Built-in Types

These types are implicitly available:

- `$String` -- text content
- `$Number` -- numeric value
- `$Boolean` -- true or false

## Best Practices

- Use descriptive names: `$Hypothesis` not `$H`
- Write clear descriptions: think "what would help an LLM understand this?"
- Use enums for fixed sets of options
- Define types at the top of your skill in a `## Types` section
