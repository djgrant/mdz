# Zen Language Specification v0.2

> A markdown extension language for multi-agent systems

## Overview

Zen extends markdown with constructs for expressing agent behaviors, composition, and orchestration patterns. The language is designed to be:

- **Readable** as natural prose
- **Parseable** by deterministic tools
- **Interpretable** by LLMs as executable instructions
- **Composable** through skill references and delegation

## Document Structure

A zen document is a valid markdown file with these extensions:

```
---
frontmatter (YAML)
---

# Heading

Body content with zen constructs
```

### Frontmatter Schema

Required and optional fields in the YAML frontmatter:

```yaml
---
name: skill-name              # Required: identifier (kebab-case)
description: When...          # Required: trigger description
uses:                         # Optional: skill dependencies
  - skill-a
  - skill-b
imports:                      # v0.2: Optional: explicit imports
  - path: "./skills/"
    skills: [simplify, work-packages]
  - path: "@zen/stdlib"
    alias:
      orchestrate-map-reduce: omr
---
```

The `description` field follows the pattern:
- **When**: trigger condition
- **Does**: what the skill accomplishes
- **Uses**: other skills it depends on (implicit in uses array)

### Import System (v0.2)

The `imports` field allows explicit control over skill resolution:

```yaml
imports:
  - path: "./local/"          # Local path or package
    skills: [skill-a, skill-b]  # Skills to import
  - path: "@zen/stdlib"       # Package reference
    alias:                    # Optional: aliases for long names
      orchestrate-map-reduce: omr
```

Import resolution:
1. Relative paths are resolved from the skill file location
2. Package references (starting with `@`) are resolved from the skill registry
3. Aliases allow shorter names in the document body

## Types

### Type Definitions

Types provide semantic hints about values. They are defined at the top of a skill, typically in a `## Types` section:

```
$TypeName = natural language description of what this type represents
```

Examples:
```
$Task = any task that an agent can execute
$Strategy = "accumulate" | "independent"
$ValidationResult = "progress" | "regression" | "plateau"
```

### Type Syntax

Types can be:

- **Semantic**: `$Task = any task that an agent can execute`
- **Enum**: `$Strategy = "accumulate" | "independent"`
- **Compound**: `($Task, $Strategy)` - a tuple
- **Array**: `$Task[]` or `($Task, $Strategy)[]`
- **Function**: `$Fn = $x => expression`

### Type References

Reference a type by its name with `$` prefix:

```
- $validator: $Task
- $transforms: ($Task, $Strategy)[]
```

### Built-in Types

The following types are implicitly available:

- `$FilePath` - a file system path
- `$String` - text content
- `$Number` - numeric value
- `$Boolean` - true or false

### Type Philosophy

Types in zen are **hints, not enforcement**:
- They document intent for humans
- They guide LLM interpretation
- They enable tooling (autocomplete, validation)
- They are NOT runtime-checked

## Variables

### Variable Declarations

Variables are declared with `$` prefix and optional type annotation:

```
$name: $Type = value
$name = value
```

Examples:
```
- $current: $FilePath = $SolutionPath(0)
- $iterations = 0
- $result: $ValidationResult
```

### Required Parameters (v0.2)

In WITH clauses, typed parameters without a default value are considered required:

```
Execute [[skill]] WITH:
  - $param: $Type = value     # Optional: has default
  - $required: $Task          # Required: no default
```

### Variable References

Reference a variable by its `$name`:

```
Check if $result satisfies $essence criteria.
```

### Variable Scope

Variables are scoped to:
1. The document (file-level)
2. A section (section-level, when declared within a section)
3. A control flow block (block-level)

### Lambda Expressions

Functions are defined using lambda syntax:

```
$FunctionName = $param => expression
$FunctionName = ($a, $b) => expression
```

Examples:
```
$SolutionPath = $n => `{~~relevant wp path}-candidate-{$n}.md`
```

Lambdas can include semantic markers and template literals.

## References

### Skill References

Reference another skill using wiki-link syntax:

```
[[skill-name]]
```

Example:
```
Execute [[orchestrate-map-reduce]] with the following parameters...
```

### Section References

Reference a section within a skill:

```
[[skill-name#section-name]]   # Section in another skill
[[#section-name]]             # Section in current skill
```

Section names are derived from headings by:
1. Converting to lowercase
2. Replacing spaces with hyphens
3. Removing special characters

Example:
```
Delegate with [[#validate-prompt]]
```

Where `## Validate Prompt` becomes `#validate-prompt`.

### Reference Resolution

At runtime:
- `[[skill]]` loads the referenced skill content
- `[[skill#section]]` loads only that section
- `[[#section]]` refers to a section in the current document

In compiled format:
- References may be inlined or converted to prose

## Semantic Markers

### Basic Semantic Marker

The `{~~content}` syntax marks content for LLM interpretation:

```
{~~appropriate location for this work package}
```

The LLM should determine the actual value based on context.

### Variable Interpolation

Variables are expanded BEFORE semantic interpretation:

```
{~~the path for candidate $n}
```

First `$n` is resolved (e.g., to `3`), then the LLM interprets "the path for candidate 3".

### Semantic Markers in Context

Semantic markers are valid in:
- Prose text
- Variable assignments
- Lambda expressions
- Control flow conditions (with caution)

```
- $path = {~~the most relevant file path}
- Write output to {~~appropriate location}
```

### Nested Semantics

**Nested semantic markers are NOT supported**:

```
# Invalid
{~~{~~inner content}}
```

This is a deliberate constraint to maintain clarity about what is being interpreted.

### Semantic Marker Compilation

In compiled format, `{~~content}` transforms to `(determine: content)`:

```
Source:   {~~appropriate location}
Compiled: (determine: appropriate location)
```

## Control Flow

### FOR EACH

Iterate over a collection:

```
FOR EACH $item IN $collection:
  - Process $item
  - Next step
```

With destructuring:
```
FOR EACH ($task, $strategy) IN $transforms:
  - Execute $task with $strategy
```

### PARALLEL FOR EACH (v0.2)

Iterate with concurrent execution:

```
PARALLEL FOR EACH $item IN $items:
  - Process $item independently
  - Results collected when all complete
```

Semantics:
- All iterations can execute concurrently
- Order of completion is not guaranteed
- Results are collected when all iterations complete
- Each iteration has its own scope

Use PARALLEL FOR EACH when:
- Iterations are independent
- Order doesn't matter
- Maximum throughput is desired

### WHILE

Loop with condition:

```
WHILE (condition AND $iterations < 5):
  - Perform iteration
  - Update state
```

Conditions can include:
- Variable comparisons: `$x < 5`
- Semantic conditions: `not diminishing returns` (LLM-interpreted)
- Logical operators: `AND`, `OR`, `NOT`

### IF THEN ELSE

Conditional branching:

```
IF ($condition) THEN:
  - Do this
ELSE:
  - Do that
```

Multi-line form:
```
IF $strategy = "accumulate" THEN:
  - Validate incrementally
  - Update on success
ELSE:
  - Collect all candidates
  - Validate at end
```

### BREAK and CONTINUE (v0.2)

Early exit and skip in loops:

```
FOR EACH $item IN $items:
  - IF $item.invalid THEN:
    - CONTINUE              # Skip to next iteration
  - IF $found = true THEN:
    - BREAK                 # Exit the loop
  - Process normally
```

BREAK and CONTINUE are valid in:
- FOR EACH loops
- PARALLEL FOR EACH loops
- WHILE loops

They are NOT valid outside of loops (parser error).

### Control Flow Nesting

Control flow can be nested:

```
FOR EACH $task IN $tasks:
  - Process $task
  - IF ($task.priority = "high") THEN:
    - Expedite processing
```

Indentation indicates nesting level.

### Control Flow Philosophy

- CAPS keywords are visually distinct
- Conditions can mix deterministic and semantic
- Termination should be explicit (avoid infinite loops)
- PARALLEL enables concurrent execution (v0.2)
- BREAK/CONTINUE enable early exit (v0.2)

## Composition

### Skill Delegation

Skills compose through delegation:

```
Execute [[orchestrate-map-reduce]] WITH:
  - $transforms = [("Apply heuristic", "accumulate")]
  - $validator = [[#validate-essence]]
  - $return = "Report findings"
```

### Parameter Passing

Parameters are passed using `WITH:` syntax:

```
Delegate to [[skill-name]] WITH:
  - $param1 = value1
  - $param2 = value2
```

With typed parameters (v0.2):
```
Execute [[skill]] WITH:
  - $param: $Type = value     # Optional with default
  - $required: $Task          # Required (no default)
```

Or inline for simple cases:
```
Use [[#section]] passing $current and $next
```

### Section Inclusion

Include a section as a prompt or sub-task:

```
Delegate to sub-agent with [[#build-prompt]]
```

The section content becomes the sub-agent's instructions.

### Dependency Declaration

Declare dependencies in frontmatter:

```yaml
uses:
  - orchestrate
  - work-packages
```

This enables:
- Load order optimization
- Circular dependency detection
- Tooling autocomplete

## Document Sections

### Conventional Sections

While not required, these sections are conventional:

```markdown
## Types
Type definitions

## Input
Input parameter declarations

## Context
Contextual variable declarations

## Workflow
Main execution steps

## [Section Name]
Reusable prompts/sub-sections
```

### Workflow Structure

Workflows typically follow:
1. Setup phase (create work packages, initialize state)
2. Execution phase (loops, delegations, transformations)
3. Completion phase (collect results, report)

## Compilation

### Two-Layer Model

Zen uses a two-layer model:

- **Source format**: Human-authored, references other skills, uses compact syntax
- **Compiled format**: Flattened, references resolved, optimized for LLM consumption

### Compilation Transformations

1. **Type expansion**: `$Task` → `Task (any task that an agent can execute)`
2. **Reference resolution**: `[[skill]]` → resolved content or `[skill]`
3. **Semantic marker transformation**: `{~~x}` → `(determine: x)`
4. **Variable inlining**: Where statically determinable
5. **Import resolution**: Aliases expanded to full names (v0.2)

### Source Maps

The compiler maintains source maps enabling:
- Error messages with source locations
- Debugging (trace compiled → source)
- IDE integration

### Compilation Example

Source:
```
Execute [[orchestrate-map-reduce]] with $validator
```

Compiled:
```
Execute [orchestrate-map-reduce] with validator (any task that an agent can execute)
```

## Runtime Semantics

### Execution Model

A zen skill executes as:
1. LLM receives compiled skill content
2. LLM interprets control flow and delegations
3. Tool calls implement side effects (file writes, sub-agent creation)
4. Work packages track state between executions

### Semantic Interpretation

`{~~content}` is interpreted by the LLM:
- Consider current context
- Derive appropriate concrete value
- The result replaces the marker in execution

### Error Handling

Errors in zen are handled through:
1. Explicit checks: `IF ($result = "regression") THEN...`
2. Semantic resilience: LLMs adapt to unexpected states
3. Work package logging: State is persisted for debugging

v0.2 does not define exception mechanisms.

## Tooling Requirements

### Parser Requirements

A compliant parser must extract:
- Frontmatter fields (including imports in v0.2)
- Type definitions
- Variable declarations
- Skill and section references
- Semantic markers
- Control flow constructs (including PARALLEL, BREAK, CONTINUE in v0.2)

### LSP Features

The syntax supports:
- **Go-to-definition**: For `[[references]]` and `$variables`
- **Autocomplete**: After `[[`, `$`, and `{~~`
- **Hover**: Show type definitions
- **Diagnostics**: Undefined references, unused variables, BREAK/CONTINUE outside loops

### Highlighting

Syntax highlighting should distinguish:
- Frontmatter (YAML)
- Headings (markdown)
- Types (`$TypeName`)
- Variables (`$varName`)
- References (`[[...]]`)
- Semantic markers (`{~~...}`)
- Control flow keywords (`FOR EACH`, `PARALLEL FOR EACH`, `WHILE`, `IF`, `THEN`, `ELSE`, `BREAK`, `CONTINUE`)

## Grammar Summary

### Tokens

```
FRONTMATTER     = '---\n' YAML '\n---'
TYPE_DEF        = '$' UPPER_IDENT '=' /.+/
VAR_DECL        = '$' IDENT (':' TYPE)? '=' EXPR
VAR_REF         = '$' IDENT
SKILL_REF       = '[[' IDENT ']]'
SECTION_REF     = '[[' IDENT? '#' IDENT ']]'
SEMANTIC        = '{~~' /[^}]+/ '}'
FOR_EACH        = 'FOR EACH' PATTERN 'IN' EXPR ':'
PARALLEL_FOR    = 'PARALLEL FOR EACH' PATTERN 'IN' EXPR ':'  # v0.2
WHILE           = 'WHILE' '(' CONDITION '):'
IF_THEN         = 'IF' '(' CONDITION ')' 'THEN:'
ELSE            = 'ELSE:'
BREAK           = 'BREAK'                                     # v0.2
CONTINUE        = 'CONTINUE'                                  # v0.2
LAMBDA          = '$' IDENT '=' PARAMS '=>' EXPR
```

### Identifier Patterns

```
UPPER_IDENT     = /[A-Z][a-zA-Z0-9]*/
IDENT           = /[a-zA-Z][a-zA-Z0-9-]*/
```

## Appendix: Design Decisions

### Why CAPS Keywords?

- Visually distinct from prose
- No conflict with markdown syntax
- Familiar (SQL, BASIC heritage)
- Simple regex parsing

### Why {~~} for Semantics?

- Unique syntax not used elsewhere
- Clear visual boundary
- `~~` suggests "approximately" or "interpret this"
- Braces group the content naturally

### Why $variables?

- Visual distinction from prose words
- Familiar (shell, PHP, many template languages)
- Enables tooling (easy to detect)
- Natural for interpolation

### Why [[wiki-links]]?

- Familiar (Wikipedia, Obsidian, Notion)
- Distinct from markdown links
- Enables internal linking
- Natural for skill references

### Why Two-Layer Model?

- Separates human authoring from LLM consumption
- Enables optimization without changing source
- Supports debugging via source maps
- Future-proofs against LLM changes

### Why PARALLEL FOR EACH? (v0.2)

- Multi-agent orchestration requires concurrency
- Simple syntax extension (PARALLEL prefix)
- Clear semantics (independent iterations)
- Enables fan-out patterns

### Why BREAK/CONTINUE? (v0.2)

- Familiar from imperative languages
- Useful for efficiency (early exit)
- Clear control flow intent
- Reduces nesting depth

## Version History

- **v0.2** (2026-01-03): Added PARALLEL FOR EACH, imports, typed parameters, BREAK/CONTINUE
- **v0.1** (2026-01-03): Initial specification based on Phase 1-2 validation
