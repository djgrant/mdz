# V5: Semantic Operators for Zen

## Goal/Problem

Explore operators and markers that signal LLM-specific interpretation.

## Results

### Operator 1: The `~~` Semantic Interpretation Marker

**From genesis:**
```markdown
$SolutionPath = $n => `{~~relevant wp path}-candidate-{$n}.md`
```

**What does ~~ mean?**

The `~~` signals: "LLM, interpret this semantically - don't take it literally."

**Examples:**

```markdown
# Literal vs Semantic

path = "solution.md"              # Literal string
path = ~~solution file path       # LLM interprets what path to use

name = "John"                     # Literal name
name = ~~the user's name          # LLM retrieves from context

count = 5                         # Literal number
count = ~~appropriate iteration count  # LLM decides
```

**Scoping variations:**

```markdown
~~word                            # Single word/phrase
~~multiple words here             # Ambiguous end - where does it stop?
{~~bounded phrase}                # Clearly bounded
`~~inline code style`             # Using backticks
[~~link style](context)           # With additional context
```

**Recommendation:** Use `{~~...}` for clear boundaries.

---

### Operator 2: Semantic String Interpolation

**Example:**

```markdown
## Context

$wpPath = {~~current work package path}
$candidate = "{$wpPath}-candidate-{$n}.md"
$summary = {~~summarize the results in one sentence}
```

**Variations explored:**

```markdown
# Prefix style
$~description           # Semantic variable
~"semantic string"      # Semantic literal

# Bracket style
{~~semantic content}    # Explicit boundaries
{{semantic}}            # Double bracket
<~semantic~>            # Angle brackets

# Function style
semantic(description)   # Function call
infer(description)      # Different name
```

**Recommendation:** `{~~...}` is concise and clear. The double tilde suggests "approximately" or "interpret loosely".

---

### Operator 3: Semantic Comparison Operators

**Example:**

```markdown
## Workflow

IF $result ~= "success" THEN continue
# ~= means "semantically equals" - not exact string match

IF $response ~contains "error" THEN handle_error
# ~contains means "semantically contains the concept"

IF $count ~> 5 THEN stop
# ~> means "approximately greater than"
```

**Full operator set:**

```markdown
~=     # Semantic equality
~!=    # Semantic inequality
~<     # Semantically less than
~>     # Semantically greater than
~contains  # Semantically contains
~matches   # Semantically matches pattern
~typeof    # Semantically is type
```

**Insight:** These are for cases where exact comparison would be too brittle. "success" should match "Success", "succeeded", "passed", etc.

---

### Operator 4: Interpretation Mode Markers

**Example:**

```markdown
## Prompt {mode=semantic}

Everything in this section is for LLM interpretation.
"quote marks" don't mean literal strings here.

## Config {mode=literal}

path = "./exact/path/here"
count = 5
All values in this section are literal.

## Hybrid {mode=default}

path = "./literal/path"           # Default: literal
description = {~~semantic here}   # Explicit semantic
```

**Block-level vs inline:**

```markdown
# Block-level mode
~~~semantic
This entire block is interpreted semantically.
The LLM should understand intent, not parse syntax.
~~~

# Inline mode switch
This is literal text with {~~semantic content} embedded.
```

**Recommendation:** Default to literal interpretation; use `{~~...}` for semantic content.

---

### Operator 5: LLM Instruction Markers

**Example:**

```markdown
## Output

result = {generate: summary of findings, max_tokens: 100}
name = {extract: user's name from context}
valid = {evaluate: does this meet criteria?}
```

**Operations:**

```markdown
{generate: description}        # Create new content
{extract: what to extract}     # Pull from context
{evaluate: condition}          # Return boolean
{summarize: content}           # Condense content
{transform: content, how}      # Modify content
{classify: content, options}   # Categorize
```

**Insight:** These are higher-level than ~~. They specify what kind of semantic operation to perform.

---

### Operator 6: Context Visibility Markers

**Example:**

```markdown
## Public Context
<!-- visible to all agents -->
$current = solution.md
$status = in-progress

## Private Context
<!-- visible only to this skill's execution -->
$internal_counter = 0
$debug_mode = true

## LLM-Only Section
{.llm-only}
These instructions are for the LLM executing this skill.
They should not be shown to the user.

## Human-Only Section  
{.human-only}
This documentation is for human readers.
The LLM should ignore it.
```

**Markers:**

```markdown
{.public}     # Visible to all
{.private}    # Internal only
{.llm-only}   # For LLM interpretation
{.human-only} # Documentation for humans
{.compile-out} # Remove during compilation
```

---

### Operator 7: Uncertainty/Confidence Markers

**Example:**

```markdown
## Workflow

1. Get result
2. IF $result.confidence >= 0.8 THEN accept
3. IF $result.confidence ~0.5 THEN review  # Approximately 0.5
4. IF $result.confidence < 0.3 THEN reject

## Expected Output

quality: high ~?        # High confidence
count: 5 ~??           # Medium confidence  
timeline: 2 weeks ~??? # Low confidence
```

**Notation options:**

```markdown
value ~?    # Certain
value ~??   # Uncertain
value ~???  # Very uncertain

value ± 10%   # Tolerance range
value (0.9)   # Explicit confidence score
value [likely] # Qualitative confidence
```

---

### Operator 8: Reference vs Execution

**Example:**

```markdown
## Workflow

# Reference (get the prompt text)
prompt_text = &#build-prompt

# Execute (run the prompt and get result)
result = @#build-prompt

# Lazy execution (prepare but don't run)
deferred = $#build-prompt
```

**Operators:**

```markdown
#name       # Reference to section
@#name      # Execute section as prompt
&#name      # Get section content as string
$#name      # Defer execution
#name{}     # Reference with parameters
@#name{}    # Execute with parameters
```

---

## Proposed Minimal Operator Set

Based on exploration, a minimal viable set:

```markdown
# Essential operators
{~~content}           # Semantic interpretation
$variable             # Variable reference
#section              # Section reference
[[skill]]             # Skill reference

# Comparison operators  
~=                    # Semantic equality
~contains             # Semantic containment

# Optional enhancements
{generate: desc}      # Explicit LLM operation
{.mode}               # Visibility/mode marker
@#section             # Execute section
```

---

## Evaluation

### Key Findings

1. **`{~~...}` is the core insight** - Distinguishing literal from semantic content is the fundamental operation.

2. **Semantic comparison is valuable** - `~=` prevents brittle exact-match conditions.

3. **Less is more** - Too many operators increase cognitive load. Start minimal.

4. **Explicit > Implicit** - Having markers for semantic content is better than inferring it.

5. **Context visibility matters** - Some content is for LLMs, some for humans. Mark it.

### Tensions Identified

- **Power vs Simplicity**: More operators enable more; fewer are easier to learn
- **Explicit vs Natural**: Operators are precise; prose is natural
- **Parsing vs Interpretation**: Some operators can be parsed; others need LLM
- **Escape hatches**: What if you want literal ~~ in content?

### Promising Directions

1. **Core set of 5-6 operators** rather than comprehensive DSL
2. **`{~~...}` as primary semantic marker** - clear, concise, bounded
3. **Semantic comparison `~=`** for flexible matching
4. **Default literal, opt-in semantic** - safer than the reverse

### Open Questions

- How does ~~ interact with variable interpolation? `{~~$variable}`?
- Should semantic content be validated/tested?
- What happens when semantic interpretation fails?
- How do different LLMs interpret the same semantic content?
