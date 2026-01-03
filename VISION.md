# Zen Markdown Vision Document

> A superset of markdown (.mdz) for multi-agent systems that unlocks LLM runtime capabilities, with tooling that guides developers into the pit of success.

## Core Assumptions

These assumptions underpin the design. They require validation via benchmarks.

**1. The LLM is the runtime.**

The LLM is a capable Turing machine. It reads skills, interprets control flow, makes tool calls, writes to persisted storage. There is no separate runtime layer - the LLM executes what the document says.

**2. Less prompt is better.**

A simpler, shorter prompt outperforms an expanded one on frontier models. We do not need to transform `$Task` into `Task (a task that an agent can execute)`. The LLM understands the compact form. Expansion may be a feature for weaker models later, but it's not on the roadmap.

**3. Source is the optimal format.**

Zen Markdown as authored IS what the LLM should see. There is no "compiled form" that's better for LLM consumption.

Minimal preprocessing may still be valuable (grammar preambles, macro expansion, reference inlining), but this is distinct from "compilation" in the traditional sense. See Open Questions.

## What Zen Is

**A format that guides developers toward correct multi-agent systems.**

Zen is markdown with lightweight extensions that:
- Express interfaces (inputs, outputs, types)
- Declare dependencies between modules
- Signal semantic interpretation points to the LLM
- Structure control flow visibly

**Tooling that validates logical coherence.**

The tooling layer checks that modules fit together correctly. Some checks are deterministic (run by the parser/compiler), others require LLM interpretation:

*Deterministic checks:*
- Do referenced modules exist?
- Are there circular dependencies?
- Are required parameters provided?
- Does syntax parse correctly?
- Do type names match across boundaries?

*LLM-assisted checks (future):*
- Is this semantic marker meaningful in context?
- Does the control flow logic make sense?
- Are there unreachable branches?

This is "compilation" in the sense of checking pieces fit - not transforming source to target.

**An ecosystem for managing complex agent systems.**

Like dbt for SQL, zen adds a coordination layer to markdown modules:
- Modules as composable units with declared interfaces
- Dependency graph construction and visualization
- Build-time validation before runtime discovery of errors
- Optional macro expansion for build-time-known values

**A target format for LLM-assisted authoring.**

LLMs that help developers write agent systems can generate `.mdz` files. The deterministic syntax enables validation of LLM-generated output before use.

## What Zen Is NOT

**Not a transpiler.**

We don't transform zen into "something else" for the LLM. The source format is the execution format (with minimal exceptions noted below).

**Not type-safe at runtime.**

Types are contracts for tooling, not runtime enforcement. We can check "you're passing `$Number` where `$Task` is expected" at build time. We cannot check "the value of `$validator` at runtime is actually a Task."

**Not a DSL that hides markdown.**

Zen extends markdown; it doesn't replace it. A zen file is valid markdown. The extensions are visible signals, not a parallel syntax.

**Not a runtime or orchestration framework.**

The LLM + agent framework (e.g., OpenCode) handles execution. Zen is the authoring format and validation layer, not the execution engine.

**Not an expansion system for smaller models.**

We're targeting frontier models. The assumption is they work better with concise prompts. We're not building compatibility layers for weaker models.

## The Tooling Layer

### Parser + Validator

Checks that what's written is logically coherent:

- **Syntax correctness** - Valid zen constructs
- **Reference validation** - `[[skill]]` and `[[skill#section]]` targets exist
- **Contract compatibility** - Types match across skill boundaries
- **Dependency validation** - No cycles, required skills available
- **Scope checking** - Variables defined before use

### Dependency Graph

Built from `uses:` declarations and `[[references]]`:

- **Validation** - Cycles detected, missing deps flagged
- **Visualization** - Understand complex agent systems as a graph
- Not used for runtime orchestration (LLM handles that)

### Minimal Preprocessing (Optional)

Distinct from traditional compilation, preprocessing reduces noise for the LLM without expanding or adding verbosity.

**Macro expansion:**
```markdown
{{IF (strategy == accumulate) THEN}}
  - validate incrementally
{{ELSE}}
  - validate at end  
{{END}}
```

If `strategy` is known at build time, prune to single path. If unknown, the skill may split into variants:
```
/skills/
  orchestrate-accumulate.zen.md
  orchestrate-independent.zen.md
```

The LLM only sees the relevant, clean version. Like dbt compiling to `/target`.

**Grammar handling (open question - which is better?):**

Syntax like `{~~appropriate location}` needs the LLM to understand "interpret this contextually."

- **Mode A: Grammar preamble** - Prepend syntax explanation, leave markers as-is
- **Mode B: Natural language** - Transform `{~~x}` to prose like "(determine: x)"

Both produce valid input for the LLM. Mode A is terser; Mode B requires no grammar learning. We provide both modes because we don't yet know which performs better.

**Reference handling (open question - which is better?):**

`[[skill#section]]` could be:
- Left as-is (with grammar preamble explaining the syntax)
- Transformed to natural language ("refer to the validation section")
- Inlined (pull section content into the document)

### What Preprocessing Does NOT Do

- Expand types (`$Task` stays `$Task`)
- Add verbosity for "clarity"
- Transform for weaker models
- Runtime orchestration

## Syntax Signals

Zen syntax serves as signals to both tooling and the LLM.

### `$name` - Variables and Types

```markdown
$Task = any executable instruction
$validator: $Task
$count = 5
```

Signals to tooling: track this, check contracts.
Signals to LLM: this is a named value/concept.

**Case convention (current approach):**
- `$UpperCase` = type definition (e.g., `$Task = any executable instruction`)
- `$lowerCase` = variable (e.g., `$validator: $Task`)

Whether this is enforced or uses explicit keywords (`type $Task`) needs exploration. The compiler needs some way to distinguish types from variables for contract checking.

### `[[reference]]` - Skill Dependencies

```markdown
Execute [[work-packages]] WITH:
  - $task = "create experiment log"
```

Signals to tooling: validate this skill exists, check contract compatibility.
Signals to LLM: load/reference this skill (or inline if compiled).

### `{~~semantic}` - Contextual Interpretation

```markdown
Write results to {~~appropriate location for this experiment}
```

Signals to tooling: this is not a checkable value, skip validation.
Signals to LLM: determine this from context at runtime.

### `FOR EACH`, `WHILE`, `IF THEN` - Control Flow

```markdown
FOR EACH $item IN $items:
  - Process $item
  
WHILE (NOT diminishing returns AND $iteration < 5):
  - Continue iterating

IF $result = "pass" THEN:
  - Commit changes
```

Currently using CAPS keywords to distinguish from prose. See Design Constraint section for open questions about syntax choices.

### `{{IF}} {{ELSE}} {{END}}` - Macros

```markdown
{{IF (strategy == accumulate) THEN}}
  - validate incrementally
{{ELSE}}
  - validate at end
{{END}}
```

Macros are resolved at build time, not runtime. They signal to tooling: "this branch produces variants."

**Macros vs Control Flow:**
- `IF THEN` (runtime) - LLM evaluates condition during execution
- `{{IF}}` (macro) - Tooling resolves at build time, LLM never sees the branch

When a macro value is known at build time, the compiler prunes to a single path. When unknown, it may produce multiple skill variants (e.g., `skill-accumulate.zen.md`, `skill-independent.zen.md`).

## The Pit of Success

Zen's structure makes the right thing easy and the wrong thing hard.

**Declaring dependencies explicitly:**
```yaml
uses:
  - work-packages
  - orchestrate
```
Tooling validates these exist, detects cycles, and exposes them via intellisense for autocomplete.

**Typed interfaces:**
```markdown
## Input
- $task: $Task
- $validator: $Task  
```
Tooling can check callers provide correct parameters. Declared dependencies enable autocomplete for available types and variables.

**Composition over templating:**

If you're writing `{{IF}}` branches, consider: should this be two modules composed together? The pit of success is reaching for composition first.

**Semantic markers for uncertainty:**

Instead of hardcoding paths that will be wrong, mark them:
```markdown
Write to {~~appropriate location}
```
The LLM determines; you don't guess.

## Output and Targets

There are two distinct concepts:

**1. Compilation (.mdz → .md)**

The transformation from zen markdown to standard markdown:
- Macro expansion (prune branches or split into variants)
- Grammar preamble injection (optional)
- Reference inlining (optional)

The output is still markdown, just preprocessed.

**2. Output Structure (where files go)**

The compiled `.md` files need to be structured for the target runtime. Currently targeting OpenCode conventions:
- Skills directory structure
- Frontmatter format
- Reference conventions

Future targets could include other agent frameworks with different conventions.

**Visualization** is a separate output type:
- Dependency graph in Mermaid, DOT, or JSON formats
- Not a "compilation target" but a tooling feature

## Playground Vision

The playground demonstrates zen's value proposition. This requires separate exploration, but initial use cases include:

**Preprocessing modes:**
- Toggle between grammar preamble vs natural language transformation
- See how `{~~}` and `[[refs]]` are handled in each mode

**Macro expansion:**
- Show how `{{IF}}` macros split into module variants
- Visualize which variant would be selected for given inputs

**Dependency graph:**
- Show skills as nodes, references as edges
- Make composition tangible and explorable

**Validation feedback:**
- Undefined reference → red squiggle
- Contract mismatch → type error
- "Without zen, you'd discover this at runtime with a confused LLM"

**Compression demonstration:**
- Show source skill (25 lines) vs inlined version (180 lines)
- The penny-drop: "I maintain 25 lines, LLM gets full context"

## Design Constraint: Deterministic Compilation

A key constraint on syntax design: **anything the compiler needs to process must be unambiguously identifiable.**

This creates tension between readability and parseability. Each syntax choice needs exploration:

- **Control flow keywords** - CAPS (`FOR EACH`) vs lowercase (`for each`) vs sigils (`@for each`). How do we distinguish from prose?
- **Types vs variables** - Case convention (`$Task` vs `$task`) vs explicit keyword (`type $Task`). What enables contract checking?
- **References** - `[[skill]]` vs prose that tooling infers. What level of explicitness is needed?
- **Macros vs runtime** - `{{IF}}` vs `IF THEN`. Must be syntactically distinct.
- **Semantic markers** - `{~~content}` vs unmarked prose. Does the compiler need to identify these?

Syntax choices aren't just aesthetic - they determine what the compiler can do deterministically. But we don't yet know which trade-offs are right.

## Open Questions

### Preprocessing

1. **Grammar preamble vs natural language transformation** - Which performs better with frontier models? Need benchmarks.
2. **Reference handling** - Leave as syntax, transform to prose, or inline content? May depend on context.
3. **Macro expansion** - When to split into variants vs prune branches?

### Syntax

4. Is `[[reference]]` the right syntax, or should references be prose that tooling infers?
5. Is `{~~}` worth the syntax, or should semantic points be unmarked prose?
6. CAPS vs lowercase vs sigils for control flow - what enables deterministic parsing while remaining readable?
7. Case convention vs `type` keyword for distinguishing types from variables?

### Tooling

8. What triggers a build? Explicit command, watch mode, or on-demand?
9. How strict should validation be? Warnings vs errors?
10. Should the dependency graph include runtime relationships (delegations) or just static references?

### Runtime Integration

11. How does zen integrate with OpenCode's skill loading?
12. Should preprocessed output go to a `/skills` directory (dbt-style) or be generated on-demand?

### Validation

13. What benchmarks would validate "less prompt is better"?
14. What benchmarks would validate "LLM as runtime" is sufficient?

## Next Steps

See [ROADMAP.md](./ROADMAP.md) for implementation direction.
