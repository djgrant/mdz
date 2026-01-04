---
size: md
category: language
---

# V10: Radical Alternatives

## Goal/Problem

Explore deliberately unconventional approaches that question basic assumptions.

## Results

### Alternative 1: What If It's Not Markdown At All?

#### Pure YAML

```yaml
name: orchestrate-map-reduce
description: When you need multiple operations to get one solution...

types:
  Task: any task that an agent can execute
  Strategy: [accumulate, independent]

inputs:
  transforms: { type: array, items: [Task, Strategy] }
  validator: { type: Task }
  return: { type: Task }

workflow:
  - step: create-master-wp
  - for_each:
      var: task
      in: transforms
      do:
        - delegate: iteration-manager
          with: { task: $task }
  - step: collect-findings
  - step: update-master-wp

prompts:
  iteration-manager: |
    You are responsible for mapping over Task until it passes Validator.
    Task: {{ task }}
```

**What's gained:**
- Fully structured - easy to parse and validate
- Schema validation built-in
- Tooling is mature

**What's lost:**
- Prose is awkward in YAML
- Multiline strings are ugly
- Not readable as documentation
- Feels like configuration, not instructions

**Verdict:** YAML could work for simple skills but breaks down when prose matters.

---

#### Pure JSON

```json
{
  "name": "orchestrate-map-reduce",
  "workflow": [
    { "type": "for_each", "var": "task", "in": "transforms", "do": [
      { "type": "delegate", "to": "iteration-manager", "with": { "task": "$task" } }
    ]}
  ]
}
```

**What's gained:**
- Universal format
- Direct from LLM (JSON mode)

**What's lost:**
- Everything that makes prose readable
- Comments
- Human editing experience

**Verdict:** JSON is for machines, not humans.

---

#### Custom Syntax Entirely

```zen
skill orchestrate-map-reduce:
  types:
    Task = any executable task
    Strategy = accumulate | independent
  
  inputs:
    transforms: (Task, Strategy)[]
    validator: Task
  
  workflow:
    create master_wp
    for task, strategy in transforms:
      delegate iteration_manager(task, strategy)
    collect findings
    update master_wp
  
  prompt iteration_manager(task):
    """
    You are responsible for mapping over Task.
    Task: {task}
    """
```

**What's gained:**
- Purpose-built syntax
- Can optimize for agent patterns
- Clean, consistent

**What's lost:**
- Markdown familiarity gone
- Need to learn new language entirely
- No graceful degradation
- Tooling from scratch

**Verdict:** High risk, high reward. Could be powerful but adoption is harder.

---

### Alternative 2: What If Skills Are Code?

#### TypeScript with JSDoc

```typescript
/**
 * @skill orchestrate-map-reduce
 * @description When you need multiple operations to get one solution...
 */

type Task = string; // Semantic: any executable task
type Strategy = "accumulate" | "independent";

interface Inputs {
  transforms: [Task, Strategy][];
  validator: Task;
  return: Task;
}

/**
 * @workflow
 */
async function execute(inputs: Inputs): Promise<void> {
  const masterWp = await createMasterWp();
  
  for (const [task, strategy] of inputs.transforms) {
    await delegate("iteration-manager", { task, strategy });
  }
  
  await collectFindings();
  await updateMasterWp(masterWp);
}

/**
 * @prompt iteration-manager
 */
const iterationManagerPrompt = (task: Task) => `
  You are responsible for mapping over Task.
  Task: ${task}
`;
```

**What's gained:**
- Full TypeScript type system
- Existing tooling (LSP, testing, etc.)
- Familiar to developers
- Can run and test locally

**What's lost:**
- Not LLM-native format
- Prose as strings is awkward
- Requires compilation to prompts
- Feels like programming, not instructing

**Verdict:** Works for developer-heavy teams but loses the "prompt-first" nature.

---

#### Python with Docstrings (DSPy-style)

```python
class OrchestrateMapReduce(Skill):
    """When you need multiple operations to get one solution..."""
    
    class Types:
        Task = "any executable task"
        Strategy = Literal["accumulate", "independent"]
    
    class Inputs:
        transforms: list[tuple[Task, Strategy]]
        validator: Task
        return_task: Task
    
    async def workflow(self):
        master_wp = await self.create_master_wp()
        
        for task, strategy in self.inputs.transforms:
            await self.delegate("iteration-manager", task=task)
        
        await self.collect_findings()
        await self.update_master_wp(master_wp)
    
    @prompt
    def iteration_manager(self, task: Task) -> str:
        """
        You are responsible for mapping over Task.
        Task: {task}
        """
```

**What's gained:**
- Python ecosystem
- Class-based composition
- Decorator patterns

**What's lost:**
- Same issues as TypeScript
- Python-specific

**Verdict:** Similar to TypeScript - works but loses prompt-native feel.

---

### Alternative 3: What If There's No Explicit Control Flow?

#### Purely Declarative

```markdown
# orchestrate-map-reduce

## Goal

Transform inputs through multiple operations and reduce to one solution.

## Given

- A list of transforms (task, strategy pairs)
- A validator task
- A return task

## Produce

- Findings from each transform
- Validation results
- Final reduced solution

## Constraints

- Each transform should be executed
- Validation should pass before completion
- Maximum 5 iterations per transform

## Dependencies

- iteration-manager: Handles individual transforms
- validator: Checks solution quality
```

**How it works:**
- No explicit FOR, IF, WHILE
- LLM infers execution order from dependencies and constraints
- System guarantees constraints are met

**What's gained:**
- Very high level
- Focus on what, not how
- LLM can optimize execution

**What's lost:**
- No control over execution order
- Hard to debug
- Unpredictable behavior
- May not satisfy precise requirements

**Verdict:** Interesting for simple cases, dangerous for complex orchestration.

---

#### Constraint-Based

```markdown
# orchestrate-map-reduce

## Constraints

C1: All transforms must be executed
C2: Execution order respects dependencies
C3: Validator runs after each accumulate step
C4: Maximum 5 iterations before declaring convergence
C5: Results collected before final reduce

## Solve

Find an execution plan satisfying C1-C5 that:
- Minimizes total iterations
- Maximizes parallel execution where strategy = independent
- Ensures all validations pass
```

**What's gained:**
- Optimization possible
- Declarative feel
- LLM/solver can find execution plan

**What's lost:**
- Constraint specification is complex
- No guarantee of finding solution
- Hard to debug constraint conflicts

**Verdict:** Could work for optimization problems, not general orchestration.

---

### Alternative 4: What If Types Are Emergent?

#### No Type Annotations

```markdown
# orchestrate-map-reduce

## Inputs

transforms - the list of (task, strategy) pairs to process
validator - how to check if a solution is good
return - what to do at the end

## Workflow

1. Create a master work package
2. For each transform:
   - Delegate to iteration manager
3. Collect all findings
4. Return results
```

**How types work:**
- System infers types from usage patterns
- "transforms" is array because we iterate over it
- "validator" is callable because we call it
- Types are recommendations, not requirements

**What's gained:**
- Zero ceremony
- Start writing immediately
- Types don't block iteration

**What's lost:**
- No type errors until runtime
- Tooling can't help as much
- Refactoring is risky

**Verdict:** Good for exploration, risky for production.

---

#### Duck Typing for Agents

```markdown
# Any skill that has:
# - An "execute" section
# - Returns a "result"
# Can be used as a Task

# The system checks at call-time:
# "Does this skill quack like a Task?"
```

**What's gained:**
- Flexibility
- Easy to substitute
- Less boilerplate

**What's lost:**
- Interface contracts are implicit
- Harder to document
- Errors are late

**Verdict:** Aligns with LLM's natural flexibility.

---

### Alternative 5: What If Skills Are Graphs?

#### Visual Node-Based

```
┌─────────────────┐
│ create-master-wp │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   for-each      │◄──── transforms
│   transform     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ delegate        │◄──── iteration-manager
│ iteration-mgr   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ collect-findings │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ update-master-wp │
└─────────────────┘
```

**Markdown as serialization:**

```markdown
# orchestrate-map-reduce

## Graph

nodes:
  - id: start
    type: create-master-wp
  - id: loop
    type: for-each
    input: transforms
    body: delegate-iter
  - id: delegate-iter
    type: delegate
    skill: iteration-manager
  - id: collect
    type: collect-findings
  - id: end
    type: update-master-wp

edges:
  - start → loop
  - loop → delegate-iter
  - delegate-iter → loop.next
  - loop.done → collect
  - collect → end
```

**What's gained:**
- Visual clarity
- Parallel paths obvious
- State flow visible
- Familiar from node-based tools

**What's lost:**
- Needs visual editor
- Text representation is verbose
- Prose doesn't fit naturally

**Verdict:** Excellent for complex workflows, but needs tooling investment.

---

### Alternative 6: What If LLM Writes the Skills?

#### Natural Language Only

```markdown
# orchestrate-map-reduce

This skill helps you run multiple transformations on a problem and find the best solution.

You give it a list of things to try, a way to check if the result is good, and what to do at the end.

It creates a work package to track progress, tries each transformation, checks if the results are getting better, and when done, gives you the findings.

If you tell it to "accumulate", it validates after each step. If you tell it to run things independently, it validates everything at the end.
```

**How it works:**
- Human writes natural language
- System (LLM) generates formal structure
- Human reviews and approves
- Generated structure becomes the executable

**What's gained:**
- Lowest possible barrier to entry
- Anyone can write skills
- Captures intent directly

**What's lost:**
- Precision is by approval, not specification
- Generated structure may vary
- Hard to maintain/version

**Verdict:** Interesting for bootstrapping, but needs human-in-the-loop refinement.

---

## Evaluation

### What We Learn from Radical Alternatives

1. **Markdown is valuable** - Every alternative that abandons markdown loses readability. Markdown is the "80% solution."

2. **Some structure is necessary** - Pure natural language is too ambiguous. Control flow needs explicit syntax.

3. **Types are helpful but not essential** - Duck typing and emergent types can work if tooling adapts.

4. **Visual representation has merit** - Graphs are intuitive for workflows. Worth considering as a complementary view.

5. **LLM generation is complementary** - Could help generate structure, but shouldn't replace human authorship.

### Ideas Worth Incorporating

1. **Dual view: text + graph** - Let users switch between text and visual for the same skill
2. **Emergent types with hints** - Types inferred but annotatable
3. **Constraint annotations** - Add constraints alongside imperative flow
4. **Natural language scaffolding** - Start from NL, refine to structure

### Ideas to Avoid

1. **Pure YAML/JSON** - Too far from prose
2. **Code-first** - Loses prompt-native feel
3. **Pure declarative** - Too unpredictable for orchestration
4. **No types at all** - Too risky for composition

### Key Insight

The radical alternatives confirm that zen should be:
- **Markdown-based** (not pure config or code)
- **Structurally enhanced** (not pure natural language)
- **Optionally typed** (not strict or absent)
- **Explicit control flow** (not inferred or absent)

The "radical" position is actually the existing genesis vision. The alternatives help us understand why.
