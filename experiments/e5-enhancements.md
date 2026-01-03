# Phase 5: Enhancement Exploration

This document explores potential improvements to the zen language for Phase 6 consideration.

## 1. Inline Conditionals

**Current syntax:**
```zen
IF $strategy = "accumulate" THEN:
  - Use $validator
```

**Proposed inline syntax:**
```zen
Use $validator IF $strategy = "accumulate"
Use $fallbackValidator OTHERWISE
```

**Alternative - Ternary style:**
```zen
$activeValidator = $strategy = "accumulate" ? $validator : $fallbackValidator
```

**Assessment:**
- Inline conditionals reduce verbosity for simple cases
- Risk: Can become unreadable for complex conditions
- Recommendation: Add for single expressions only, not blocks

## 2. PARALLEL FOR EACH

**Current limitation:** FOR EACH is sequential

**Proposed syntax:**
```zen
PARALLEL FOR EACH $item IN $items:
  - Process $item independently
```

**Semantics:**
- All iterations can execute concurrently
- Order of completion is not guaranteed
- Results collected when all complete

**Alternative - WITH PARALLELISM modifier:**
```zen
FOR EACH $item IN $items WITH PARALLELISM:
  - Process $item
```

**Assessment:**
- High value for LLM orchestration (spawn multiple agents)
- Need to clarify merge semantics
- Need to handle partial failures
- Recommendation: Add in v0.2 with clear failure modes

## 3. Multi-line Lambda Bodies

**Current limitation:** Lambda body must fit on one line

**Current syntax:**
```zen
$SolutionPath = $n => `output-{$n}.md`
```

**Proposed block syntax:**
```zen
$SolutionPath = $n => {
  $base = {~~appropriate directory}
  `{$base}/output-{$n}.md`
}
```

**Assessment:**
- Would add significant complexity to parser
- Risk: Blurs line between functions and skills
- Alternative: Keep lambdas simple, use [[#section]] for complex logic
- Recommendation: Defer to v0.3, may not be needed

## 4. Import Statements

**Current limitation:** All skills resolved by name from registry

**Proposed syntax:**
```zen
IMPORT simplify, work-packages FROM "./skills/"
IMPORT { orchestrate-map-reduce AS omr } FROM "@zen/stdlib"
```

**Alternative - YAML frontmatter extension:**
```yaml
---
name: my-skill
imports:
  - path: "./skills/"
    skills: [simplify, work-packages]
  - path: "@zen/stdlib"
    alias:
      orchestrate-map-reduce: omr
---
```

**Assessment:**
- Frontmatter approach is cleaner (consistent with `uses`)
- Need to define resolution algorithm
- Consider: Should skills be implicitly available from workspace?
- Recommendation: Extend frontmatter in v0.2

## 5. Error/Exception Handling

**Current approach:** Explicit IF checks

```zen
IF $result = "regression" THEN:
  - Revert
  - Retry
```

**Proposed TRY-CATCH:**
```zen
TRY:
  - Execute risky operation
  - Continue on success
CATCH $error:
  - Log $error
  - Apply fallback
FINALLY:
  - Cleanup always runs
```

**Assessment:**
- TRY-CATCH is familiar but adds complexity
- Semantic conditions make errors fuzzy (what is an error?)
- Alternative: Error types like `$Result = "success" | "failure" | "retry"`
- Recommendation: Stick with explicit checks for v0.2

## 6. Typed Parameters in Delegation

**Current syntax:**
```zen
Execute [[skill]] WITH:
  - $param = value
```

**Proposed with types:**
```zen
Execute [[skill]] WITH:
  - $param: $Type = value
  - $required: $Task
```

**Assessment:**
- Types on parameters enable validation
- Required vs optional distinction is valuable
- Recommendation: Add in v0.2

## 7. Return Statements

**Current limitation:** No explicit return; last expression is result

**Proposed syntax:**
```zen
RETURN $finalResult
RETURN WITH:
  - $status = "complete"
  - $output = $data
```

**Assessment:**
- Clarifies intent but may not be necessary
- LLMs can interpret "the final result is X"
- Alternative: Convention of ending with result statement
- Recommendation: Defer, not essential

## 8. BREAK and CONTINUE

**Current limitation:** No way to exit loops early

**Proposed syntax:**
```zen
FOR EACH $item IN $items:
  - IF $item.invalid THEN:
    - CONTINUE
  - IF $found = true THEN:
    - BREAK
  - Process normally
```

**Assessment:**
- Familiar from imperative languages
- Useful for efficiency
- Risk: Can make flow harder to follow
- Recommendation: Add BREAK, CONTINUE in v0.2

## 9. Named Blocks for Reference

**Current:** Sections are defined by headings

**Proposed BLOCK syntax:**
```zen
BLOCK validation:
  - Check criteria
  - Report result

Use [[#validation]] multiple times
```

**Assessment:**
- Headings work well for this purpose
- BLOCK syntax adds noise
- Recommendation: Keep using headings, no change needed

## Summary of Recommendations

### For v0.2 (High Priority)
1. PARALLEL FOR EACH - High value for orchestration
2. Extended imports in frontmatter
3. Typed parameters in delegation
4. BREAK and CONTINUE

### For v0.3 (Lower Priority)
5. Inline conditionals (simple form only)
6. Multi-line lambdas (evaluate need)

### Not Recommended
- TRY-CATCH (use explicit checks)
- RETURN statements (not essential)
- Named BLOCK syntax (headings work fine)
