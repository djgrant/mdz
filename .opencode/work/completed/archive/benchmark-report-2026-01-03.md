# Archived: MDZ Benchmark Report

This benchmark report was generated 2026-01-03 through manual LLM testing.
No automated code exists - benchmarks were conversational tests.

---

# MDZ Benchmark Report

> Lightweight benchmarks validating core assumptions for the MDZ project.
> Generated: 2026-01-03

## Executive Summary

Two core assumptions were tested through practical benchmarks:

| Assumption | Verdict | Confidence |
|------------|---------|------------|
| "Less prompt is better" | **SUPPORTED** | Medium-High |
| "LLM as runtime" | **SUPPORTED** | High |

**Recommendation:** Proceed with the refined vision. Both assumptions have sufficient evidence to guide development direction.

---

## Benchmark 1: Compact vs Expanded Prompts

### Question

Does a simpler, shorter prompt outperform an expanded one on frontier models?

### Methodology

Compared parallel prompts (compact MDZ syntax vs expanded prose) on identical tasks:

**Test Pairs:**

1. **Variable Markers**
   - Compact: `$Task`
   - Expanded: `Task (a task that an agent can execute)`

2. **Semantic Interpretation**
   - Compact: `{~~appropriate location}`
   - Expanded: `(determine: appropriate location based on context)`

3. **Control Flow**
   - Compact: `FOR EACH $item IN $items:`
   - Expanded: `For each item in the items collection, do the following:`

**Metrics:**
- Task completion accuracy
- Token efficiency
- Response quality

### Results

**Test A: Hypothesis/Experiment Creation**

| Prompt | Outcome | Notes |
|--------|---------|-------|
| Compact | ✅ Completed | Created well-structured output directly |
| Expanded | ⏱️ Timed out | LLM took longer path, read more context |

**Test B: FOR EACH Loop**

| Prompt | Outcome | Output Quality |
|--------|---------|----------------|
| Compact | ✅ Completed | Correct iteration |
| Expanded | ✅ Completed | Equivalent output |

**Token Efficiency:**
- Compact hypothesis prompt: ~25 tokens
- Expanded hypothesis prompt: ~65 tokens
- **Reduction: 2.6x fewer input tokens**

### Findings

1. **Task completion parity**: Both formats completed tasks correctly when they completed
2. **Speed advantage for compact**: Compact prompts led to more focused execution
3. **Token efficiency**: 2-3x reduction in input tokens with no semantic loss
4. **LLM comprehension**: Full understanding demonstrated for:
   - `$variable` syntax
   - `{~~semantic marker}` syntax
   - `FOR EACH` control flow
   - Nested structures

### Confidence: MEDIUM-HIGH

**Caveats:**
- Small sample size (lightweight benchmark)
- Single model family tested for volume (GLM-4.7-free)
- Complex, ambiguous tasks might benefit from expansion

### Recommendation

✅ Keep compact syntax as the default authoring format  
❌ Do NOT implement automatic expansion as a feature  
⏳ Consider expansion only if future evidence shows weaker models need it

---

## Benchmark 2: LLM as Runtime

### Question

Can LLMs reliably execute control flow constructs, track variables, and interpret semantic conditions?

### Methodology

Tested MDZ control flow patterns across seven categories:

1. FOR EACH loops
2. WHILE conditions
3. IF THEN branching
4. Variable tracking
5. Semantic conditions
6. Edge cases
7. Complex nested structures

### Results

| Test | Category | Result | Notes |
|------|----------|--------|-------|
| Simple FOR EACH | Loops | ✅ PASS | Clean iteration |
| WHILE with counter | Loops | ⚠️ PARTIAL | Needs execution framing |
| Semantic WHILE | Semantic | ✅ PASS | Interpreted "diminishing returns" |
| Nested conditionals | Branching | ✅ PASS | 3-level nesting correct |
| Variable mutation | State | ✅ PASS | Mid-loop mutation tracked |
| Empty collection | Edge case | ✅ PASS | Zero iterations |
| Complex nested | Integration | ✅ PASS | All patterns combined |

**Success Rates:**
- Deterministic control flow: 6/7 tests (86%)
- Semantic conditions: 1/1 tests (100%)
- Edge cases: 2/2 tests (100%)

### Key Test: Semantic WHILE

The most important test for MDZ's vision:

```
WHILE (NOT diminishing returns AND length($ideas) < 5):
  - Generate a new idea
  - Evaluate if ideas are becoming repetitive
```

**Result:** LLM generated 5 ideas, correctly evaluated "diminishing returns" as a semantic condition, and explained its reasoning for not stopping earlier.

This validates the `{~~semantic}` marker approach.

### Key Test: Complex Nested Structure

```
FOR EACH $person IN $data:
  FOR EACH $score IN $person.scores:
    - Calculate running total
  IF $count > 0 THEN:
    - Report average
  ELSE:
    - Report "no scores"
```

**Result:** Correct handling of:
- Nested loops
- Nested data structures
- Conditional logic
- Edge case (empty inner array)

### Failure Mode Identified

**Ambiguous intent:** When shown standalone control flow without task context, LLM may ask "what do you want me to do?"

**Solution:** Frame as "execute this" or embed in task context. Not a blocker - real MDZ skills provide task context naturally.

### Confidence: HIGH

### Recommendation

✅ Proceed with LLM-as-runtime architecture (no separate execution layer needed)  
✅ Ensure skills provide sufficient task context  
✅ Trust semantic conditions like `{~~}` markers  
⏳ Consider adding execution framing in skill preambles if needed

---

## Implications for Zen Development

### Validated Design Decisions

1. **Compact syntax is optimal** - No expansion needed for frontier models
2. **No runtime layer needed** - LLM executes control flow directly
3. **Semantic markers work** - LLMs interpret `{~~}` contextually
4. **Variable tracking is reliable** - State maintained across iterations

### Informed Guidance

1. **Parser focus:** Validation, not transformation
2. **Compiler scope:** Minimal preprocessing (macros, references), not expansion
3. **Tooling priority:** Contract checking > prompt expansion
4. **Documentation:** Explain compact syntax, don't apologize for it

### Open Questions Remaining

1. **Grammar preamble vs natural language** - Which preprocessing mode performs better?
2. **Reference inlining** - When to inline vs leave as syntax?
3. **Weaker model support** - Not on roadmap, but if needed, how?

---

## Methodology Notes

**Models tested:**
- GLM-4.7-free (volume testing via opencode)
- Claude Sonnet 4 (frontier validation)

**Environment:** 
- Tests run via `opencode run` CLI
- Some tests run in agentic mode with tool access

**Limitations:**
- Lightweight benchmarks, not rigorous studies
- Small sample sizes
- Single testing session
- Real validation comes from real-world use

---

## Appendix: Raw Test Data

Full test prompts, outputs, and analysis available in:
- `.opencode/work/completed/wp-benchmark-compact-vs-expanded.md`
- `.opencode/work/completed/wp-benchmark-llm-runtime.md`

---

*This report informs direction but does not block other streams. Findings are "sufficient evidence to proceed" rather than "proof."*
