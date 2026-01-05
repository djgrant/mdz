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

## Questions Explored

### Key Design Constraints Identified

1. Needs opening and closing delimiters
2. Must indicate "inference/magic"
3. Should not conflict with Markdown unnecessarily
4. `{}` braces implied something they didn't deliver (interpolation/code)
5. `~~` conflicts with Markdown strikethrough
6. `$()` has shell substitution meaning
7. `$[]` conflicts with Markdown link syntax
8. `$<>` conflicts with HTML

### Options Considered

- `{~~thing~~}` - current, verbose and braces misleading
- `~~thing~~` - Markdown strikethrough conflict
- `~thing~` - still overloading strikethrough concept
- `$/thing/` - regex-evocative, clean, distinctive
- `$@thing` - sigil approach, but verbose for obvious cases

## Decision

**Chosen: `/thing/` for semantic markers, `$/name/` for inferred variables**

### Semantic Markers: `/thing/`

```mdz
# Before
Store at {~~appropriate location~~}
IF {~~file contains logic changes~~} THEN:

# After  
Store at /appropriate location/
IF /file contains logic changes/ THEN:
```

### Inferred Variables: `$/name/`

```mdz
FOR EACH $item IN $list:
  Log $/index/: $item
```

The LLM understands `$/index/` is the loop counter without declaration.

### Declared Semantic Types: `$var: /description/ = value`

```mdz
$iteration: /loop counter/ = 0
$strategy: /best approach for given constraints/
```

## Rationale

1. **Unified concept**: Both semantic markers and inferred variables are "LLM figures this out"
2. **Clean delimiters**: `/thing/` is visually distinctive and regex-evocative
3. **Variable integration**: `$/name/` combines variable sigil with semantic marker
4. **Not overly verbose**: LLM knows what `$/index/` means - no need to declare the obvious
5. **Optional explicitness**: `$var: /description/` available when semantic guidance helps

## Results

Decision made. Implementation tracked in `wp-p1-semantic-marker-syntax.md`.

## Evaluation

The `/thing/` syntax best balances:
- ✅ Clarity - visually distinctive
- ✅ Compatibility - no Markdown conflicts  
- ✅ Authoring experience - easy to type, intuitive
- ✅ Unification - one concept for all "LLM infers this" cases
