# V8: Failure Modes and Edge Cases

## Goal/Problem

Deliberately explore how different approaches might fail.

## Results

### Failure Mode 1: Ambiguity

#### Syntactic Ambiguity

```markdown
# Problem: Where does the semantic content end?

path = ~~the path to the solution file  # Is "file" part of ~~?
path = ~~the path to the solution file.md  # Is ".md" literal or semantic?

# Problem: Nested delimiters
message = {{IF {{nested}}}} content {{END}}  # Parser confusion

# Problem: Markdown conflicts  
Use $5 for the transaction  # Is this a variable or currency?
See [link][ref] for details  # Is [ref] a wiki link?
```

**Which approaches are vulnerable:**
- Natural language flow (V3-5): Highly ambiguous
- Wiki links (V4-2): May conflict with markdown references
- Template style (V3-1): Nested delimiters are problematic

**Mitigation:**
- Clear boundaries: `{~~content}` not `~~content`
- Escape sequences: `\$5` for literal dollar sign
- Distinct delimiters: `[[wiki]]` not `[wiki]`

---

#### Semantic Ambiguity

```markdown
# Problem: What does "relevant" mean?
path = {~~relevant file path}  # Relevant to what context?

# Problem: Underspecified conditions
IF success THEN continue  # What counts as success?

# Problem: Temporal ambiguity
Use the current solution  # Current when? At parse time? Runtime?
```

**Which approaches are vulnerable:**
- Semantic operators (V5): Rely on LLM interpretation
- Natural language (V3-5): Vague by nature
- Implicit references (V4-4): Context-dependent resolution

**Mitigation:**
- Explicit context: `{~~file path from work package directory}`
- Type constraints: `success: boolean` not just "success"
- Temporal markers: `$current` as explicit variable, not prose

---

### Failure Mode 2: Scale Issues

#### Large Skills (1000+ lines)

```markdown
# Problem: Context window overflow
A skill with 1000 lines of detailed instructions exceeds LLM context.

# Problem: Navigation
Jumping between sections in a huge file is disorienting.

# Problem: Loading dependencies
If skill A includes skill B includes skill C... chain explodes.
```

**Which approaches are vulnerable:**
- Inlining/flattening (V6-7): Compiled output can be huge
- Deep composition (V6-1 inheritance): Chains of extensions
- Wiki links (V4-2): Many transitive references

**Mitigation:**
- Chunking strategies: Only load relevant sections
- Lazy resolution: Don't expand references until needed
- Depth limits: Max inheritance/inclusion depth
- Compilation warnings: "This skill compiles to 50k tokens"

---

#### Complex Nesting (10+ levels)

```markdown
# Problem: Tracking context

{{FOR EACH outer}}
  {{FOR EACH middle}}
    {{IF condition1}}
      {{FOR EACH inner}}
        {{IF condition2}}
          {{WHILE running}}
            # What scope are we in? What variables available?
          {{END}}
        {{END}}
      {{END}}
    {{END}}
  {{END}}
{{END}}
```

**Which approaches are vulnerable:**
- Template style (V3-1): Deeply nested {{}} blocks
- Directive style (V3-3): @-soup with deep nesting
- Indentation-based (V3-6): 10 levels of indentation

**Mitigation:**
- Extract to named sections: `#inner-loop` as reference
- Limit nesting depth: Error at compile time if too deep
- Flatten control flow: Step-by-step instead of nested

---

### Failure Mode 3: Edge Cases

#### Empty Sections

```markdown
## Types

(nothing here)

## Inputs

(nothing here)

## Workflow

1. Do the thing
```

**What happens?**
- Is empty Types section valid? (No types needed)
- Should empty sections be warnings or errors?
- How does inheritance handle empty parent sections?

**Mitigation:**
- Explicit "none" marker: `## Types: none`
- Section-specific rules: Types can be empty, Workflow cannot
- Linting: Warn on empty sections that are usually populated

---

#### Circular References

```markdown
# skill-a.md
Uses: [[skill-b]]

# skill-b.md  
Uses: [[skill-a]]

# Problem: Which loads first? Infinite loop?
```

**Detection strategies:**
- Build dependency graph during compilation
- Detect cycles and report error
- Topological sort for loading order

**Resolution strategies:**
- Disallow cycles entirely
- Allow with lazy resolution
- Break cycles at specific points (decorator pattern)

---

#### Missing References

```markdown
## Workflow

1. Delegate with [[nonexistent-skill]]
2. Use $undefined_variable
3. Call #missing-section
```

**What happens?**
- Compile-time error vs runtime error?
- Graceful degradation vs hard failure?
- Suggestions for typos? ("Did you mean [[existent-skill]]?")

**Mitigation:**
- Compile-time reference checking
- Fuzzy matching for suggestions
- Required vs optional references (`[[skill]]` vs `[[?skill]]`)

---

#### Type Mismatches

```markdown
## Types
$Number = integer

## Inputs
count: $Number

## Workflow

count = "five"  # String, not integer!
result = count + 1  # Runtime error?
```

**Type checking strategies:**
- Compile-time checking (strict)
- Runtime validation (gradual)
- LLM-assisted type coercion (semantic)

---

### Failure Mode 4: LLM Limitations

#### Context Window Limits

```markdown
# Problem: Compiled skill + history + user input > context limit

Full skill: 20k tokens
Conversation history: 50k tokens
User input: 10k tokens
Total: 80k tokens (exceeds 32k or even 128k models)
```

**Mitigation:**
- Skill chunking: Only include relevant sections
- History summarization: Compress older context
- Token budgeting: Reserve tokens for each component
- Compile-time estimation: Warn if skill is too large

---

#### Instruction Following Failures

```markdown
## Workflow

FOR EACH task IN tasks:
  - Complete the task
  - DO NOT skip any tasks

# LLM might: skip tasks, reorder tasks, hallucinate tasks
```

**What can go wrong:**
- LLM ignores control flow structure
- LLM generates output in wrong format
- LLM hallucinates references that don't exist
- LLM misinterprets semantic content

**Mitigation:**
- Structured output enforcement (JSON mode)
- Validation of outputs against expected types
- Retry with clarification on failure
- Human-in-the-loop for critical decisions

---

#### Semantic Interpretation Variance

```markdown
path = {~~the most appropriate file path for this solution}

# GPT-4 might return: ./solutions/attempt-1.md
# Claude might return: solution_v1.md
# Gemini might return: current/solution.txt
```

**Problem:** Same semantic instruction, different LLM outputs.

**Mitigation:**
- Add constraints: `{~~file path matching pattern *.md in ./solutions/}`
- Validation: Check output matches expected pattern
- Model-specific prompts: Adjust instructions per LLM
- Deterministic fallback: `{~~path} or default ./solution.md`

---

### Failure Mode 5: Human Factors

#### Cognitive Load Threshold

```markdown
# When does syntax become overwhelming?

{{FOR EACH ($task: $Task, $strategy: $Strategy) IN $transforms<($Task, $Strategy)[]>}}
  @call #build-prompt<$TaskContext> { 
    task: $task, 
    context: {~~current context from [[work-packages#$wpPath]]} 
  } -> $result: $TaskResult
  {{IF {$result ~= "success"} AND {$strategy == "accumulate"}}}
    ...
```

**Complexity factors:**
- Number of distinct syntactic elements
- Nesting depth
- Type annotations verbosity  
- Reference syntax complexity

**Thresholds (subjective):**
- < 5 distinct syntax elements: Learnable
- 5-10 elements: Manageable with documentation
- > 10 elements: Overwhelming

---

#### Learning Curve

```markdown
Day 1: Write a simple skill (no types, no composition)
Day 7: Add types and references
Day 30: Complex composition patterns
Day 90: Master the ecosystem
```

**Progressive disclosure:**
- Level 1: Pure markdown + frontmatter (works immediately)
- Level 2: Add variables and references
- Level 3: Add control flow
- Level 4: Add types and composition
- Level 5: Advanced patterns (generics, decorators)

---

#### Error Messages

```markdown
# Bad error message:
Error: Parse error at line 47

# Good error message:
Error: Unclosed {{FOR EACH}} block at line 35
  Started: {{FOR EACH task IN tasks}}
  Expected: {{END}} before line 47
  Hint: Check that all control flow blocks are properly closed
```

**Error message requirements:**
- Location (line, column)
- Context (what was being parsed)
- Suggestion (how to fix)
- Example (correct syntax)

---

### Failure Mode 6: Tooling Gaps

#### What Can't Be Statically Analyzed

```markdown
path = {~~appropriate file path}  # Value determined at runtime
result = delegate #prompt         # Output depends on LLM
valid = $response ~= "success"    # Semantic comparison

# Static analysis can't determine:
# - Runtime values of semantic content
# - Actual LLM outputs
# - Semantic comparison results
```

**Implications:**
- Type checking is limited for semantic values
- Control flow analysis is incomplete
- Dead code detection may have false positives

---

#### What's Impossible to Validate

```markdown
# "Did the LLM correctly interpret this instruction?"
# "Will this workflow complete in reasonable time?"
# "Is this prompt going to produce good results?"

# These require:
# - Running the LLM
# - Benchmarking across inputs
# - Human evaluation
```

**What tooling CAN do:**
- Syntax validation
- Reference resolution
- Type checking (partial)
- Dependency analysis
- Complexity metrics

**What tooling CANNOT do:**
- Guarantee LLM behavior
- Predict semantic interpretation
- Ensure output quality

---

## Evaluation

### Key Findings

1. **Ambiguity is the primary threat** - Both syntactic and semantic ambiguity will cause problems. Design for clarity.

2. **Scale breaks naive approaches** - Large skills and deep nesting require chunking and limits.

3. **LLM variance is fundamental** - Same prompt, different LLMs, different results. Design for tolerance.

4. **Progressive disclosure is essential** - Can't front-load all complexity. Start simple.

5. **Error messages matter enormously** - Poor errors will kill adoption.

### Most Vulnerable Approaches

- **Natural language control flow**: Ambiguous, unparseable
- **Deep inheritance**: Scale and complexity issues
- **Implicit resolution**: Hard to debug, non-deterministic
- **Heavy type annotations**: Cognitive overload

### Most Robust Approaches

- **Explicit delimiters with boundaries**: `{~~content}` not `~~content`
- **Flat composition with delegation**: Avoids depth issues
- **Wiki links with explicit resolution**: Clear reference semantics
- **Gradual typing**: Start simple, add types when needed

### Mitigation Priority List

1. **Bounded syntax** - All constructs have clear start and end
2. **Compile-time checking** - Catch what we can before runtime
3. **Depth limits** - Hard cap on nesting and inheritance
4. **Good error messages** - Investment in tooling
5. **Progressive disclosure** - Layered complexity
6. **Semantic validation** - Runtime checks for LLM outputs
