# Control Flow

MDZ uses CAPS keywords for control flow to visually distinguish executable structure from prose content.

## For Loop

Iterate over a collection using the **collection operator** (`IN`):

<!-- mdz-snippet: docs/snippets/control-flow/for-loop.mdz -->

### With Destructuring

Unpack **tuples** during iteration using **destructuring**:

<!-- mdz-snippet: docs/snippets/control-flow/for-loop-destructuring.mdz -->

### Asynchronous Delegation

For parallel execution, use `ASYNC DELEGATE` inside a loop:

<!-- mdz-snippet: docs/snippets/control-flow/async-delegate.mdz -->

Use ASYNC DELEGATE when:

- Iterations are independent
- Order doesn't matter
- Maximum throughput is desired

## While Loop

Loop with a **condition**. The `DO` keyword delimits the condition (like `THEN` for `IF`):

<!-- mdz-snippet: docs/snippets/control-flow/while-loop.mdz -->

### Condition Types

Conditions can be:

- **Deterministic condition**: `$x < 5`, `$status = "active"`
- **Semantic condition**: `NOT /diminishing returns/` (LLM interprets)
- **Combined**: `NOT /complete/ AND $count < 10` (using **logical operators**)

## Conditional

Branch with `IF`/`THEN` and optional **else clause**:

<!-- mdz-snippet: docs/snippets/control-flow/conditional.mdz -->

### Multi-line Branches

<!-- mdz-snippet: docs/snippets/control-flow/multiline-conditional.mdz -->

### Comparison Operators

- `=` -- equality
- `!=` -- inequality
- `<`, `>` -- less than, greater than
- `<=`, `>=` -- less/greater than or equal

### Logical Operators

Use **logical operators** to combine conditions:

- `AND` -- both conditions must be true
- `OR` -- either condition can be true
- `NOT` -- negates a condition

## Nesting

Control flow can be nested. Blocks are closed with `END`:

<!-- mdz-snippet: docs/snippets/control-flow/nesting.mdz -->

## Break and Continue

Use `BREAK` and `CONTINUE` for early exit and skip within loops:

<!-- mdz-snippet: docs/snippets/control-flow/break-continue.mdz -->

BREAK and CONTINUE are valid in:

- FOR loops
- WHILE loops

They are **not** valid outside of loops (parser error).

## Semantic Conditions

**Semantic conditions** are natural language expressions that the LLM interprets. Use them when the condition requires understanding context:

<!-- mdz-snippet: docs/snippets/control-flow/semantic-conditions.mdz -->

## Composition Keywords

MDZ provides several keywords for composition:

### DELEGATE (Agent Delegation)

Use **DELEGATE** to spawn autonomous subagent tasks:

<!-- mdz-snippet: docs/snippets/control-flow/delegate.mdz -->

### USE (Skill Invocation)

Use **USE** to invoke a skill:

<!-- mdz-snippet: docs/snippets/control-flow/use.mdz -->

### EXECUTE (Tool Execution)

Use **EXECUTE** to run an external tool:

<!-- mdz-snippet: docs/snippets/control-flow/execute.mdz -->

### GOTO (Section Navigation)

Use **GOTO** to jump to a section anchor:

<!-- mdz-snippet: docs/snippets/control-flow/goto.mdz -->

See [Composition](/docs/composition) for more details on these keywords.

## Design Philosophy

- **CAPS Keywords** -- Visually distinct from prose
- **Explicit Termination** -- Always include bounds to prevent infinite loops
- **Mixed Conditions** -- Combine deterministic checks with semantic interpretation
- **Clear Indentation** -- Structure is visible at a glance
- **ASYNC DELEGATE** -- Enables concurrent execution
- **BREAK/CONTINUE** -- Enable early exit from loops
- **USE/EXECUTE/DELEGATE/GOTO** -- Composition keywords
