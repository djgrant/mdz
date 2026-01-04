---
size: md
category: language
---

# V3: Control Flow Syntax for Zen

## Goal/Problem

Explore different approaches to expressing control flow in a markdown-based agent language.

## Results

### Approach 1: Template Style (`{{IF}}...{{END}}`)

**Example - Map-Reduce Workflow:**

```markdown
## Workflow

1. Create master work package
2. Delegate: summarise status quo solution, write to $current

3. {{FOR EACH ($task, $strategy) IN $transforms}}
   - Delegate to sub-agent with iteration manager prompt
   {{END}}

4. Collect findings from each iteration manager
5. Update master work package

### Iteration Manager Workflow

{{WHILE (NOT diminishing_returns AND $iterations < 5)}}
  - Delegate to sub-agent with #build-prompt
  {{IF ($strategy == "accumulate")}}
    - Delegate to sub-agent with #validate-prompt
    - {{IF (pass)}} update work package {{ELSE}} continue {{END}}
    - {{IF (pass)}} $current = $next; $next = $SolutionPath($iteration + 1) {{END}}
  {{END}}
{{END}}

{{IF ($strategy == "accumulate")}}
  - Return findings
{{ELSE}}
  - Delegate to sub-agent #validate-all-prompt
  - Return findings
{{END}}
```

**Strengths:**
- Familiar from Mustache/Handlebars/Liquid
- Clear block boundaries with {{END}}
- Easy to parse - distinct delimiters
- Works inline with prose

**Weaknesses:**
- Verbose - lots of {{}} noise
- Nested blocks become hard to track
- Mixing control flow with natural language is jarring
- Hard to express complex conditions

**Tooling:** Easy to tokenize; syntax highlighting straightforward
**Parseability: 9** | **Readability: 5** | **Expressiveness: 7**

---

### Approach 2: Markdown-Native (Structure as Control)

**Example - Map-Reduce Workflow:**

```markdown
## Workflow

### Phase 1: Setup
Create master work package

### Phase 2: Map
> Repeat for each task in transforms

Delegate to sub-agent with iteration manager prompt

#### When strategy is "accumulate"

##### Iteration Loop
> Repeat while not diminishing returns and iterations < 5

1. Delegate with build prompt
2. Validate result
3. If valid: update work package and advance $current → $next
4. If invalid: continue iteration

#### When strategy is "independent"

##### Parallel Execution
> Run all in parallel

Delegate each variant to sub-agents

### Phase 3: Reduce
Collect findings and update master work package
```

**Strengths:**
- Pure markdown - no new syntax
- Very readable as document
- Hierarchy via headings is natural
- Blockquotes as "meta-instructions"

**Weaknesses:**
- Imprecise - "Repeat for each" is vague
- Cannot express complex boolean conditions
- Heading-based nesting is awkward for deep control flow
- LLM must infer structure from prose

**Tooling:** Standard markdown parser; semantics via convention only
**Parseability: 3** | **Readability: 9** | **Expressiveness: 4**

---

### Approach 3: Directive-Based (`@if`, `@foreach`)

**Example - Map-Reduce Workflow:**

```markdown
## Workflow

1. Create master work package
2. Delegate: summarise status quo solution, write to $current

@foreach ($task, $strategy) in $transforms
3. Delegate to sub-agent with iteration manager prompt
@end

4. Collect findings
5. Update master work package

### Iteration Manager

@while not diminishing_returns and $iterations < 5
  - Delegate with #build-prompt
  
  @if $strategy == "accumulate"
    - Validate with #validate-prompt
    @if pass
      - Update work package
      - $current = $next
      - $next = $SolutionPath($iteration + 1)
    @end
  @end
@end

@match $strategy
  @case "accumulate"
    Return findings
  @case "independent"  
    - Delegate #validate-all-prompt
    - Return findings
@end
```

**Strengths:**
- Familiar from Blade/Razor/Svelte
- @ clearly distinguishes directives from content
- Supports @match for pattern matching
- Indentation shows nesting

**Weaknesses:**
- @-soup when control flow is complex
- Two languages in one file
- Harder to read as prose
- Need to escape literal @ characters

**Tooling:** Custom directive parser; good IDE support possible
**Parseability: 8** | **Readability: 6** | **Expressiveness: 8**

---

### Approach 4: Code Fence DSL

**Example - Map-Reduce Workflow:**

```markdown
## Workflow

The map-reduce workflow proceeds in phases:

~~~zen:flow
phase setup:
  create master_work_package
  delegate summarize_status_quo -> $current

phase map:
  for (task, strategy) in transforms:
    delegate iteration_manager(task, strategy)

phase reduce:
  collect findings
  update master_work_package
~~~

### Iteration Manager

~~~zen:flow
while not diminishing_returns and iterations < 5:
  delegate #build-prompt
  
  if strategy == "accumulate":
    result = delegate #validate-prompt
    if result.pass:
      update work_package
      current = next
      next = solution_path(iteration + 1)

match strategy:
  case "accumulate":
    return findings
  case "independent":
    delegate #validate-all-prompt
    return findings
~~~
```

**Strengths:**
- Complete separation of prose and logic
- Can use a proper language syntax within fences
- Easy to parse - just extract fence content
- Can have multiple flow blocks

**Weaknesses:**
- Loses the "markdown as code" feel
- Context switching between prose and code
- Code block syntax still needs design
- Harder to weave explanation with logic

**Tooling:** Parse fences independently; custom language in blocks
**Parseability: 9** | **Readability: 7** | **Expressiveness: 9**

---

### Approach 5: Natural Language Flow

**Example - Map-Reduce Workflow:**

```markdown
## Workflow

First, create a master work package.

Then, summarize the status quo solution and write it to the current path.

For each task and strategy pair in the transforms:
  Delegate to a sub-agent using the iteration manager prompt.

Finally, collect findings from each iteration manager and update the master work package.

### Iteration Manager

While there are no diminishing returns and we have done fewer than 5 iterations:
  Delegate to a sub-agent with the build prompt.
  
  If the strategy is "accumulate":
    Delegate to a sub-agent with the validate prompt.
    If validation passes:
      Update the work package.
      Set current to next.
      Set next to the solution path for the next iteration.

If the strategy is "accumulate":
  Return the findings.
Otherwise:
  Delegate the validate-all prompt to a sub-agent.
  Return the findings.
```

**Strengths:**
- Completely natural language
- No syntax to learn
- LLM-friendly format
- Reads like instructions to a human

**Weaknesses:**
- Ambiguous parsing
- "For each" vs "For each of the" vs "Iterate over"
- Termination conditions are vague
- Hard to validate programmatically

**Tooling:** Requires NLP parsing or LLM interpretation
**Parseability: 2** | **Readability: 10** | **Expressiveness: 6**

---

### Approach 6: Indentation-Based

**Example - Map-Reduce Workflow:**

```markdown
## Workflow

setup:
  create master work package
  delegate summarize -> $current

map:
  for (task, strategy) in transforms:
    delegate iteration_manager(task, strategy)

reduce:
  collect findings
  update master work package

### Iteration Manager

loop while not diminishing_returns and iterations < 5:
  delegate #build-prompt
  
  if strategy == "accumulate":
    result = delegate #validate-prompt
    if result.pass:
      update work_package
      $current = $next
      $next = solution_path(iteration + 1)

if strategy == "accumulate":
  return findings
else:
  delegate #validate-all-prompt
  return findings
```

**Strengths:**
- Minimal syntax - Python-like
- Nesting is visually clear
- No end markers needed
- Clean and compact

**Weaknesses:**
- Sensitive to whitespace (in markdown context!)
- Tabs vs spaces issues
- Markdown already uses indentation for code blocks
- Harder to copy-paste correctly

**Tooling:** Whitespace-sensitive parsing; potential conflicts with markdown
**Parseability: 7** | **Readability: 8** | **Expressiveness: 8**

---

### Approach 7: CAPS Keywords in Prose

**Example - Map-Reduce Workflow:**

```markdown
## Workflow

1. Create master work package
2. Delegate to summarize status quo, write to $current

3. FOR EACH ($task, $strategy) IN $transforms:
   - Delegate to sub-agent with iteration manager prompt

4. Collect findings from iteration managers
5. Update master work package

### Iteration Manager

WHILE NOT diminishing_returns AND $iterations < 5:
  - Delegate with #build-prompt
  
  IF $strategy = "accumulate" THEN:
    - Delegate #validate-prompt
    - IF pass THEN update work package
    - IF pass THEN $current ← $next; $next ← $SolutionPath($iteration + 1)

IF $strategy = "accumulate" THEN:
  Return findings
ELSE:
  - Delegate #validate-all-prompt
  - Return findings
```

**Strengths:**
- CAPS keywords are visually distinct
- Still reads as prose
- Familiar from SQL, BASIC
- Can use → and ← for assignments

**Weaknesses:**
- ALL CAPS can feel shouty
- Mixing CAPS with prose is jarring
- Edge cases with acronyms (API, URL)
- Limited control structures without getting verbose

**Tooling:** Regex-based keyword detection; works with standard parsers
**Parseability: 7** | **Readability: 7** | **Expressiveness: 7**

---

## Comparison Matrix

| Approach | Parseability | Readability | Expressiveness | Best For |
|----------|--------------|-------------|----------------|----------|
| 1. Template {{}} | 9 | 5 | 7 | Embedding in prose |
| 2. Markdown-Native | 3 | 9 | 4 | Documentation-first |
| 3. Directive @-based | 8 | 6 | 8 | Template workflows |
| 4. Code Fence DSL | 9 | 7 | 9 | Complex logic |
| 5. Natural Language | 2 | 10 | 6 | LLM interpretation |
| 6. Indentation-Based | 7 | 8 | 8 | Clean compact syntax |
| 7. CAPS Keywords | 7 | 7 | 7 | Balanced approach |

---

## Special Considerations

### Termination Conditions

```markdown
# Template style
{{WHILE (NOT done AND $i < 5)}}

# Directive style  
@while not done and $i < 5

# Natural language
While we haven't finished and have done fewer than 5 iterations:

# Explicit termination
@loop max=5 until=done
```

**Insight:** Explicit max iterations prevents infinite loops. Consider requiring termination bounds.

### Error Handling

```markdown
# Try-catch style
@try
  delegate risky_operation
@catch error
  log error
  return failure
@end

# Result type style
result = delegate operation
@match result
  @case success(value): continue with value
  @case failure(err): handle err
@end

# Natural language
Delegate the operation. If it fails, log the error and return failure.
```

**Insight:** Agent operations can fail. Need explicit error handling syntax.

### Parallel Execution

```markdown
# Parallel directive
@parallel
  delegate task_a
  delegate task_b
  delegate task_c
@end

# Fork-join
@fork
  $a = delegate task_a
  $b = delegate task_b
@join
  combine($a, $b)

# Natural language
Run the following tasks in parallel:
- Task A
- Task B
- Task C
Then combine the results.
```

**Insight:** Parallel execution is critical for map-reduce. Needs explicit syntax.

---

## Evaluation

### Key Findings

1. **Hybrid is likely necessary** - Pure markdown (Approach 2) is too imprecise for complex control flow; pure DSL (Approach 4) loses the markdown feel.

2. **CAPS keywords + template style** - A promising hybrid: use CAPS keywords (FOR EACH, WHILE, IF THEN) with minimal delimiters for blocks.

3. **Termination is critical** - Every loop needs explicit termination conditions to prevent runaway agents.

4. **Error handling is underexplored** - The genesis examples don't show error paths. This needs design.

5. **Parallel is first-class** - Map-reduce requires parallel execution; this shouldn't be an afterthought.

### Tensions Identified

- **Parseability vs Readability**: More parseable = less natural prose
- **Explicitness vs Brevity**: Explicit control flow is verbose
- **Markdown compatibility vs Power**: Staying in markdown limits expressiveness
- **LLM interpretation vs Determinism**: Natural language is flexible but unpredictable

### Promising Directions

1. **CAPS keywords + indentation**: FOR EACH, WHILE, IF THEN as keywords, indentation for blocks
2. **Code fences for complex logic**: When control flow gets complex, use a `~~~zen:flow` block
3. **Natural language with hints**: "For each task (iterate over transforms):" - prose with parenthetical hints

### Open Questions

- What's the minimum set of control structures needed?
- How do we handle async/await patterns for delegations?
- Should branches be exhaustive or allow fallthrough?
- How do loops access iteration index/count?
