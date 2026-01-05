---
size: sm
category: language
parent: wp-p1-language-coherence-master
---

# Semantic Marker Closing Token

## Goal/Problem

Investigate whether semantic markers should use symmetric closing token `~~}` instead of just `}`.

## Current State

```mdz
{~~appropriate location}
```

## Alternative

```mdz
{~~appropriate location~~}
```

## Questions to Explore

1. Are there cases where `}` is ambiguous?
2. Does symmetric closing improve readability?
3. What do other languages do for similar constructs?
4. Is there a parsing benefit to symmetric tokens?
5. Does it affect syntax highlighting complexity?

## Considerations

- Symmetric looks more intentional and complete
- Single `}` could conflict in nested expressions
- More typing for authors
- Aesthetic preferences

## Approach

1. Audit all current semantic marker usage in examples
2. Identify any ambiguity cases
3. Research similar constructs in other languages
4. Propose recommendation with rationale

## Decision

**Keep `}` as the closing token** - No change needed.

## Results

### Investigation Summary

**1. Ambiguity Analysis**

Examined all usage in:
- `examples/*.mdz` (4 files, ~15 semantic markers)
- `tests/*.test.ts` (18+ test cases)
- `spec/grammar.md`

**Finding:** No ambiguity cases exist. The lexer (`packages/core/src/parser/lexer.ts:361-371`) correctly terminates at the first `}` or newline. Semantic markers cannot nest by design, and this constraint prevents any parsing ambiguity.

**2. Similar Constructs in Other Languages**

| Language | Opening | Closing | Symmetric? |
|----------|---------|---------|------------|
| Mustache/Handlebars | `{{` | `}}` | Yes |
| Jinja2 | `{{` / `{%` | `}}` / `%}` | Yes |
| Ruby string interp | `#{` | `}` | No |
| Shell parameter exp | `${` | `}` | No |
| ES6 template | `${` | `}` | No |

Languages with distinctive openers (`#{`, `${`) tend to use simple `}` closers. Languages with symmetric delimiters (`{{`/`}}`) use simpler openers. MDZ's `{~~` is already distinctive.

**3. Parsing Benefits**

Symmetric tokens would provide:
- Marginally better error recovery for unclosed markers
- More regular grammar structure

However, the current implementation already handles errors well (stops at newline if no `}` found).

**4. Readability**

Symmetric: `{~~appropriate location~~}` - visually balanced
Asymmetric: `{~~appropriate location}` - slightly lighter, still clear

The distinctive opener `{~~` already signals "semantic content" - the closer doesn't need to reinforce this.

**5. Syntax Highlighting**

Both approaches have similar complexity. Current implementation works correctly in VS Code and Zed extensions.

### Rationale for Keeping `}`

1. **No ambiguity exists** - Current grammar handles all cases correctly
2. **Less typing** - Semantic markers are used frequently; `}` is faster than `~~}`
3. **Precedent** - Ruby, Shell, and ES6 all use asymmetric patterns successfully
4. **MDZ philosophy** - "Source = Output" favors minimal ceremony
5. **Distinctiveness is in the opener** - `{~~` is unique enough; closer can be simple

### Trade-offs Accepted

- Slightly less visual symmetry (acceptable for reduced typing burden)
- Marginally weaker error messages for unclosed markers (acceptable; current recovery is adequate)

## Evaluation

The current `{~~content}` syntax has been validated across all examples and tests. It reads naturally, parses unambiguously, and aligns with MDZ's philosophy of minimal ceremony. No change recommended.
