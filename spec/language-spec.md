# MDZ Language Specification v0.10

> A markdown extension language for multi-agent systems

## Overview

MDZ extends markdown with constructs for expressing agent behaviors, composition, and orchestration patterns. The language is designed to be:

- **Readable** as natural prose
- **Parseable** by deterministic tools
- **Interpretable** by LLMs as executable instructions
- **Composable** through skill references and delegation

**Core principle: The LLM sees what you write.** There is no transformation layer between source and execution. Tooling validates and extracts metadata, but the source document is the execution format.

## Document Structure

An MDZ document is a valid markdown file with these extensions:

```
---
frontmatter (YAML)
---

# Heading

Body content with MDZ constructs
```

### Frontmatter Schema

Required fields in the YAML frontmatter:

```yaml
---
name: skill-name              # Required: identifier (kebab-case)
description: When...          # Required: trigger description
---
```

The `description` field follows the pattern:
- **When**: trigger condition
- **Does**: what the skill accomplishes

**v0.9 Change**: Types, input parameters, and context declarations now live in frontmatter rather than dedicated document sections.

Optional declaration fields (v0.9):

```yaml
---
name: skill-name
description: When triggered, does X

types:
  Task: any task that an agent can execute
  Strategy: "accumulate" | "independent"
  ValidationResult: "progress" | "regression" | "plateau"

input:
  problem: $String                    # Required parameter
  maxIterations: $Number = 5          # Optional with default
  strategy: $Strategy = "accumulate"  # Optional with enum default

context:
  currentFile: $FilePath              # Context variable
  workPackage: /relevant work package path/
---
```

**v0.8 Note**: Dependencies are inferred from link statements (`DELEGATE`, `USE`, `EXECUTE`) in the document body.

### Frontmatter Declaration Fields (v0.9)

#### types

Type definitions that were previously in `## Types` sections:

```yaml
types:
  Task: any task that an agent can execute      # Semantic type
  Strategy: "accumulate" | "independent"        # Enum type
  Pair: ($Task, $Strategy)                      # Compound type
```

Type names are declared without `$` prefix in frontmatter. They are referenced with `$` prefix in the document body.

#### input

Input parameter declarations that were previously in `## Input` sections:

```yaml
input:
  problem: $String                    # Required (no default)
  maxIterations: $Number = 5          # Optional with literal default
  items: $Task[] = []                 # Optional with array default
```

Parameter rules:
- **Required**: `name: $Type` (no `=`)
- **Optional**: `name: $Type = literal_value`

#### context

Context variable declarations that were previously in `## Context` sections:

```yaml
context:
  currentFile: $FilePath
  workPackage: /relevant work package/
```

Context variables are populated by the runtime environment.

## Types

### Type Definitions

Types provide semantic hints about values. In v0.9, they are defined in frontmatter:

```yaml
types:
  Task: any task that an agent can execute
  Strategy: "accumulate" | "independent"
  ValidationResult: "progress" | "regression" | "plateau"
```

**v0.9 Change**: Type definitions moved from `## Types` document sections to frontmatter `types:` field. This keeps all declarations in one place and separates metadata from executable content.

### Type Syntax

Types can be:

- **Semantic**: `Task: any task that an agent can execute`
- **Enum**: `Strategy: "accumulate" | "independent"`
- **Compound**: `($Task, $Strategy)` - a tuple
- **Array**: `$Task[]` or `($Task, $Strategy)[]`
- **Function**: `$Fn = $x => expression`

### Type References

Reference a type by its name with `$` prefix:

```
$validator: $Task
$transforms: ($Task, $Strategy)[]
```

### Built-in Types

The following types are implicitly available:

- `$FilePath` - a file system path
- `$String` - text content
- `$Number` - numeric value
- `$Boolean` - true or false

### Type Philosophy

Types in MDZ are **hints, not enforcement**:
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
$current: $FilePath = $SolutionPath(0)
$iterations = 0
$result: $ValidationResult
```

### Required Parameters (v0.2)

In WITH clauses, typed parameters without a default value are considered required:

```
USE ~/skill/x TO /task/:
  param: $Type = value     # Optional with default
  required: $Task          # Required (no default)
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
$SolutionPath = $n => `relevant wp path-candidate-${n}.md`
```

Lambdas can include template literals.

### Push Operator (v0.9)

The `<<` operator appends a value to an array:

```
$array << value
```

Examples:
```
$results << $currentResult
$candidates << the winning solution
$errors << $error
```

The push operator is used to collect values during iteration:

```
FOR $item IN $items
  $processed << /process $item/
END
```

## Links and Anchors

MDZ v0.8 uses link-based references with the `~/` prefix. Links identify external resources (agents, skills, tools) while anchors reference sections in the current document.

### Link Syntax

Links use a path-based syntax with folder conventions:

```
~/agent/name      → Agent link (resolves to ./agent/name.mdz)
~/skill/name      → Skill link (resolves to ./skill/name.mdz)
~/tool/name       → Tool link (resolves to external tool or ./tool/name.mdz)
~/skill/name#sec  → Section in another skill
```

The `~/` prefix is reminiscent of Unix home directory but represents the skill root.

### Folder Conventions

Links follow folder conventions to distinguish resource types:

| Prefix | Resource Type | Resolution |
|--------|---------------|------------|
| `~/agent/` | Agent | `./agent/{name}.mdz` |
| `~/skill/` | Skill | `./skill/{name}.mdz` |
| `~/tool/` | Tool | External tool or `./tool/{name}.mdz` |

Examples:
```
~/agent/explorer       → The explorer agent
~/skill/validator      → The validator skill  
~/tool/browser         → The browser tool
~/skill/omr#workflow   → The workflow section in the omr skill
```

### Anchors

Anchors reference sections in the current document:

```
#section-name
```

Section names are derived from headings by:
1. Converting to lowercase
2. Replacing spaces with hyphens
3. Removing special characters

Example:
```
GOTO #validate-prompt
```

Where `## Validate Prompt` becomes `#validate-prompt`.

### Link Resolution

At runtime:
- `~/skill/name` loads the skill content
- `~/skill/name#section` loads only that section
- `#section` refers to a section in the current document
- `~/agent/name` identifies an agent for delegation
- `~/tool/name` identifies a tool for execution

Links are resolved by the runtime environment. The tooling validates that link paths follow conventions and that anchors reference existing sections.

### Dependency Inference

**v0.8 Change**: Dependencies are inferred from link statements, not declared in frontmatter.

The compiler extracts dependencies by scanning for:
- `DELEGATE ... TO ~/agent/x` → agent dependency
- `USE ~/skill/x TO ...` → skill dependency
- `EXECUTE ~/tool/x TO ...` → tool dependency

This eliminates redundant declaration and ensures dependencies stay in sync with actual usage.

## Agents (v0.8)

Agents are independent subagents that can be spawned to handle delegated tasks. Unlike skills which run in the current context, agents are autonomous entities with their own execution context.

### Referencing Agents

Agents are referenced using link syntax with the `agent/` folder prefix:

```
~/agent/explorer
~/agent/analyzer
~/agent/reviewer
```

Agents are used with the `DELEGATE` statement:

```
DELEGATE /find related patterns/ TO ~/agent/explorer
```

Or with a context template:

```
DELEGATE /analyze these findings/ TO ~/agent/analyzer WITH #analysis-context
```

### Agent vs Skill

The distinction between agents and skills is fundamental:

| Aspect | Skill (`USE ~/skill/x`) | Agent (`DELEGATE TO ~/agent/x`) |
|--------|-------------------------|--------------------------------|
| Execution | In current context | Independent subagent |
| Control | Sequential, returns | Fire-and-forget or await |
| State | Shared with caller | Isolated |
| Use case | Reusable logic | Parallel work, delegation |

**Use skills** when you want to compose reusable logic that executes as part of the current workflow.

**Use agents** when you want to spawn an independent worker that can operate in parallel or handle a distinct subtask.

### Agent Capabilities

The MDZ specification only defines how to reference agents—the runtime determines what each agent can do.

Common patterns:
- **Explorer agents**: Search and discovery tasks
- **Analyzer agents**: Deep analysis of specific areas
- **Reviewer agents**: Validation and review tasks

## Semantic Spans

MDZ treats prose as the default. Semantic interpretation is positional: tooling infers intent based on where text appears.

### Instruction Spans

Instruction spans appear after control keywords and targets:

```
DELEGATE process item TO ~/agent/worker
USE ~/skill/summarize TO summarize the input
EXECUTE ~/tool/convert TO transform the document
DO normalize the data
```

### Variable Interpolation

Variables are expanded BEFORE semantic interpretation:

```
DELEGATE process item $n TO ~/agent/worker
```

First `$n` is resolved, then the LLM interprets the instruction.

### Inferred Variables

Use `$/name/` to declare a variable whose value is inferred by the LLM at runtime:

```
$/the user's primary goal/
$/current file path based on context/
```

Inferred variables combine variable declaration with semantic interpretation. The LLM derives the value based on context.

### Semantic Type Annotations

Use unquoted prose as a type annotation to describe what a value should be:

```
$target: the file to modify = "default.txt"
$context: relevant background information
```

This is more flexible than reference types (`$Type`) when you need to describe the expected value semantically rather than reference a defined type.

## Control Flow

### FOR

Iterate over a collection:

```
FOR $item IN $collection
  DO process $item
  DO next step
END
```

With destructuring:
```
FOR ($task, $strategy) IN $transforms
  DO execute $task with $strategy
END
```

### WHILE

Loop with condition. The `DO` keyword acts as the condition delimiter:

```
WHILE diminishing returns AND $iterations < 5 DO
  DO perform iteration
  DO update state
END
```

Conditions can include:
- Variable comparisons: `$x < 5`
- Semantic conditions: `NOT diminishing returns` (LLM-interpreted, positional)
- Logical operators: `AND`, `OR`, `NOT`

Semantic conditions are used when a condition does not match deterministic grammar.

### IF THEN ELSE

Conditional branching. The `THEN` keyword acts as the condition delimiter:

```
IF $condition THEN
  DO do this
ELSE
  DO do that
END
```

With semantic conditions:
```
IF any critical findings THEN
  DO request changes
END
```

### BREAK and CONTINUE (v0.2)

Early exit and skip in loops:

```
FOR $item IN $items
  IF $item.invalid THEN
    CONTINUE                # Skip to next iteration
  END
  IF $found = true THEN
    BREAK                   # Exit the loop
  END
  DO /process normally/
END
```

### RETURN (v0.9)

Exit a section or loop iteration with an optional value:

```
RETURN [expression]
```

RETURN is valid only at the end of a section or as the last statement in a loop iteration:

```
## Validate Input

IF $input.empty THEN
  RETURN "invalid"
END
DO /process $input/
RETURN "valid"
```

In loops, RETURN exits the current iteration (similar to yielding a value):

```
FOR $item IN $items
  DO /process $item/
  RETURN $item.result      # Yield result for this iteration
END
```

**Implicit return**: A section without an explicit RETURN completes naturally. The absence of RETURN means natural completion, not an error.

### DO Statement (v0.9, v0.10)

The `DO` keyword introduces a standalone instruction, either single-line or as a block:

```
DO /prose instruction/
```

Examples:
```
DO /analyze the current state and determine next steps/
DO /summarize findings into a report/

DO
  /summarize findings/
  /return a report/
END
```

**Note**: This is distinct from `WHILE...DO` and `FOR...DO` where `DO` acts as an optional delimiter. Single-line `DO` is only valid at top-level (outside fenced code blocks).

## Statements (v0.8+)

MDZ v0.8 introduces four key statement types for working with external resources: `DELEGATE`, `USE`, `EXECUTE`, and `GOTO`.

### DELEGATE - Spawn Agent (v0.9)

The `DELEGATE` keyword spawns a subagent to handle a task. In v0.9, the `TO` target is optional and `ASYNC`/`AWAIT` modifiers control execution:

```
[ASYNC|AWAIT] DELEGATE [/task/] [TO ~/agent/name] [WITH context]
```

Basic forms:

```
DELEGATE /task description/ TO ~/agent/name
DELEGATE /task description/                    # Target inferred from context (v0.9)
DELEGATE TO ~/agent/name                       # Task in WITH block
```

With modifiers (v0.9):

```
ASYNC DELEGATE /explore the codebase/ TO ~/agent/explorer   # Fire-and-forget
AWAIT DELEGATE /analyze findings/ TO ~/agent/analyzer       # Wait for result
```

- **ASYNC**: Fire-and-forget. The delegation starts but execution continues immediately without waiting.
- **AWAIT**: Wait for result. Execution pauses until the delegated task completes and returns.
- **No modifier**: Default behavior determined by runtime (typically AWAIT for explicit TO, ASYNC for inferred).

With a context template (passes a section as context):

```
DELEGATE /explore the codebase/ TO ~/agent/explorer WITH #context-template
```

With inline parameters (v0.9 syntax):

```
DELEGATE /analyze file for issues/ TO ~/agent/code-analyzer WITH:
  filename: $filename
  diff: $diff
  learnings: applicable learnings
```

With task in parameters:

```
DELEGATE TO ~/agent/attacker WITH:
  proposal: $proposal
  vector: $vector
  task: /find genuine flaws/
```

### USE - Follow Skill

The `USE` keyword loads and follows a skill's instructions:

```
USE ~/skill/validator TO /validate the current state/
```

### EXECUTE - Invoke Tool

The `EXECUTE` keyword invokes an external tool:

```
EXECUTE ~/tool/browser TO /take a screenshot of the page/
EXECUTE ~/tool/database TO /query user records/
```

### GOTO - Control Flow

The `GOTO` keyword jumps to a section in the current document:

```
GOTO #validation-step
GOTO #error-handler
```

### Statement Comparison

| Statement | Purpose | Target | Execution |
|-----------|---------|--------|-----------|
| `DELEGATE` | Spawn agent | `~/agent/x` (optional v0.9) | Independent (ASYNC/AWAIT) |
| `USE` | Follow skill | `~/skill/x` | In context |
| `EXECUTE` | Invoke tool | `~/tool/x` | External |
| `GOTO` | Jump to section | `#section` | Current doc |

## Composition

This section covers skill composition using `USE` and parameter passing.

### Skill Composition

Skills compose through the `USE` statement:

```
USE ~/skill/orchestrate-map-reduce TO /apply transforms/:
  transforms: [("Apply heuristic", "accumulate")]
  validator: #validate-essence
  return: "Report findings"
```

### Parameter Passing (v0.9)

Parameters are passed using colon syntax without `$` prefix or `-` list marker:

```
USE ~/skill/name TO /task/:
  param1: value1
  param2: value2
```

**v0.9 Change**: Parameter syntax simplified from `- $param = value` to `param: value`. The colon-based syntax is cleaner and aligns with YAML conventions.

### Section Inclusion

Pass a section as context using the `WITH` clause:

```
DELEGATE /task/ TO ~/agent/explorer WITH #context-template
```

The section content becomes part of the agent's instructions.

## Document Sections

### Conventional Sections

The following sections are conventional for organizing skill content:

```markdown
## Workflow
Main execution steps

## [Section Name]
Reusable prompts/sub-sections
```

**v0.9 Change**: The `## Types`, `## Input`, and `## Context` sections are no longer used. These declarations have moved to frontmatter fields (`types:`, `input:`, `context:`). This separates metadata from executable content.

### Workflow Structure

Workflows typically follow:
1. Setup phase (create work packages, initialize state)
2. Execution phase (loops, delegations, transformations)
3. Completion phase (collect results, report)

## Structural Rules (v0.10)

### END Rule

Blocks are closed with `END`, and indentation is cosmetic only:

```
FOR $item IN $items
  DO /process $item/
  DO /next step/
END
```

This applies to:
- Control flow statements (`FOR`, `WHILE`, `IF`, `ELSE IF`, `ELSE`)
- `DO` blocks

### Keyword Placement Rule

CAPS keywords must appear at the start of a line (optionally indented):

```
FOR $item IN $items             # Valid: line start
  IF $condition THEN            # Valid: indented position
    BREAK                       # Valid: indented position
  END
END
```

Keywords embedded in prose are not recognized as control structures:

```
The FOR keyword is used for iteration.    # "FOR" is prose, not a keyword
```

## Validation

### Overview

MDZ tooling validates source documents without transforming them. The compiler:
- Parses the document into an AST
- Extracts metadata (types, variables, references, sections)
- Builds a dependency graph
- Reports errors and warnings

**Source = Output.** The compiled output is the original source, unchanged.

### What Tooling Checks

1. **Frontmatter declarations** - Validates types, input, context fields (v0.9)
2. **Type references** - Warns when a type annotation references an undefined type
3. **Link resolution** - Errors when link path doesn't resolve to valid resource
4. **Anchor references** - Errors when `#section` references a non-existent section
5. **Syntax errors** - Errors for malformed control flow, unterminated constructs, etc.
6. **Scope** - Tracks variable definitions (informational)
7. **Dependency cycles** - Detects circular dependencies across skills
8. **Link conventions** - Warns when link doesn't follow folder conventions (agent/, skill/, tool/)
9. **RETURN placement** - Errors when RETURN is not at end of section/iteration (v0.9)
10. **Keyword placement** - Warns when keywords are not at line start (v0.10)

### Error Codes

| Code | Severity | Description |
|------|----------|-------------|
| E001-E007 | Error | Parse errors (syntax) |
| E008 | Warning | Type not defined in document or frontmatter |
| E009 | Error | Link path doesn't resolve |
| E010 | Error | Anchor reference broken |
| E011 | Error | BREAK/CONTINUE outside loop |
| E012 | Error | Dependency cycle detected |
| E013 | Error | RETURN not at end of section/iteration (v0.9) |
| W002 | Warning | Link doesn't follow folder conventions |
| W003 | Warning | Keyword not at line start (v0.10) |

### Dependency Graph

The compiler extracts a dependency graph showing:
- **Nodes**: Skills this document depends on
- **Edges**: Relationship type (uses, reference)
- **Cycles**: Circular dependency chains (if any)

This enables build tools to:
- Order skill loading
- Detect problematic dependencies
- Visualize system architecture

## Runtime Semantics

### Execution Model

An MDZ skill executes as:
1. LLM receives skill content (as authored)
2. LLM interprets control flow and delegations
3. Tool calls implement side effects (file writes, sub-agent creation)
4. Work packages track state between executions

### Semantic Interpretation

Instruction spans and semantic conditions are interpreted by the LLM:
- Consider current context
- Derive appropriate concrete value
- The result replaces the semantic span in execution

### Error Handling

Errors in MDZ are handled through:
1. Explicit checks: `IF ($result = "regression") THEN...`
2. Semantic resilience: LLMs adapt to unexpected states
3. Work package logging: State is persisted for debugging

v0.9 does not define exception mechanisms.

## Tooling Requirements

### Parser Requirements

A compliant parser must extract:
- Frontmatter fields (name, description, types, input, context)
- Type definitions (from frontmatter)
- Variable declarations
- Links (`~/path/to/resource`) and anchors (`#section`)
- Instruction spans, semantic conditions, inferred variables
- Control flow constructs (including BREAK, CONTINUE, RETURN, DELEGATE, USE, EXECUTE, GOTO, DO)

### Validator Requirements

A compliant validator must:
- Report syntax errors with location
- Validate frontmatter declaration fields (types, input, context)
- Check type reference validity
- Check link path resolution
- Check anchor reference validity
- Build dependency graph from link statements
- Detect dependency cycles
- Validate RETURN placement (end of section/iteration only)
- Validate keyword placement (line start)

### LSP Features

The syntax supports:
- **Go-to-definition**: For `~/links`, `#anchors`, `$variables`
- **Autocomplete**: After `~/`, `#`, `$`, `$/`, `DELEGATE ... TO`, `USE`, `EXECUTE`, `GOTO`, `ASYNC`, `AWAIT`
- **Hover**: Show type definitions, link targets, section content
- **Diagnostics**: Unresolved links, broken anchors, unused variables, BREAK/CONTINUE outside loops, invalid RETURN placement

### Highlighting

Syntax highlighting should distinguish:
- Frontmatter (YAML)
- Headings (markdown)
- Types (`$TypeName`)
- Variables (`$varName`)
- Links (`~/path/to/resource`)
- Anchors (`#section`)
- Instruction spans / semantic conditions (positional)
- Inferred variables (`$/name/`)
- Control flow keywords (`FOR`, `WHILE`, `DO`, `IF`, `THEN`, `ELSE`, `END`, `BREAK`, `CONTINUE`, `RETURN`, `DELEGATE`, `TO`, `USE`, `EXECUTE`, `GOTO`, `WITH`, `ASYNC`, `AWAIT`)
- Operators (`<<`)

## Grouping and Braces

MDZ uses three types of brackets, each with specific purposes. This section documents when each is required vs optional.

### Parentheses `()`

Parentheses serve four distinct purposes in MDZ:

#### 1. WHILE conditions — NO PARENS REQUIRED

The `DO` keyword delimits WHILE conditions (like `THEN` for `IF`):

```
WHILE $iterations < 5 DO             # Valid
WHILE condition AND $x > 0 DO        # Valid
WHILE NOT diminishing returns DO   # Valid (semantic condition)
```

Parentheses are optional for grouping complex conditions.

#### 2. Tuple/compound types and destructuring patterns — REQUIRED for multiple elements

```
# Type definitions
$Pair: ($Task, $Strategy)             # Required for compound types
$Task[]                               # No parens for single type

# FOR destructuring
FOR ($item, $priority) IN $pairs      # Required for destructuring
FOR $item IN $items                   # No parens for single variable
```

#### 3. Lambda parameters — REQUIRED for multiple parameters

```
$fn = $x => expression                # Single param: no parens needed
$fn = ($a, $b) => expression          # Multiple params: parens required
```

#### 4. Expression grouping — OPTIONAL but recommended for clarity

Parentheses can group sub-expressions to control precedence or improve readability:

```
IF ($a = 1) AND ($b = 2) THEN        # Optional but clear
IF $a = 1 AND $b = 2 THEN            # Also valid, uses precedence
IF (($a AND $b) OR $c) THEN          # Grouping overrides precedence
```

#### 5. IF conditions — OPTIONAL

The IF statement does **not** require parentheses around conditions:

```
IF $result = "progress" THEN         # Valid - no parens
IF ($result = "progress") THEN       # Valid - with parens
IF /condition/ AND /other/ THEN      # Valid - semantic condition
```

Both IF and WHILE use keyword delimiters (`THEN` and `DO` respectively), so parentheses are optional for both.

#### 6. Function calls — REQUIRED

```
$path(0)                              # Required
$fn($a, $b)                           # Required
```

### Square Brackets `[]`

Square brackets are used for arrays only:

#### Array types and literals

```
# Array type suffix
$Task[]                               # Array of Task
($Task, $Strategy)[]                  # Array of tuples

# Array literals  
$items = [1, 2, 3]
$transforms = [("task1", "strategy1"), ("task2", "strategy2")]

# Arrays of references
$agents = [~/agent/architect, ~/agent/reviewer]
```

### Curly Braces `{}`

Curly braces are used only for template interpolation:

#### Template interpolation (inside backticks only)

```
$path = $n => `output-${n}.md`        # ${} inside template literal
```

Note: MDZ does **not** use `{}` for code blocks (blocks are closed with `END`).

### Forward Slashes `/`

Forward slashes are reserved for inferred variables:

#### Inferred variables

```
$/the user's primary intent/          # Variable with LLM-derived value
$/relevant context from history/      # Value inferred at runtime
```

### Double Angle Brackets `<<` (v0.9)

The push operator appends values to arrays:

```
$results << $value                    # Append value to results array
```

### Operator Precedence

From highest to lowest:

1. **Grouping**: `( )` — parenthesized expressions
2. **Member access**: `.` — property access like `$item.property`
3. **Function call**: `()` — invocation like `$fn($x)`
4. **Comparison**: `=`, `!=`, `<`, `>`, `<=`, `>=`
5. **Logical NOT**: `NOT` — unary negation
6. **Logical AND**: `AND` — conjunction
7. **Logical OR**: `OR` — disjunction
8. **Push**: `<<` — array append (v0.9)
9. **Lambda arrow**: `=>` — binds loosest

#### Precedence Examples

```
# These are equivalent:
IF $a AND $b OR $c THEN
IF ($a AND $b) OR $c THEN            # AND binds tighter than OR

# This is different:
IF $a AND ($b OR $c) THEN            # Parens override precedence

# Comparison binds tighter than logical:
IF $x = 1 AND $y = 2 THEN
IF ($x = 1) AND ($y = 2) THEN        # Same meaning
```

### Quick Reference

| Construct | Parens Required? | Example |
|-----------|-----------------|---------|
| WHILE condition | No | `WHILE $x < 5 DO` |
| IF condition | No | `IF $x = 1 THEN` |
| FOR single var | No | `FOR $item IN $list` |
| FOR destructure | **Yes** | `FOR ($a, $b) IN $pairs` |
| Lambda single param | No | `$x => expr` |
| Lambda multi params | **Yes** | `($a, $b) => expr` |
| Function call | **Yes** | `$fn($x)` |
| Compound type | **Yes** | `($A, $B)` |
| Expression grouping | No | `($a AND $b) OR $c` |

## Grammar Summary

### Tokens

```
FRONTMATTER     = '---\n' YAML '\n---'
FM_TYPES        = 'types:' YAML_BLOCK                          <!-- v0.9 -->
FM_INPUT        = 'input:' YAML_BLOCK                          <!-- v0.9 -->
FM_CONTEXT      = 'context:' YAML_BLOCK                        <!-- v0.9 -->
TYPE_DEF        = '$' UPPER_IDENT ':' /.+/
VAR_DECL        = '$' IDENT (':' TYPE)? '=' EXPR
VAR_REF         = '$' IDENT
PUSH            = '$' IDENT '<<' EXPR                          <!-- v0.9 -->
LINK            = '~/' PATH ('#' IDENT)?
ANCHOR          = '#' IDENT
PATH            = IDENT ('/' IDENT)*
INFERRED_VAR    = '$/' /[^\/\n]+/ '/'
FOR             = 'FOR' PATTERN 'IN' EXPR ['DO']
WHILE           = 'WHILE' CONDITION ['DO']
IF_THEN         = 'IF' CONDITION ['THEN']
ELSE_IF         = 'ELSE IF' CONDITION ['THEN']
ELSE            = 'ELSE'
END             = 'END'
BREAK           = 'BREAK'
CONTINUE        = 'CONTINUE'
RETURN          = 'RETURN' EXPR?                               <!-- v0.9 -->
DO_STMT         = 'DO' INSTRUCTION | 'DO' BLOCK 'END'          <!-- v0.9, v0.10 -->
DELEGATE        = ['ASYNC'|'AWAIT'] 'DELEGATE' [INSTRUCTION] ['TO' LINK] ['WITH' (ANCHOR | ':' PARAMS)]  <!-- v0.9 -->
USE             = 'USE' LINK 'TO' INSTRUCTION (':' PARAMS)?
EXECUTE         = 'EXECUTE' LINK 'TO' INSTRUCTION
GOTO            = 'GOTO' ANCHOR
LAMBDA          = '$' IDENT '=' PARAMS '=>' EXPR
WITH_PARAM      = IDENT ':' EXPR                               <!-- v0.9 -->
```

### Identifier Patterns

```
UPPER_IDENT     = /[A-Z][a-zA-Z0-9]*/
IDENT           = /[a-zA-Z][a-zA-Z0-9-]*/
PATH            = /[a-z][a-z0-9-]*(\/[a-z][a-z0-9-]*)*/
```

## Appendix: Design Decisions

### Why CAPS Keywords?

- Visually distinct from prose
- No conflict with markdown syntax
- Familiar (SQL, BASIC heritage)
- Simple regex parsing

### Why Positional Semantics?

- Prose is the default; instruction spans are positional
- Removes the need for a general-purpose escape hatch
- Keeps the "code + prose" mental model consistent
- Tooling can infer intent from keyword placement

### Why $/.../ for Inferred Variables?

- Compact inline declaration for inferred values
- Distinct enough to avoid ambiguity in prose
- Avoids boilerplate when a variable is only needed once

### Why $variables?

- Visual distinction from prose words
- Familiar (shell, PHP, many template languages)
- Enables tooling (easy to detect)
- Natural for interpolation

### Why Link-Based References? (v0.8)

The `~/path/to/resource` syntax was chosen over sigil-based references for:

- **Path familiarity**: `~/` evokes Unix paths, familiar to developers
- **Folder conventions**: `~/agent/x`, `~/skill/y`, `~/tool/z` make resource type visible in path
- **Scalability**: Paths can organize resources in hierarchies (`~/skill/auth/validator`)
- **Resolution clarity**: Paths map directly to file system or registry lookup
- **Section suffix**: `~/skill/x#section` cleanly combines path and anchor

**Previous syntax (v0.7)**: `(@agent)`, `(~skill)`, `(#section)`, `(!tool)`

The sigil-based syntax required learning four different sigils. The link-based approach uses a single `~/` prefix with folder conventions, reducing cognitive load while maintaining type clarity.

### Why Infer Dependencies? (v0.8)

Dependencies are now extracted from statements rather than declared in frontmatter:

- **DRY principle**: No redundant declarations that can get out of sync
- **Automatic accuracy**: Dependencies always match actual usage
- **Simpler frontmatter**: Only name and description required
- **Better tooling**: Compiler can extract exact dependency graph from code

**Previous approach (v0.7)**: `uses:` field with sigil-prefixed identifiers

The explicit declaration approach required maintaining two sources of truth. Inference from statements ensures consistency.

### Why Source = Output? (v0.3)

- The LLM sees what you write - no hidden transformations
- Easier to debug - source is execution format
- Simpler mental model - one format to understand
- Like SQL: you write it, the engine runs it
- Tooling validates but doesn't transform (like dbt for SQL)

### Why Remove PARALLEL FOR EACH? (v0.9)

The `PARALLEL FOR EACH` construct was removed in favor of the `ASYNC DELEGATE` pattern:

- **Clearer semantics**: ASYNC DELEGATE explicitly spawns independent agents
- **More flexible**: Can mix ASYNC and AWAIT delegations in the same loop
- **Better composition**: Works naturally with the existing DELEGATE infrastructure
- **Simpler grammar**: One less control flow construct to parse and validate

**Migration path**: Replace `PARALLEL FOR EACH $item IN $items:` with:
```
FOR $item IN $items
  - ASYNC DELEGATE /process $item/ TO ~/agent/worker
END
```

### Why BREAK/CONTINUE? (v0.2)

- Familiar from imperative languages
- Useful for efficiency (early exit)
- Clear control flow intent
- Reduces nesting depth

### Why RETURN? (v0.9)

The RETURN keyword was added to provide explicit control over section completion:

- **Explicit exit**: Clear signal that a section is complete
- **Value passing**: Can return a value from a section
- **Loop iteration**: Can yield values during iteration
- **Implicit allowed**: No RETURN means natural completion (not an error)

The restriction to "end of section/iteration only" prevents complex control flow that would be hard for LLMs to follow.

### Why ASYNC/AWAIT DELEGATE? (v0.9)

The modifiers provide explicit control over delegation behavior:

- **ASYNC**: Fire-and-forget for parallel work that doesn't need immediate results
- **AWAIT**: Explicit wait when results are needed before continuing
- **Default**: Runtime decides based on context (typically AWAIT)
- **Familiar**: Async/await is a well-understood concurrency pattern

### Why Push Operator <<? (v0.9)

The push operator provides a clean way to collect values:

- **Familiar syntax**: `<<` is used in Ruby, C++ streams, shell redirection
- **Concise**: `$results << $value` vs `$results = $results + [$value]`
- **Loop-friendly**: Natural for collecting results during iteration
- **Readable**: Direction of data flow is visually clear

### Why Frontmatter Declarations? (v0.9)

Moving types, input, and context to frontmatter provides:

- **Separation of concerns**: Metadata separate from executable content
- **Single location**: All declarations in one place at the top
- **YAML familiarity**: Uses standard YAML syntax
- **Tooling benefits**: Easier to extract and validate declarations
- **Cleaner body**: Document body focuses on workflow, not declarations

**Previous approach (v0.8)**: `## Types`, `## Input`, `## Context` sections in document body

### Why Colon-Based Parameter Syntax? (v0.9)

Parameters changed from `- $param = value` to `param: value`:

- **Cleaner**: No `$` prefix or `-` marker needed
- **YAML-like**: Consistent with frontmatter syntax
- **Less noise**: Easier to read parameter lists
- **Unambiguous**: Colon clearly separates name from value

### Why DO Statement? (v0.9)

The standalone DO statement provides explicit prose instructions:

- **Clarity**: Distinguishes instruction from description
- **Familiar**: "Do X" is natural English imperative
- **Parseable**: Clear syntax for tooling to identify instructions
- **Distinct**: Different from WHILE...DO where DO is a delimiter

### Why Keyword Placement Rule? (v0.10)

Requiring keywords at line start or after indentation:

- **Unambiguous parsing**: Keywords in prose don't trigger control flow
- **Natural prose**: Can write "The FOR keyword..." without conflict
- **Clear structure**: `END` shows nesting; indentation is optional
- **Simpler grammar**: Reduces parser ambiguity

### Why END Blocks? (v0.10)

Blocks closed with `END`:

- **Unambiguous**: Clear block boundaries without indentation
- **LLM-friendly**: Explicit closing token improves readability
- **Consistent**: Same rule across `FOR`, `WHILE`, `IF/ELSE`, and `DO`
- **Parseable**: No indentation stack required

### Why DELEGATE? (v0.6)

- Distinct from skill composition (spawning vs calling)
- Clear syntax for multi-agent orchestration
- Enables parallel agent work
- `TO` keyword reads naturally ("delegate to explorer")

### Why USE/EXECUTE/GOTO Keywords? (v0.8)

The new statement keywords clarify intent:

- **USE**: Clearly indicates following skill instructions (not executing code)
- **EXECUTE**: Explicitly invokes external tool capabilities
- **GOTO**: Standard control flow keyword for section jumps
- **DELEGATE**: Unchanged, spawns independent agents

**Previous approach**: `Execute (~skill)` prose pattern

The keyword approach provides clear, parseable syntax with explicit semantics.

## Terminology

This glossary provides canonical names for MDZ syntax elements. Use these terms consistently in documentation, error messages, and discussion.

### Prefixes

- **Dollar prefix** (`$`) — Marks variables and types. `$name` for variables, `$Name` for types.
- **Link prefix** (`~/`) — Marks links to external resources. `~/agent/x`, `~/skill/y`, `~/tool/z`.
- **Hash prefix** (`#`) — Marks anchors (same-file section references). `#section-name`.

### Links and Anchors

- **Link** (`~/path/to/resource`) — Reference to an external resource (agent, skill, tool).
- **Agent link** (`~/agent/name`) — Link to an agent for delegation.
- **Skill link** (`~/skill/name`) — Link to a skill for composition.
- **Tool link** (`~/tool/name`) — Link to a tool for execution.
- **Section link** (`~/skill/name#section`) — Link to a section in another skill.
- **Anchor** (`#section`) — Reference to a section in the current document.

### Delimiters

- **Frontmatter fence** (`---`) — YAML frontmatter delimiter (opening and closing).
- **Instruction span** (positional) — Content for LLM interpretation based on placement.
- **Inferred variable** (`$/name/`) — Variable whose value is derived by LLM at runtime.
- **Semantic type annotation** (`: description`) — Type annotation using natural language description.
- **Tuple** (`(a, b)`) — Grouping of multiple values. Used in types and destructuring.
- **Array literal** (`[a, b]`) — Collection of values.
- **Array suffix** (`$Type[]`) — Type modifier indicating a collection.

### Keywords

- **For loop** (`FOR $x IN $y`) — Iteration over a collection.
- **While loop** (`WHILE cond DO`) — Conditional loop.
- **Conditional** (`IF cond THEN`) — Conditional branching.
- **Else if clause** (`ELSE IF cond THEN`) — Chained conditional branch.
- **Else clause** (`ELSE`) — Alternative branch of a conditional.
- **Block terminator** (`END`) — Closes `FOR`, `WHILE`, `IF/ELSE`, and `DO` blocks.
- **With clause** (`WITH #anchor` or `WITH:`) — Passes context to delegate.
- **Logical operators** (`AND`, `OR`, `NOT`) — Boolean logic in conditions.
- **Loop control** (`BREAK`, `CONTINUE`) — Early exit or skip within loops.
- **Return statement** (`RETURN [expr]`) — Exit section/iteration with optional value (v0.9).
- **Do statement** (`DO instruction` or `DO ... END`) — Standalone instruction (v0.9, v0.10).
- **Collection operator** (`IN`) — Specifies the collection in a loop.
- **Agent delegation** (`DELEGATE task TO ~/agent/x`) — Spawns a subagent with task.
- **Async delegation** (`ASYNC DELEGATE`) — Fire-and-forget agent spawn (v0.9).
- **Await delegation** (`AWAIT DELEGATE`) — Wait-for-result agent spawn (v0.9).
- **Skill usage** (`USE ~/skill/x TO task`) — Follows skill instructions.
- **Tool execution** (`EXECUTE ~/tool/x TO action`) — Invokes external tool.
- **Section jump** (`GOTO #section`) — Control flow to section.
- **Target specifier** (`TO`) — Specifies target in DELEGATE/USE/EXECUTE statements (optional for DELEGATE in v0.9).

### Operators

- **Assignment** (`=`) — Assigns a value to a variable or defines a type.
- **Type annotation** (`:`) — Separates a variable from its type. `$x: $Type`
- **Parameter separator** (`:`) — Separates parameter name from value in WITH blocks (v0.9). `param: value`
- **Arrow** (`=>`) — Defines a lambda expression. `$x => expr`
- **Union** (`|`) — Separates enum variants in types. `"a" | "b"`
- **Member access** (`.`) — Accesses a property. `$item.name`
- **Push** (`<<`) — Appends value to array. `$arr << $val` (v0.9)

### Comparison Operators

- **Equality** (`=`) — Tests if values are equal (in conditions).
- **Inequality** (`!=`) — Tests if values are not equal.
- **Less than** (`<`) — Numeric comparison.
- **Greater than** (`>`) — Numeric comparison.
- **Less or equal** (`<=`) — Numeric comparison.
- **Greater or equal** (`>=`) — Numeric comparison.

### Document Structure

- **Frontmatter** — Skill metadata in YAML between `---` fences: name, description, types, input, context.
- **Section heading** (`##`) — Markdown heading that defines a referenceable section.
- **List item** (`-`) — Markdown list marker for steps and declarations.
- **Code block** (` ``` `) — Fenced code block (standard markdown).

### Type Forms

- **Semantic type** (`Task: any executable instruction`) — Natural language type description.
- **Enum type** (`Status: "active" | "done"`) — Fixed set of string values.
- **Tuple type** (`($Task, $Priority)`) — Compound type of ordered values.
- **Array type** (`$Task[]`) — Collection of a single type.
- **Function type** (`$fn = $x => expr`) — Lambda/callable type.
- **Type reference** (`$Task`) — Reference to a defined type.

### Variable Forms

- **Variable declaration** (`$name = value`) — Creates a variable with a value.
- **Typed declaration** (`$name: $Type = value`) — Declaration with type annotation.
- **Required parameter** (`name: $Type`) — In WITH clause, parameter without default (required).
- **Variable reference** (`$name`) — Use of a defined variable.
- **Lambda expression** (`$fn = $x => expr`) — Anonymous function definition.
- **Push expression** (`$arr << value`) — Append value to array (v0.9).

### Control Flow

- **Block** — Content between a block opener and its matching `END`.
- **Condition** — Boolean expression in `WHILE`/`IF` (deterministic or semantic).
- **Semantic condition** (`NOT diminishing returns`) — Natural language condition interpreted by LLM.
- **Deterministic condition** (`$x < 5`) — Computable boolean expression.
- **Destructuring** (`($a, $b) IN $tuples`) — Unpacking tuple elements in iteration.
- **Return** (`RETURN [expr]`) — Exit section/iteration with optional value (v0.9).

### Composition

- **Skill usage** (`USE ~/skill/x TO task`) — Running skill logic in current context.
- **Agent delegation** (`DELEGATE task TO ~/agent/x`) — Spawning independent subagent.
- **Async delegation** (`ASYNC DELEGATE`) — Fire-and-forget delegation (v0.9).
- **Await delegation** (`AWAIT DELEGATE`) — Blocking delegation (v0.9).
- **Tool execution** (`EXECUTE ~/tool/x TO action`) — Invoking external tool.
- **Section jump** (`GOTO #section`) — Control flow to section in current document.
- **Context template** (`WITH #anchor` or `WITH:`) — Passing section or parameters as context.
- **Dependency inference** — Dependencies extracted from link statements, not frontmatter.

## Version History

- **v0.11** (2026-01-16): Positional semantics for instructions/conditions; removed `/.../` semantic markers; semantic type annotations are unquoted prose; inferred variables keep `$/.../`
- **v0.10** (2026-01-14): END-delimited blocks (indentation cosmetic); `FOR $x IN $y` replaces `FOR EACH`; optional `DO` for `FOR`/`WHILE`; optional `THEN` for `IF`/`ELSE IF`; `DO` supports single-line and block forms; removed `THEN:`/`DO:` colon delimiters
- **v0.9** (2026-01-13): RETURN keyword (end of section/iteration only); ASYNC/AWAIT modifiers for DELEGATE; optional TO target in DELEGATE; push operator `<<` for array collection; WITH parameter syntax changed to `param: value`; removed PARALLEL FOR EACH (use ASYNC DELEGATE pattern); DO as standalone prose instruction; frontmatter declarations (types/input/context move from sections to YAML); colon rule (line-ending colon = indented block); keyword placement rule (CAPS at line start or indented)
- **v0.8** (2026-01-13): Breaking change: Link-based references `~/path` replacing sigil-based `(reference)` syntax; removed `uses:` frontmatter (dependencies inferred from statements); new keywords `USE`, `EXECUTE`, `GOTO`; `WITH #anchor` for passing context templates; folder conventions (`agent/`, `skill/`, `tool/`)
- **v0.7** (2026-01-12): Breaking change: Sigil-based reference syntax `(@agent)`, `(~skill)`, `(#section)`, `(!tool)`; unified `uses:` frontmatter field with sigil-prefixed identifiers; removed separate `skills:`/`agents:`/`tools:` fields
- **v0.6** (2026-01-12): Added DELEGATE keyword for subagent spawning, `skills:`/`agents:`/`tools:` frontmatter fields
- **v0.5** (2026-01-05): Added semantic markers `/content/`, inferred variables `$/name/`, semantic type annotations `: /description/` (semantic markers later removed in v0.11)
- **v0.4** (2026-01-05): Changed type definition syntax from `=` to `:` for clarity
- **v0.3** (2026-01-03): Validator-first architecture - source = output, validation focus
- **v0.2** (2026-01-03): Added PARALLEL FOR EACH, typed parameters, BREAK/CONTINUE
- **v0.1** (2026-01-03): Initial specification based on Phase 1-2 validation
