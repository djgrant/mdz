---
size: md
category: language
---

# V6: Composition Patterns for Zen

## Goal/Problem

Explore how skills compose with each other.

## Results

### Pattern 1: Inheritance (Extends)

**Example:**

```markdown
---
name: accumulate-map-reduce
extends: orchestrate-map-reduce
---

## Types

# Inherits $Task, $Strategy from parent

$AccumulateStrategy = "accumulate"  # Narrows Strategy

## Inputs

# Inherits transforms, validator, return
# Overrides default strategy

strategy: $AccumulateStrategy = "accumulate"

## Workflow

# Inherits base workflow, overrides validation phase

### Override: Validation Phase

Validate after EACH iteration, not at end.
```

**How it works:**
- `extends: parent-skill` in frontmatter
- Child inherits all sections from parent
- Child can override specific sections
- Types and inputs can be narrowed

**Strengths:**
- Familiar OOP pattern
- Clear parent-child relationship
- Reuse without duplication
- Override at section granularity

**Weaknesses:**
- Deep hierarchies become confusing
- Diamond problem with multiple inheritance
- Tight coupling to parent
- Changes to parent affect all children

---

### Pattern 2: Mixins (Include Behavior)

**Example:**

```markdown
---
name: simplify
mixins:
  - logging
  - retry-on-failure
  - progress-tracking
---

## Workflow

# Has access to log(), retry(), track() from mixins

1. track("starting simplification")
2. log("identifying what to simplify")
3. retry(3):
   - Execute transformation
4. track("completed")
```

**How it works:**
- `mixins: [name1, name2]` in frontmatter
- Mixins add capabilities without inheritance hierarchy
- Multiple mixins can be combined
- Conflicts resolved by order (last wins)

**Strengths:**
- Composition over inheritance
- Mix and match capabilities
- No deep hierarchies
- Cross-cutting concerns handled cleanly

**Weaknesses:**
- Harder to trace where behavior comes from
- Conflict resolution can surprise
- Implicit dependencies
- Namespace pollution

---

### Pattern 3: Delegation (Uses At Runtime)

**Example:**

```markdown
---
name: simplify
uses:
  - orchestrate-map-reduce
  - work-packages
---

## Workflow

1. Scope the simplification task
2. Confirm plan with user
3. Execute orchestrate-map-reduce with:
   - transforms = simplification heuristics
   - validator = essence-preserved check
   - return = "Present findings"

## Calls to orchestrate-map-reduce

### transforms

- (Subtractive Iteration, accumulate)
- (Constraint Forcing, independent)

### validator

Check: Is the solution still viable?
```

**How it works:**
- `uses: [skill-names]` declares dependencies
- Parent skill orchestrates child skills
- Parameters passed explicitly
- Results flow back to parent

**Strengths:**
- Loose coupling
- Clear interfaces between skills
- Easy to swap implementations
- No inheritance complexity

**Weaknesses:**
- Verbose parameter passing
- No automatic behavior inheritance
- Must define all connections explicitly
- Boilerplate for simple compositions

---

### Pattern 4: Templates/Generics

**Example:**

```markdown
---
name: map-reduce
generic: [$Task, $Result]
---

## Types

$Task = type parameter
$Result = type parameter

## Inputs

tasks: $Task[]
mapper: ($Task) -> $Result
reducer: ($Result[]) -> $Result

## Workflow

1. FOR EACH $task IN tasks:
   - result = mapper($task)
   - collect result
2. final = reducer(results)
3. return final
```

**Instantiation:**

```markdown
---
name: simplify-map-reduce
instantiates: map-reduce[$SimplifyTask, $SimplifiedCode]
---

## Bindings

$Task = $SimplifyTask
$Result = $SimplifiedCode

mapper = simplify-one-layer
reducer = pick-best-simplification
```

**Strengths:**
- Type-safe composition
- Reusable patterns
- Clear contracts
- Compile-time checking possible

**Weaknesses:**
- Complex syntax
- High learning curve
- May be overkill for most skills
- Type instantiation can get confusing

---

### Pattern 5: Slots/Extension Points

**Example:**

```markdown
---
name: orchestrate-map-reduce
slots:
  - pre-map-hook
  - post-reduce-hook
  - custom-validator
---

## Workflow

1. Create master work package
2. {slot: pre-map-hook, default: no-op}
3. FOR EACH task in transforms:
   - Delegate task
4. Collect findings
5. Validate with {slot: custom-validator, default: #default-validator}
6. {slot: post-reduce-hook, default: no-op}
7. Return results

### default-validator

Standard validation logic here.
```

**Usage:**

```markdown
---
name: simplify
extends: orchestrate-map-reduce
fills:
  pre-map-hook: #setup-simplification-context
  custom-validator: #check-essence-preserved
---

### setup-simplification-context

Log current state. Identify essence to preserve.

### check-essence-preserved

Verify the simplified solution still works.
```

**Strengths:**
- Explicit extension points
- Parent controls structure
- Children fill specific slots
- Plugin architecture

**Weaknesses:**
- Parent must anticipate extension needs
- Slot placement is fixed
- Limited flexibility compared to full override
- Learning which slots exist

---

### Pattern 6: Decorators/Wrappers

**Example:**

```markdown
---
name: with-logging
decorator: true
wraps: $WrappedSkill
---

## Before

Log: "Starting {$WrappedSkill.name}"
Record: start_time

## After

Log: "Completed {$WrappedSkill.name} in {elapsed_time}"
Record: end_time, result
```

**Application:**

```markdown
---
name: logged-simplify
applies:
  - with-logging
  - with-retry
  - with-timeout(5min)
base: simplify
---

# This creates: with-timeout(with-retry(with-logging(simplify)))
```

**Strengths:**
- Cross-cutting concerns separated
- Composable wrappers
- No modification to base skill
- Order is explicit

**Weaknesses:**
- Stack of wrappers can be confusing
- Debugging through layers
- Performance overhead from wrapping
- Complex for simple cases

---

### Pattern 7: Flattening/Inlining (Compile-Time)

**Example:**

```markdown
# Source: simplify.md
---
name: simplify
inlines:
  - orchestrate-map-reduce
---

## Workflow

1. Scope simplification
2. {inline: orchestrate-map-reduce#map-phase}
3. {inline: orchestrate-map-reduce#reduce-phase}
4. Present findings
```

**Compiled output (what LLM sees):**

```markdown
---
name: simplify
---

## Workflow

1. Scope simplification
2. FOR EACH task IN transforms:
   - Delegate to sub-agent
   - Collect results
3. Aggregate findings
   - Update master work package
4. Present findings
```

**Strengths:**
- No runtime composition overhead
- LLM sees complete, flat document
- Easier debugging of final output
- No reference resolution needed

**Weaknesses:**
- Compiled output can be large
- Source ≠ what runs
- Harder to trace origin of content
- Loses modularity benefits at runtime

---

## The Simplify → Orchestrate-Map-Reduce Relationship

Implementing this relationship in each pattern:

**Inheritance:**
```markdown
# simplify extends orchestrate-map-reduce, overrides transform selection
```

**Delegation:**
```markdown
# simplify calls orchestrate-map-reduce with specific parameters
```

**Slots:**
```markdown
# simplify fills orchestrate-map-reduce's customization slots
```

**Wrapper:**
```markdown
# simplify wraps orchestrate-map-reduce with scoping logic
```

**Most natural fit:** **Delegation** - simplify is not a specialized map-reduce, it uses map-reduce as a tool.

---

## Evaluation

### Key Findings

1. **Delegation is the primary pattern** - Most skill composition is one skill calling another with parameters.

2. **Inheritance is useful but risky** - Good for variations, dangerous for deep hierarchies.

3. **Mixins handle cross-cutting concerns** - Logging, retry, tracking should be mixins.

4. **Slots enable framework skills** - Core patterns like orchestrate-map-reduce can define extension points.

5. **Compile-time inlining may be necessary** - LLMs work better with flat, complete documents.

### Tensions Identified

- **Modularity vs Comprehensibility**: More modules = harder to see full picture
- **Reuse vs Coupling**: Inheritance couples tightly; delegation is verbose
- **Compile-time vs Runtime**: Inlining loses modularity; runtime adds complexity
- **Explicit vs Implicit**: Explicit composition is clear but verbose

### Promising Directions

1. **Primary: Delegation with explicit parameters** - Clear, debuggable, flexible
2. **Secondary: Mixins for cross-cutting** - Keep skills focused
3. **Tertiary: Slots for framework patterns** - Controlled extensibility
4. **Compile step: Inline for LLM consumption** - Flatten before execution

### Open Questions

- How do composition patterns interact with loading order?
- Should there be compile-time checking of composition compatibility?
- How do errors propagate across composition boundaries?
- What's the debugging story for deeply composed skills?
