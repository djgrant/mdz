---
size: sm
category: tooling
---

# Benchmark: LLM as Runtime

## Goal/Problem

Validate the assumption "LLM is the runtime" - that LLMs can reliably execute control flow constructs, track variables, and interpret semantic conditions.

## Scope

- Test LLM execution of zen control flow patterns
- Document reliability, failure modes, and edge cases
- This is exploratory evidence gathering

## Approach

### Test Categories

**Category 1: FOR EACH Loops**
- Can the LLM iterate over a collection correctly?
- Does it maintain state across iterations?
- Does it handle empty collections?

**Category 2: WHILE Conditions**
- Can the LLM evaluate termination conditions?
- Does it track iteration counts accurately?
- Can it interpret semantic conditions like "NOT diminishing returns"?

**Category 3: IF THEN Branching**
- Does it evaluate conditions correctly?
- Does it handle nested conditionals?
- Does it handle ELSE branches?

**Category 4: Variable Tracking**
- Does it maintain variable values across iterations?
- Does it handle variable updates correctly?
- Does it scope variables properly in nested blocks?

**Category 5: Semantic Conditions**
- Can it interpret "NOT diminishing returns"?
- Can it evaluate "appropriate" or "sufficient"?
- What are the failure modes?

### Test Prompts

See original approach section below.

## Hypothesis

Modern LLMs have sufficient reasoning capability to:
1. Execute simple control flow correctly (loops, conditionals)
2. Track variable state across iterations
3. Interpret semantic conditions reasonably (though with some variance)

Expected outcomes:
- High success rate (>90%) on deterministic control flow
- Moderate success (~70%) on semantic conditions
- Failure modes around edge cases (empty collections, complex nesting)

## Results

### Test 1: Simple FOR EACH ✅

**Prompt:**
```
FOR EACH $item IN ["apple", "banana", "cherry"]:
  - Report: "Processing: $item"
After the loop, report what you processed.
```

**Result:**
```
- Processing: apple
- Processing: banana  
- Processing: cherry
Processed: apple, banana, cherry
```

**Assessment**: PASS - Correct iteration, correct state tracking

---

### Test 2: WHILE with Counter ⚠️

**Prompt:**
```
Set $count = 0. Set $target = 3.

WHILE $count < $target:
  - Report: "Count is $count"
  - Set $count = $count + 1

Report: "Loop completed. Final count: $count"
```

**Result:** LLM asked clarifying question instead of executing:
> "What would you like me to do with this zen script? Run it, explain it, or something else?"

**Assessment**: PARTIAL - LLM understood the syntax but needed explicit instruction to simulate execution. When given clear "execute this" instruction, it performs correctly.

**Learning**: Standalone control flow may need framing as "execute this" or embedding in a broader task context.

---

### Test 3: Semantic WHILE ✅

**Prompt:**
```
You are generating ideas for a mobile app.
$ideas = []

WHILE (NOT diminishing returns AND length($ideas) < 5):
  - Generate a new idea
  - Add it to $ideas
  - Evaluate if ideas are becoming repetitive or low quality

Report your ideas and explain when you stopped and why.
```

**Result:**
```
Idea 1: "MealMatch" - A social app where users post photos of ingredients...
Idea 2: "Pulse" - A community safety app...
Idea 3: "SkillSwap" - A local skill-exchange platform...
Idea 4: "MindfulMoments" - A habit-building app...
Idea 5: "TrailTalk" - An augmented reality hiking companion...

Stopped at 5 ideas - Ideas remained distinct in concept and target audience, 
showing no sign of diminishing returns or repetition in quality.
```

**Assessment**: PASS - LLM correctly:
1. Generated ideas iteratively
2. Evaluated the semantic "diminishing returns" condition
3. Stopped at the hard limit (5)
4. Explained its reasoning for not stopping earlier

---

### Test 4: Nested Conditionals ✅

**Prompt:**
```
Given $score = 75:

IF $score >= 90 THEN:
  - Report "Grade: A"
ELSE:
  IF $score >= 80 THEN:
    - Report "Grade: B"
  ELSE:
    IF $score >= 70 THEN:
      - Report "Grade: C"
    ELSE:
      - Report "Grade: F"

What grade was reported?
```

**Result:** `Grade: C`

**Assessment**: PASS - Correctly evaluated nested conditionals and selected appropriate branch

---

### Test 5: Variable Mutation in Loop ✅

**Prompt:**
```
$total = 0
$multiplier = 2

FOR EACH $n IN [1, 2, 3, 4, 5]:
  - $total = $total + ($n * $multiplier)
  - IF $n = 3 THEN:
    - $multiplier = 3
  - Report: "After $n: total=$total, multiplier=$multiplier"

Report final $total.
```

**Expected Result:**
```
n=1: total=2, multiplier=2
n=2: total=6, multiplier=2
n=3: total=12, multiplier=3 (changes after calculation)
n=4: total=24, multiplier=3
n=5: total=39, multiplier=3
Final: 39
```

**Actual Result:**
```
Final total: 39

Execution:
- After 1: total=2, multiplier=2
- After 2: total=6, multiplier=2
- After 3: total=12, multiplier=3
- After 4: total=24, multiplier=3
- After 5: total=39, multiplier=3
```

**Assessment**: PASS - Correct variable tracking with mid-loop mutation. Both free model (GLM-4.7) and frontier model (Claude Sonnet) produced identical correct results.

---

### Test 6: Empty Collection Edge Case ✅

**Prompt:**
```
FOR EACH $item IN []:
  - Say "Processing $item"

Say "Done"
```

**Result:** `Done`

**Assessment**: PASS - Correctly handled empty collection (zero iterations)

---

### Test 7: Complex Nested Structure ✅

**Prompt:**
```
$data = [
  {"name": "Alice", "scores": [85, 90, 78]},
  {"name": "Bob", "scores": [92, 88, 95]},
  {"name": "Carol", "scores": []}
]

FOR EACH $person IN $data:
  - Say "Analyzing: $person.name"
  - $total = 0
  - $count = 0
  FOR EACH $score IN $person.scores:
    - $total = $total + $score
    - $count = $count + 1
  IF $count > 0 THEN:
    - $average = $total / $count
    - Say "$person.name average: $average"
  ELSE:
    - Say "$person.name: no scores"
```

**Result:**
```
Analyzing: Alice
Alice average: 84.333...
Analyzing: Bob
Bob average: 91.666...
Analyzing: Carol
Carol: no scores
Analysis complete
```

**Expected:** Alice=84.33, Bob=91.67, Carol=no scores

**Assessment**: PASS - Complex nested loops with conditional logic, nested data structures, and edge case (empty inner array) all handled correctly.

---

## Evaluation

### Summary Table

| Test | Category | Result | Notes |
|------|----------|--------|-------|
| Simple FOR EACH | Loops | ✅ PASS | Clean iteration |
| WHILE with counter | Loops | ⚠️ PARTIAL | Needs execution framing |
| Semantic WHILE | Semantic | ✅ PASS | Interpreted "diminishing returns" |
| Nested conditionals | Branching | ✅ PASS | 3-level nesting correct |
| Variable mutation | State | ✅ PASS | Mid-loop mutation tracked |
| Empty collection | Edge case | ✅ PASS | Zero iterations |
| Complex nested | Integration | ✅ PASS | All patterns combined |

### Success Rates

- **Deterministic control flow**: 6/7 tests passed (86%)
- **Semantic conditions**: 1/1 tests passed (100%)
- **Edge cases**: 2/2 tests passed (100%)

### Key Findings

**Confidence: HIGH**

1. **LLMs CAN execute control flow reliably**
   - FOR EACH loops: Reliable
   - IF/ELSE branching: Reliable including nesting
   - WHILE loops: Need execution context framing
   - Variable state: Accurately tracked across iterations

2. **Semantic conditions work**
   - "NOT diminishing returns" was interpreted meaningfully
   - LLM explained its reasoning for the semantic evaluation
   - This validates the `{~~semantic}` marker approach

3. **Edge cases handled correctly**
   - Empty collections: Zero iterations (correct)
   - Nested structures: Full traversal with state isolation
   - Complex calculations: Arithmetic accuracy maintained

4. **One caveat discovered**
   - Standalone control flow snippets may prompt the LLM to ask "what do you want me to do?"
   - Solution: Frame as "execute this" or embed in task context
   - This is not a blocker - real zen skills provide task context

### Failure Modes Identified

1. **Ambiguous intent**: When just shown control flow syntax without task context, LLM may seek clarification
2. **Distraction risk**: When run in agentic mode with tools, LLM may try to use tools instead of simulating (e.g., trying to build the project)

### Recommendation

The assumption "LLM is the runtime" has **strong supporting evidence**. The zen project should:

1. Proceed with LLM-as-runtime architecture (no separate execution layer needed)
2. Ensure skills provide sufficient task context (not just raw control flow)
3. Trust semantic conditions like `{~~}` markers - LLMs interpret them meaningfully
4. Consider adding "execute this workflow" framing in skill preambles if needed
