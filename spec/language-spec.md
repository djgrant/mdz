# MDZ Language Specification v0.8

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

**v0.8 Change**: Dependencies are no longer declared in frontmatter. They are inferred from link statements (`DELEGATE`, `USE`, `EXECUTE`) in the document body.

## Types

### Type Definitions

Types provide semantic hints about values. They are defined at the top of a skill, typically in a `## Types` section:

```
$TypeName: natural language description of what this type represents
```

Examples:
```
$Task: any task that an agent can execute
$Strategy: "accumulate" | "independent"
$ValidationResult: "progress" | "regression" | "plateau"
```

### Type Syntax

Types can be:

- **Semantic**: `$Task: any task that an agent can execute`
- **Enum**: `$Strategy: "accumulate" | "independent"`
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
- $current: $FilePath = $SolutionPath(0)
- $iterations = 0
- $result: $ValidationResult
```

### Required Parameters (v0.2)

In WITH clauses, typed parameters without a default value are considered required:

```
USE ~/skill/x TO /task/:
  - $param: $Type = value     # Optional with default
  - $required: $Task          # Required (no default)
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
$SolutionPath = $n => `/relevant wp path/-candidate-${n}.md`
```

Lambdas can include semantic markers and template literals.

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

## Semantic Markers

### Basic Semantic Marker

The `/content/` syntax marks content for LLM interpretation:

```
/appropriate location for this work package/
```

The LLM should determine the actual value based on context.

### Variable Interpolation

Variables are expanded BEFORE semantic interpretation:

```
/the path for candidate $n/
```

First `$n` is resolved (e.g., to `3`), then the LLM interprets "the path for candidate 3".

### Inferred Variables

Use `$/name/` to declare a variable whose value is inferred by the LLM at runtime:

```
$/the user's primary goal/
$/current file path based on context/
```

Inferred variables combine variable declaration with semantic interpretation. The LLM derives the value based on context.

### Semantic Type Annotations

Use `/description/` as a type annotation to describe what a value should be:

```
- $target: /the file to modify/ = "default.txt"
- $context: /relevant background information/
```

This is more flexible than reference types (`$Type`) when you need to describe the expected value semantically rather than reference a defined type.

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

### WHILE

Loop with condition. The `DO` keyword acts as the condition delimiter:

```
WHILE condition AND $iterations < 5 DO:
  - Perform iteration
  - Update state
```

Conditions can include:
- Variable comparisons: `$x < 5`
- Semantic conditions: `NOT diminishing returns` (LLM-interpreted)
- Logical operators: `AND`, `OR`, `NOT`

### IF THEN ELSE

Conditional branching. The `THEN` keyword acts as the condition delimiter:

```
IF $condition THEN:
  - Do this
ELSE:
  - Do that
```

With semantic conditions:
```
IF /any critical findings/ THEN:
  - Request changes
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

## Statements (v0.8)

MDZ v0.8 introduces four key statement types for working with external resources: `DELEGATE`, `USE`, `EXECUTE`, and `GOTO`.

### DELEGATE - Spawn Agent

The `DELEGATE` keyword spawns a subagent to handle a task:

```
DELEGATE /task description/ TO ~/agent/name
```

With a context template (passes a section as context):

```
DELEGATE /explore the codebase/ TO ~/agent/explorer WITH #context-template
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
| `DELEGATE` | Spawn agent | `~/agent/x` | Independent |
| `USE` | Follow skill | `~/skill/x` | In context |
| `EXECUTE` | Invoke tool | `~/tool/x` | External |
| `GOTO` | Jump to section | `#section` | Current doc |

## Composition

This section covers skill composition using `USE` and parameter passing.

### Skill Composition

Skills compose through the `USE` statement:

```
USE ~/skill/orchestrate-map-reduce TO /apply transforms/:
  - $transforms = [("Apply heuristic", "accumulate")]
  - $validator = #validate-essence
  - $return = "Report findings"
```

### Parameter Passing

Parameters are passed using the colon-newline syntax:

```
USE ~/skill/name TO /task/:
  - $param1 = value1
  - $param2 = value2
```

### Section Inclusion

Pass a section as context using the `WITH` clause:

```
DELEGATE /task/ TO ~/agent/explorer WITH #context-template
```

The section content becomes part of the agent's instructions.

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

### Input Section Semantics

The Input section declares skill interface parameters. Parameters use `=` ONLY for literal default values:

```mdz
## Input

- $problem: $String                    <!-- required parameter (no default) -->
- $maxIterations: $Number = 5          <!-- optional with default -->
- $strategy: $Strategy = "accumulate"  <!-- optional with enum default -->
- $items: $Task[] = []                 <!-- optional with empty array default -->
```

Parameter rules:
- **Required**: `$name: $Type` (no `=`)
- **Optional**: `$name: $Type = literal_value`
- **Descriptions**: Use `<!-- -->` comments for documentation

The `=` sign indicates a **literal default value**, not a description. Use comments for descriptions to avoid confusion with assignment semantics.

Valid default values:
- String literals: `"value"`
- Number literals: `5`, `3.14`
- Boolean literals: `true`, `false`
- Array literals: `[]`, `["a", "b"]`
- Enum values: `"accumulate"` (when type is enum)

Invalid as defaults (use comments instead):
- Prose descriptions: ~~`= the problem to solve`~~
- Semantic markers: ~~`= /appropriate value/`~~

### Workflow Structure

Workflows typically follow:
1. Setup phase (create work packages, initialize state)
2. Execution phase (loops, delegations, transformations)
3. Completion phase (collect results, report)

## Validation

### Overview

MDZ tooling validates source documents without transforming them. The compiler:
- Parses the document into an AST
- Extracts metadata (types, variables, references, sections)
- Builds a dependency graph
- Reports errors and warnings

**Source = Output.** The compiled output is the original source, unchanged.

### What Tooling Checks

1. **Type references** - Warns when a type annotation references an undefined type
2. **Link resolution** - Errors when link path doesn't resolve to valid resource
3. **Anchor references** - Errors when `#section` references a non-existent section
4. **Syntax errors** - Errors for malformed control flow, unterminated constructs, etc.
5. **Scope** - Tracks variable definitions (informational)
6. **Dependency cycles** - Detects circular dependencies across skills
7. **Link conventions** - Warns when link doesn't follow folder conventions (agent/, skill/, tool/)

### Error Codes

| Code | Severity | Description |
|------|----------|-------------|
| E001-E007 | Error | Parse errors (syntax) |
| E008 | Warning | Type not defined in document |
| E009 | Error | Link path doesn't resolve |
| E010 | Error | Anchor reference broken |
| E011 | Error | BREAK/CONTINUE outside loop |
| E012 | Error | Dependency cycle detected |
| W002 | Warning | Link doesn't follow folder conventions |

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

`/content/` is interpreted by the LLM:
- Consider current context
- Derive appropriate concrete value
- The result replaces the marker in execution

### Error Handling

Errors in MDZ are handled through:
1. Explicit checks: `IF ($result = "regression") THEN...`
2. Semantic resilience: LLMs adapt to unexpected states
3. Work package logging: State is persisted for debugging

v0.6 does not define exception mechanisms.

## Tooling Requirements

### Parser Requirements

A compliant parser must extract:
- Frontmatter fields (name, description)
- Type definitions
- Variable declarations
- Links (`~/path/to/resource`) and anchors (`#section`)
- Semantic markers
- Control flow constructs (including PARALLEL, BREAK, CONTINUE, DELEGATE, USE, EXECUTE, GOTO)

### Validator Requirements

A compliant validator must:
- Report syntax errors with location
- Check type reference validity
- Check link path resolution
- Check anchor reference validity
- Build dependency graph from link statements
- Detect dependency cycles

### LSP Features

The syntax supports:
- **Go-to-definition**: For `~/links`, `#anchors`, `$variables`
- **Autocomplete**: After `~/`, `#`, `$`, `/`, `DELEGATE ... TO`, `USE`, `EXECUTE`, `GOTO`
- **Hover**: Show type definitions, link targets, section content
- **Diagnostics**: Unresolved links, broken anchors, unused variables, BREAK/CONTINUE outside loops

### Highlighting

Syntax highlighting should distinguish:
- Frontmatter (YAML)
- Headings (markdown)
- Types (`$TypeName`)
- Variables (`$varName`)
- Links (`~/path/to/resource`)
- Anchors (`#section`)
- Semantic markers (`/.../`)
- Inferred variables (`$/name/`)
- Control flow keywords (`FOR EACH`, `PARALLEL FOR EACH`, `WHILE`, `DO`, `IF`, `THEN`, `ELSE`, `BREAK`, `CONTINUE`, `DELEGATE`, `TO`, `USE`, `EXECUTE`, `GOTO`, `WITH`)

## Grouping and Braces

MDZ uses three types of brackets, each with specific purposes. This section documents when each is required vs optional.

### Parentheses `()`

Parentheses serve four distinct purposes in MDZ:

#### 1. WHILE conditions — NO PARENS REQUIRED

The `DO` keyword delimits WHILE conditions (like `THEN` for `IF`):

```
WHILE $iterations < 5 DO:             # Valid
WHILE condition AND $x > 0 DO:        # Valid
WHILE NOT diminishing returns DO:     # Valid (semantic condition)
```

Parentheses are optional for grouping complex conditions.

#### 2. Tuple/compound types and destructuring patterns — REQUIRED for multiple elements

```
# Type definitions
$Pair: ($Task, $Strategy)             # Required for compound types
$Task[]                               # No parens for single type

# FOR EACH destructuring  
FOR EACH ($item, $priority) IN $pairs:  # Required for destructuring
FOR EACH $item IN $items:               # No parens for single variable
```

#### 3. Lambda parameters — REQUIRED for multiple parameters

```
$fn = $x => expression                # Single param: no parens needed
$fn = ($a, $b) => expression          # Multiple params: parens required
```

#### 4. Expression grouping — OPTIONAL but recommended for clarity

Parentheses can group sub-expressions to control precedence or improve readability:

```
IF ($a = 1) AND ($b = 2) THEN:        # Optional but clear
IF $a = 1 AND $b = 2 THEN:            # Also valid, uses precedence
IF (($a AND $b) OR $c) THEN:          # Grouping overrides precedence
```

#### 5. IF conditions — OPTIONAL

The IF statement does **not** require parentheses around conditions:

```
IF $result = "progress" THEN:         # Valid - no parens
IF ($result = "progress") THEN:       # Valid - with parens
IF condition AND other THEN:          # Valid - semantic condition
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

Note: MDZ does **not** use `{}` for code blocks (Python-style indentation is used instead).

### Forward Slashes `/`

Forward slashes delimit semantic content:

#### 1. Semantic markers

```
/appropriate location/                # LLM interprets this
/the path for candidate $n/           # With variable interpolation
```

#### 2. Inferred variables

```
$/the user's primary intent/          # Variable with LLM-derived value
$/relevant context from history/      # Value inferred at runtime
```

#### 3. Semantic type annotations

```
$target: /file to modify/ = "out.md"  # Describes what the value should be
$context: /background info/           # Semantic type instead of $Type
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
8. **Lambda arrow**: `=>` — binds loosest

#### Precedence Examples

```
# These are equivalent:
IF $a AND $b OR $c THEN:
IF ($a AND $b) OR $c THEN:            # AND binds tighter than OR

# This is different:
IF $a AND ($b OR $c) THEN:            # Parens override precedence

# Comparison binds tighter than logical:
IF $x = 1 AND $y = 2 THEN:
IF ($x = 1) AND ($y = 2) THEN:        # Same meaning
```

### Quick Reference

| Construct | Parens Required? | Example |
|-----------|-----------------|---------|
| WHILE condition | No | `WHILE $x < 5 DO:` |
| IF condition | No | `IF $x = 1 THEN:` |
| FOR EACH single var | No | `FOR EACH $item IN $list:` |
| FOR EACH destructure | **Yes** | `FOR EACH ($a, $b) IN $pairs:` |
| Lambda single param | No | `$x => expr` |
| Lambda multi params | **Yes** | `($a, $b) => expr` |
| Function call | **Yes** | `$fn($x)` |
| Compound type | **Yes** | `($A, $B)` |
| Expression grouping | No | `($a AND $b) OR $c` |

## Grammar Summary

### Tokens

```
FRONTMATTER     = '---\n' YAML '\n---'
TYPE_DEF        = '$' UPPER_IDENT ':' /.+/
VAR_DECL        = '$' IDENT (':' TYPE)? '=' EXPR
VAR_REF         = '$' IDENT
LINK            = '~/' PATH ('#' IDENT)?                      <!-- v0.8 -->
ANCHOR          = '#' IDENT                                   <!-- v0.8 -->
PATH            = IDENT ('/' IDENT)*                          <!-- v0.8 -->
SEMANTIC        = '/' /[^\/\n]+/ '/'
INFERRED_VAR    = '$/' /[^\/\n]+/ '/'                         <!-- v0.4 -->
SEMANTIC_TYPE   = ':' '/' /[^\/\n]+/ '/'                      <!-- v0.4 -->
FOR_EACH        = 'FOR EACH' PATTERN 'IN' EXPR ':'
PARALLEL_FOR    = 'PARALLEL FOR EACH' PATTERN 'IN' EXPR ':'   <!-- v0.2 -->
WHILE           = 'WHILE' CONDITION 'DO:'                     <!-- DO delimits -->
IF_THEN         = 'IF' CONDITION 'THEN:'                      <!-- THEN delimits -->
ELSE_IF         = 'ELSE IF' CONDITION 'THEN:'                 <!-- v0.6 -->
ELSE            = 'ELSE:'
BREAK           = 'BREAK'                                     <!-- v0.2 -->
CONTINUE        = 'CONTINUE'                                  <!-- v0.2 -->
DELEGATE        = 'DELEGATE' SEMANTIC 'TO' LINK ('WITH' ANCHOR)?  <!-- v0.8 -->
USE             = 'USE' LINK 'TO' SEMANTIC                    <!-- v0.8 -->
EXECUTE         = 'EXECUTE' LINK 'TO' SEMANTIC                <!-- v0.8 -->
GOTO            = 'GOTO' ANCHOR                               <!-- v0.8 -->
LAMBDA          = '$' IDENT '=' PARAMS '=>' EXPR
```

### Identifier Patterns

```
UPPER_IDENT     = /[A-Z][a-zA-Z0-9]*/
IDENT           = /[a-zA-Z][a-zA-Z0-9-]*/
PATH            = /[a-z][a-z0-9-]*(\/[a-z][a-z0-9-]*)*/       <!-- v0.8 -->
```

## Appendix: Design Decisions

### Why CAPS Keywords?

- Visually distinct from prose
- No conflict with markdown syntax
- Familiar (SQL, BASIC heritage)
- Simple regex parsing

### Why /.../ for Semantics?

- Lightweight and readable inline
- Clear visual boundary without heavy punctuation
- Familiar from regex notation (pattern/interpretation)
- Enables `$/name/` for inferred variables naturally
- Enables `: /desc/` for semantic type annotations

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
- **Semantic marker** (`/content/`) — Content for LLM interpretation. Slashes delimit the semantic content.
- **Inferred variable** (`$/name/`) — Variable whose value is derived by LLM at runtime.
- **Semantic type annotation** (`: /description/`) — Type annotation using natural language description.
- **Tuple** (`(a, b)`) — Grouping of multiple values. Used in types and destructuring.
- **Array literal** (`[a, b]`) — Collection of values.
- **Array suffix** (`$Type[]`) — Type modifier indicating a collection.

### Keywords

- **For-each loop** (`FOR EACH $x IN $y:`) — Iteration over a collection.
- **Parallel loop** (`PARALLEL FOR EACH $x IN $y:`) — Concurrent iteration.
- **While loop** (`WHILE cond DO:`) — Conditional loop.
- **Conditional** (`IF cond THEN:`) — Conditional branching.
- **Else if clause** (`ELSE IF cond THEN:`) — Chained conditional branch.
- **Else clause** (`ELSE:`) — Alternative branch of a conditional.
- **With clause** (`WITH #anchor`) — Passes section template to delegate (v0.8).
- **Logical operators** (`AND`, `OR`, `NOT`) — Boolean logic in conditions.
- **Loop control** (`BREAK`, `CONTINUE`) — Early exit or skip within loops.
- **Collection operator** (`IN`) — Specifies the collection in a loop.
- **Agent delegation** (`DELEGATE /task/ TO ~/agent/x`) — Spawns a subagent with task (v0.8).
- **Skill usage** (`USE ~/skill/x TO /task/`) — Follows skill instructions (v0.8).
- **Tool execution** (`EXECUTE ~/tool/x TO /action/`) — Invokes external tool (v0.8).
- **Section jump** (`GOTO #section`) — Control flow to section (v0.8).
- **Target specifier** (`TO`) — Specifies target in DELEGATE/USE/EXECUTE statements.

### Operators

- **Assignment** (`=`) — Assigns a value to a variable or defines a type.
- **Type annotation** (`:`) — Separates a variable from its type. `$x: $Type`
- **Arrow** (`=>`) — Defines a lambda expression. `$x => expr`
- **Union** (`|`) — Separates enum variants in types. `"a" | "b"`
- **Member access** (`.`) — Accesses a property. `$item.name`

### Comparison Operators

- **Equality** (`=`) — Tests if values are equal (in conditions).
- **Inequality** (`!=`) — Tests if values are not equal.
- **Less than** (`<`) — Numeric comparison.
- **Greater than** (`>`) — Numeric comparison.
- **Less or equal** (`<=`) — Numeric comparison.
- **Greater or equal** (`>=`) — Numeric comparison.

### Document Structure

- **Frontmatter** — Skill metadata in YAML between `---` fences: name, description.
- **Section heading** (`##`) — Markdown heading that defines a referenceable section.
- **List item** (`-`) — Markdown list marker for steps and declarations.
- **Code block** (` ``` `) — Fenced code block (standard markdown).

### Type Forms

- **Semantic type** (`$Task: any executable instruction`) — Natural language type description.
- **Enum type** (`$Status: "active" | "done"`) — Fixed set of string values.
- **Tuple type** (`($Task, $Priority)`) — Compound type of ordered values.
- **Array type** (`$Task[]`) — Collection of a single type.
- **Function type** (`$fn = $x => expr`) — Lambda/callable type.
- **Type reference** (`$Task`) — Reference to a defined type.

### Variable Forms

- **Variable declaration** (`$name = value`) — Creates a variable with a value.
- **Typed declaration** (`$name: $Type = value`) — Declaration with type annotation.
- **Required parameter** (`$name: $Type`) — In WITH clause, parameter without default (required).
- **Variable reference** (`$name`) — Use of a defined variable.
- **Lambda expression** (`$fn = $x => expr`) — Anonymous function definition.

### Control Flow

- **Block** — Indented content after `:` belonging to a control flow statement.
- **Condition** — Boolean expression in `WHILE`/`IF` (deterministic or semantic).
- **Semantic condition** (`NOT diminishing returns`) — Natural language condition interpreted by LLM.
- **Deterministic condition** (`$x < 5`) — Computable boolean expression.
- **Destructuring** (`($a, $b) IN $tuples`) — Unpacking tuple elements in iteration.

### Composition

- **Skill usage** (`USE ~/skill/x TO /task/`) — Running skill logic in current context (v0.8).
- **Agent delegation** (`DELEGATE /task/ TO ~/agent/x`) — Spawning independent subagent (v0.8).
- **Tool execution** (`EXECUTE ~/tool/x TO /action/`) — Invoking external tool (v0.8).
- **Section jump** (`GOTO #section`) — Control flow to section in current document (v0.8).
- **Context template** (`WITH #anchor`) — Passing section as context to delegate (v0.8).
- **Dependency inference** — Dependencies extracted from link statements, not frontmatter (v0.8).

## Version History

- **v0.8** (2026-01-13): Breaking change: Link-based references `~/path` replacing sigil-based `(reference)` syntax; removed `uses:` frontmatter (dependencies inferred from statements); new keywords `USE`, `EXECUTE`, `GOTO`; `WITH #anchor` for passing context templates; folder conventions (`agent/`, `skill/`, `tool/`)
- **v0.7** (2026-01-12): Breaking change: Sigil-based reference syntax `(@agent)`, `(~skill)`, `(#section)`, `(!tool)`; unified `uses:` frontmatter field with sigil-prefixed identifiers; removed separate `skills:`/`agents:`/`tools:` fields
- **v0.6** (2026-01-12): Added DELEGATE keyword for subagent spawning, `skills:`/`agents:`/`tools:` frontmatter fields
- **v0.5** (2026-01-05): New semantic marker syntax `/content/`, inferred variables `$/name/`, semantic type annotations `: /description/`
- **v0.4** (2026-01-05): Changed type definition syntax from `=` to `:` for clarity
- **v0.3** (2026-01-03): Validator-first architecture - source = output, validation focus
- **v0.2** (2026-01-03): Added PARALLEL FOR EACH, typed parameters, BREAK/CONTINUE
- **v0.1** (2026-01-03): Initial specification based on Phase 1-2 validation
