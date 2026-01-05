---
size: md
category: language
---

# Semantic Marker and Inferred Variable Review

## Goal/Problem

Two related syntax questions need comprehensive review:

1. **Semantic markers** - Current `{~~content}` syntax is "messy". Consider alternatives.
2. **Inferred variables** - Variables like `$iteration` used without declaration need syntax.

These may be unified: both represent "LLM figures this out".

## Current State

### Semantic Markers
```mdz
{~~appropriate location}
{~~the path for candidate $n}
```

### Inferred Variables
```mdz
WHILE ($iteration < 5):  <!-- $iteration never declared -->
```

## Questions to Explore

### Semantic Marker Syntax Options

| Option | Syntax | Notes |
|--------|--------|-------|
| Current | `{~~text}` | Distinctive but verbose |
| Single tilde | `~text~` | Not standard Markdown |
| Double tilde | `~~text~~` | Conflicts with Markdown strikethrough |
| Other | `«text»` | Unicode, hard to type |

### Inferred Variable Options

| Option | Syntax | Notes |
|--------|--------|-------|
| Declaration | `$iteration: ~~counter~~` | Explicit but verbose |
| Shorthand | `~~iteration~~` | If we use ~~ for semantic markers |
| Sigil | `$@iteration` | Distinct from regular vars |
| Parens | `$(iteration)` | Similar to shell |

### Unification Possibility

If `~~content~~` means "LLM infers this", then:
- `~~iteration~~` = inferred variable (LLM knows what this means)
- `$x: ~~description~~` = variable with semantic type

This is elegant but has the Markdown strikethrough conflict.

## Scope

- Research Markdown compatibility implications
- Prototype different syntax options
- Evaluate readability and authoring experience
- Make recommendation

## Considerations

1. **Markdown superset philosophy** - Should MDZ repurpose `~~` strikethrough?
2. **Tooling** - Syntax highlighting, editor support
3. **Authoring** - What's easy to type and remember?
4. **Visual clarity** - What's scannable in a document?

## Approach

1. Document all current semantic marker and implicit variable usage
2. Prototype each syntax option with real examples
3. Test Markdown rendering implications
4. Evaluate against MDZ design principles
5. Make recommendation with trade-offs

## Hypothesis

A unified syntax for "LLM-interpreted content" will simplify the language, but must be carefully designed to avoid Markdown conflicts.

## Results

{To be filled out upon completion}

## Evaluation

{Which syntax best balances clarity, compatibility, and authoring experience?}
