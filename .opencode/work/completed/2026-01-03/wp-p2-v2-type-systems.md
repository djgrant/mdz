---
size: md
category: language
---

# V2: Type System Approaches for Zen

## Goal/Problem

Explore different type system approaches for a markdown-based agent definition language.

## Results

### Dimension 1: Structural vs Nominal Typing

#### Structural Typing

```markdown
## Types

Task := {
  description: string
  execute: () -> Result
}

## Inputs

myTask: Task  // Any object matching this shape works
```

**How it works:** Types match by shape, not by declared name. If an object has the right properties, it's compatible.

**For agents:**
- Pros: Flexible - prompts that produce the right shape "just work"
- Pros: No need for explicit type declarations everywhere
- Cons: Harder to catch semantic errors (two different things with same shape)
- Cons: LLMs might produce structurally-matching but semantically-wrong outputs

#### Nominal Typing

```markdown
## Types

type Task = {
  description: string
  execute: () -> Result
}

type ValidationTask extends Task  // Distinct from Task

## Inputs

validator: ValidationTask  // Only accepts ValidationTask, not any Task
```

**How it works:** Types match by name. Even if shapes are identical, different names = different types.

**For agents:**
- Pros: Semantic clarity - ValidationTask means something specific
- Pros: Better documentation of intent
- Cons: More boilerplate to define types
- Cons: May be overkill for LLM-interpreted content

#### Hybrid Approach (Recommended for Zen)

```markdown
## Types

$Task = any task that an agent can execute       // Semantic type (nominal)
$FilePath = string                                // Alias (structural)
$Strategy = "accumulate" | "independent"          // Union (structural)

## Inputs

validator: $Task        // Nominal - must be conceptually a Task
outputPath: $FilePath   // Structural - any string works
```

**Insight:** Use nominal types for semantic concepts (Task, Agent, WorkPackage) and structural types for data shapes.

---

### Dimension 2: Gradual vs Strict Typing

#### Fully Gradual (Optional Types)

```markdown
## Inputs

transforms     // No type - anything goes
validator      // No type
return: $Task  // Optionally typed

## Workflow

current = transforms[0]  // Type inferred as unknown
```

**For agents:**
- Pros: Low barrier to entry - start untyped, add types later
- Pros: Matches how prompts evolve (vague -> precise)
- Cons: Less tooling support without types
- Cons: Errors surface at runtime, not definition time

#### Fully Strict

```markdown
## Types

$Task := defined
$Strategy := "accumulate" | "independent"

## Inputs (all required, all typed)

transforms: ($Task, $Strategy)[]  // Must be array of tuples
validator: $Task                   // Must be Task
return: $Task                      // Must be Task
iterations: int = 5                // With default
```

**For agents:**
- Pros: Maximum tooling support
- Pros: Errors caught early
- Cons: Verbose for simple skills
- Cons: May fight against LLM flexibility

#### Progressive Typing (Recommended for Zen)

```markdown
## Inputs

# Simple skill - untyped is fine
task: ~~ what to do

# Complex skill - types help
transforms: ($Task, $Strategy)[]  // Typed for precision
validator                          // Untyped - will be inferred
```

**Insight:** Types should be available but not mandated. Let complexity justify precision.

---

### Dimension 3: Type Inference

#### What Can Be Inferred?

```markdown
## Context

$current = $SolutionPath(0)    // Inferred: $FilePath (from SolutionPath return type)
$next = $SolutionPath(1)       // Inferred: $FilePath

## Workflow

result = delegate(#prompt)     // Inferred from #prompt's output type
valid = validate(result)       // Inferred: boolean (from validate signature)
```

#### Lambda Type Inference

```markdown
## Context

$SolutionPath = $n => `{~~wp-path}-candidate-{$n}.md`
// Inferred: $SolutionPath: (int) -> string
// Or with semantic types: (int) -> $FilePath
```

#### Cross-Reference Inference

```markdown
## Inputs

transforms: ($Task, $Strategy)[]

## Workflow

FOR EACH ($task, $strategy) IN transforms:
  // $task inferred as $Task
  // $strategy inferred as $Strategy
```

**Insight:** Inference reduces boilerplate while maintaining type safety. Key inference points:
- Variable assignments from typed expressions
- Lambda parameter types from usage
- Destructuring from container types

---

### Dimension 4: Semantic Types

#### What are Semantic Types?

Types that carry meaning beyond their structure:

```markdown
## Types

$FilePath = string               // Semantic: represents a file path
$AgentPrompt = string            // Semantic: represents text for an agent
$WorkPackage = markdown document // Semantic: a specific document structure
$Task = any agent-executable     // Semantic: open-ended but meaningful
```

#### Why Semantic Types Matter for LLMs

```markdown
## Inputs

path: $FilePath     // LLM knows this should look like a path
prompt: $AgentPrompt // LLM knows this is for another agent
message: string      // Just any string

## Workflow

write $result to $path   // LLM understands file operation semantics
```

**Insight:** Semantic types serve as hints to LLMs about intent, not just structural validation.

#### Semantic Type Operators

```markdown
## Types

$Date = string matching YYYY-MM-DD
$Percentage = number between 0 and 100
$NonEmpty = string with length > 0
```

**Insight:** Semantic types can include constraints that help LLMs produce valid outputs.

---

### Dimension 5: Compound Types

#### Tuples

```markdown
($Task, $Strategy)           // Ordered pair
($Task, $Strategy, int)      // Triple
```

#### Arrays/Lists

```markdown
$Task[]                      // Array of tasks
list of $Task               // Natural language variant
($Task, $Strategy)[]         // Array of tuples
```

#### Records/Objects

```markdown
{
  name: string
  inputs: $Input[]
  output: $Output
}
```

#### Optional Types

```markdown
$Task?                       // Optional task (may be null/absent)
$Task | null                 // Explicit nullable
$Task = default_task         // With default value
```

#### Union Types

```markdown
$Strategy = "accumulate" | "independent"
$Result = $Success | $Failure
```

**Insight:** Keep compound types simple. LLMs work better with flat structures than deeply nested types.

---

### Dimension 6: Type Composition Across Skills

#### Importing Types

```markdown
---
imports:
  - from: ./orchestrate.md
    types: [$Task, $Strategy]
---

## Inputs

myTask: $Task  // Uses imported type
```

#### Type Compatibility Across Skills

```markdown
# skill-a.md
## Types
$Task = { description, execute }

# skill-b.md  
## Types
$Task = { description, run }  // Different shape!

# Problem: What happens when skill-a passes $Task to skill-b?
```

**Resolution Options:**
1. **Global type registry** - All skills share type definitions
2. **Explicit versioning** - $Task@v1 vs $Task@v2
3. **Duck typing** - If it has description, close enough
4. **Type adapters** - Define how to convert between types

#### Exporting Types

```markdown
---
exports:
  types: [$Task, $Strategy, $Result]
---
```

**Insight:** Type flow across skills is a major design decision. Options range from strict (imports/exports) to loose (semantic matching).

---

## Evaluation

### Key Findings

1. **Semantic types are uniquely valuable for agents** - Unlike traditional programming, types here serve as hints to LLMs about meaning, not just structure.

2. **Gradual typing fits the domain** - Agent skills evolve from vague to precise. Forcing strict types early would be counterproductive.

3. **Inference reduces friction** - Most types can be inferred from context, reducing boilerplate while maintaining safety.

4. **Compound types should be shallow** - Deep nesting confuses LLMs. Prefer flat structures.

5. **Cross-skill types need a strategy** - This is an unresolved tension that needs more exploration in Phase 2.

### Tensions Identified

- **Precision vs Flexibility**: Strict types enable tooling but constrain LLM creativity
- **Semantic vs Structural**: Semantic types are meaningful but harder to validate
- **Local vs Global**: Local types are encapsulated; global types enable composition
- **Inference vs Explicitness**: Inference reduces noise but can obscure intent

### Promising Directions

1. **Two-tier type system**: Semantic types for concepts ($Task), structural types for data (string, int)
2. **Type hints, not type checks**: Types guide LLMs rather than blocking execution
3. **Optional annotations**: `$x: $Type` when precision helps, `$x` when it doesn't

### Open Questions

- How do types interact with the ~~ semantic operator?
- Should types be validated at compile-time, runtime, or both?
- How do LLMs actually respond to typed vs untyped prompts?
- What's the minimum type vocabulary for 80% of skills?
