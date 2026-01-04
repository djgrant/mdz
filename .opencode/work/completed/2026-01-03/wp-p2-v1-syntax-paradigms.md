---
size: md
category: language
---

# V1: Syntax Paradigms for Zen

## Goal/Problem

Explore different syntax paradigms for a markdown extension language. Each paradigm should be analyzed for developer experience, cognitive load, feasibility, and tooling potential.

## Context

Read the genesis document at `.opencode/work/in-progress/wp-2026-01-03-genesis.md` to understand:
- What patterns need to be expressed
- Examples from the-scientist project
- The vision for zen

## Scope

Explore at least 5 distinct syntax paradigms.

## Approach

For each paradigm:
1. Write example implementations of the patterns from genesis
2. Assess what it expresses elegantly and struggles with
3. Consider tooling implications
4. Rate: DX (1-10), Cognitive Load (1-10 low=better), Feasibility (1-10)

## Hypothesis

Different paradigms will excel at different things. No single paradigm will be universally best.

## Results

### Paradigm 1: YAML Frontmatter + Markdown Body (Current Pattern)

**Example:**
```markdown
---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution...
types:
  Task: any task that an agent can execute
  Strategy: accumulate | independent
inputs:
  transforms: [Task, Strategy]
  validator: Task
  return: Task
---

## Map-Reduce Workflow

1. Create master work package
2. FOR EACH $task IN $transforms:
   - Delegate to sub-agent
3. Collect findings
```

**Strengths:**
- Familiar to anyone who's used Jekyll, Hugo, or MDX
- Clear separation: structured metadata above, prose below
- YAML is well-tooled (schemas, validation, editors)
- Graceful degradation - renders as regular markdown

**Weaknesses:**
- Control flow in prose is unparseable
- Types in YAML feel awkward for complex structures
- No way to reference sections programmatically
- Frontmatter becomes bloated for complex skills

**Tooling:** Easy to parse frontmatter; body remains freeform
**DX: 7** | **Cognitive Load: 4** | **Feasibility: 9**

---

### Paradigm 2: Fenced Code Blocks with Custom Languages

**Example:**
```markdown
# orchestrate-map-reduce

When you need multiple operations to get one solution...

~~~zen:types
Task = any task that an agent can execute
Strategy = "accumulate" | "independent"
~~~

~~~zen:inputs
transforms: (Task, Strategy)[]
validator: Task  
return: Task
~~~

~~~zen:workflow
1. Create master work package
2. for task in $transforms:
     delegate(sub-agent, task)
3. collect findings
~~~

## Additional Context

The workflow enables iterative refinement...
```

**Strengths:**
- Each concern in its own block with explicit language
- Syntax highlighting possible per block type
- Can have multiple blocks of same type
- Blocks can be parsed independently

**Weaknesses:**
- Verbose - many fence declarations
- Context switching between block types
- Hard to reference content across blocks
- Prose between blocks is orphaned

**Tooling:** Need custom language modes for each block type
**DX: 6** | **Cognitive Load: 6** | **Feasibility: 8**

---

### Paradigm 3: Inline Annotations/Attributes

**Example:**
```markdown
# orchestrate-map-reduce {#skill .orchestrator}

When you need multiple operations...

## Types {.zen-types}

- Task: any task that an agent can execute {type="alias"}
- Strategy: accumulate | independent {type="union"}

## Inputs {.zen-inputs}

- transforms: (Task, Strategy)[] {required}
- validator: Task {required}

## Workflow {.zen-workflow}

1. Create master work package {action="create" target="wp"}
2. [FOR EACH]{.control-for var="task" in="transforms"} $task IN $transforms:
   - Delegate [#build-prompt]{ref="section"} to sub-agent
3. [IF]{.control-if cond="pass"} validation passes [THEN]{.control-then} continue
```

**Strengths:**
- Metadata attached directly to elements
- Visible context for what attributes mean
- Can mark up existing prose
- Pandoc-compatible syntax

**Weaknesses:**
- Visual noise - attributes clutter reading
- Complex control flow becomes unreadable
- Nesting attributes is problematic
- Steep learning curve for attribute DSL

**Tooling:** Pandoc parsers available; custom attributes need schema
**DX: 4** | **Cognitive Load: 8** | **Feasibility: 7**

---

### Paradigm 4: Pure Structural Markdown

**Example:**
```markdown
# orchestrate-map-reduce

> When you need multiple operations to get one solution...

## Types

### Task
Any task that an agent can execute

### Strategy  
- accumulate
- independent

## Inputs

### transforms
- Type: (Task, Strategy)[]
- Required: yes

### validator
- Type: Task
- Required: yes

## Workflow

### Step 1: Create Master Work Package
Create a master work package to track progress.

### Step 2: Map Phase
For each task in transforms:
- Delegate to sub-agent with the build prompt

### Step 3: Conditional Validation
If strategy equals accumulate:
- Run validation after each iteration
Otherwise:
- Run validation at the end
```

**Strengths:**
- Pure markdown - no new syntax at all
- Very readable as prose
- Renders beautifully everywhere
- Headings create natural hierarchy

**Weaknesses:**
- No formal semantics - relies on naming conventions
- Cannot express types precisely
- Control flow is English, not parseable
- Lots of heading levels for structure

**Tooling:** Standard markdown parsers work; semantics via naming conventions only
**DX: 8** | **Cognitive Load: 3** | **Feasibility: 5**

---

### Paradigm 5: Literate Programming Style

**Example:**
```markdown
# orchestrate-map-reduce

This skill orchestrates map-reduce workflows.

## Type Definitions

We define two core types:

<<types>>=
type Task = any task that an agent can execute
type Strategy = "accumulate" | "independent"  
@

## The Workflow

The workflow proceeds in phases:

<<workflow>>=
<<create-master-wp>>
<<map-phase>>
<<reduce-phase>>
@

### Creating the Master Work Package

<<create-master-wp>>=
1. Create master work package
@

### Map Phase

The map phase iterates over transforms:

<<map-phase>>=
for task in $transforms:
  delegate(sub-agent, <<build-prompt>>)
@

## Prompts

### Build Prompt

<<build-prompt>>=
You are responsible for executing: {$task}
Context: {$current}
Write your solution to: {$next}
@
```

**Strengths:**
- Explanation and code deeply interwoven
- Named chunks can be composed
- Self-documenting by design
- Academic/research community familiarity

**Weaknesses:**
- Learning curve for <<chunk>> syntax
- Not standard markdown - needs special tooling
- Harder to scan for structure
- Chunks spread across document

**Tooling:** Requires tangle/weave toolchain; custom syntax
**DX: 5** | **Cognitive Load: 7** | **Feasibility: 6**

---

### Paradigm 6: Directive-Based

**Example:**
```markdown
---
name: orchestrate-map-reduce
---

@type Task = any task that an agent can execute
@type Strategy = "accumulate" | "independent"

@input transforms: (Task, Strategy)[]
@input validator: Task
@input return: Task

# Workflow

1. Create master work package

@for task in $transforms
2. Delegate task to sub-agent
  @call #build-prompt with { task: $task }
@end

@if $strategy == "accumulate"
3. Validate after each iteration
@else  
3. Validate at the end
@end

## Prompts

@section build-prompt
Execute: {$task}
Context: {$current}
@end
```

**Strengths:**
- Directives visually distinct from prose
- Can express control flow precisely
- Familiar from Blade/Razor templates
- Clear start/end for blocks

**Weaknesses:**
- @-soup can overwhelm the prose
- Two mental models (markdown + directives)
- Hard to know which directives are valid
- Interleaving directives with markdown is tricky

**Tooling:** Custom parser needed; can provide directive completion
**DX: 6** | **Cognitive Load: 5** | **Feasibility: 7**

---

### Paradigm 7: Semantic Markdown (Convention over Syntax)

**Example:**
```markdown
# orchestrate-map-reduce

WHEN you need multiple operations to get one solution
DOES fan out to multiple agents, validate solutions, find winner
USES work-packages, orchestrate

## Types

Task := any task that an agent can execute
Strategy := accumulate | independent

## Inputs

transforms <- (Task, Strategy)[]
validator <- Task
return <- Task

## Workflow

1. Create master work package
2. FOR EACH task IN transforms:
   - Delegate task → #build-prompt
3. IF strategy = accumulate:
   - Validate after each
   ELSE:
   - Validate at end

## Prompts

### build-prompt

Execute: {task}
From: {~~current solution path}
To: {~~next solution path}
```

**Strengths:**
- Introduces minimal new syntax (:=, <-, →, ~~)
- Control flow uses CAPS KEYWORDS in prose
- Still reads as English
- ~~ signals semantic interpretation

**Weaknesses:**
- Keywords in prose could conflict with content
- Relies on specific casing conventions
- Arrow symbols may be hard to type
- Ambiguity between prose and syntax

**Tooling:** Regex-based parsing; CAPS keywords are detectable
**DX: 7** | **Cognitive Load: 4** | **Feasibility: 7**

---

### Paradigm 8: Hybrid Tagged Sections

**Example:**
```markdown
---
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution...
---

<zen:types>
Task = any task that an agent can execute
Strategy = "accumulate" | "independent"
</zen:types>

<zen:inputs>
transforms: (Task, Strategy)[]
validator: Task
return: Task  
</zen:inputs>

# Workflow

1. Create master work package

<zen:for var="task" in="transforms">
2. Delegate to sub-agent with <zen:ref>#build-prompt</zen:ref>
</zen:for>

<zen:if cond="strategy == 'accumulate'">
3. Validate incrementally
<zen:else/>
3. Validate at end
</zen:if>

## Prompts

<zen:prompt id="build-prompt">
Execute: <zen:var>task</zen:var>
Context: <zen:semantic>current solution path</zen:semantic>
</zen:prompt>
```

**Strengths:**
- Clear distinction between markdown and zen constructs
- XML-like tags are familiar and toolable
- Can be parsed with standard XML-aware tools
- Explicit namespacing (zen:)

**Weaknesses:**
- Verbose tag syntax
- Doesn't feel like markdown anymore
- Nested tags can get complex
- Requires closing tags

**Tooling:** XML parsers can handle zen: namespace; good LSP potential
**DX: 6** | **Cognitive Load: 5** | **Feasibility: 9**

---

## Comparison Matrix

| Paradigm | DX | Cognitive Load | Feasibility | Best For |
|----------|-----|----------------|-------------|----------|
| 1. YAML Frontmatter | 7 | 4 | 9 | Simple skills with metadata |
| 2. Fenced Blocks | 6 | 6 | 8 | Separating concerns |
| 3. Inline Attributes | 4 | 8 | 7 | Fine-grained annotation |
| 4. Pure Structural | 8 | 3 | 5 | Human-readable docs |
| 5. Literate | 5 | 7 | 6 | Self-documenting code |
| 6. Directive-Based | 6 | 5 | 7 | Template-like workflows |
| 7. Semantic Markdown | 7 | 4 | 7 | Natural language feel |
| 8. Hybrid Tagged | 6 | 5 | 9 | Complex structured skills |

## Evaluation

### Key Findings

1. **No single paradigm wins** - The hypothesis is confirmed. Different aspects of zen skills suit different paradigms.

2. **Control flow is the wedge** - Pure markdown (Paradigm 4) works beautifully until you need precise control flow. This is where explicit syntax becomes necessary.

3. **The ~~ insight is paradigm-agnostic** - The semantic interpretation operator can work in any paradigm.

4. **Tooling favors explicitness** - Paradigms 2, 6, and 8 are most toolable because they have explicit markers.

5. **Cognitive load vs precision tradeoff** - Lower cognitive load (Paradigms 4, 7) comes at the cost of precision. Higher precision (Paradigms 3, 8) increases load.

### Tensions Identified

- **Readability vs Parseability**: The more parseable, the less it reads like prose
- **Familiarity vs Power**: Standard markdown is familiar but limited
- **Separation vs Integration**: Separating concerns (blocks) vs integrating them (inline)
- **Explicit vs Implicit**: Explicit markers aid tools but add visual noise

### Promising Directions

1. **Hybrid approach**: YAML frontmatter for metadata + Semantic Markdown (Paradigm 7) for body with directives for complex control flow
2. **Progressive enhancement**: Start pure markdown, add zen constructs as needed
3. **Two-layer model**: Human-readable source that compiles to machine-parseable format

### Open Questions

- How do LLMs respond to each paradigm? Some may be more reliably interpreted.
- What's the minimum viable syntax set for 80% of use cases?
- Can we auto-detect paradigm style and support multiple in one ecosystem?
