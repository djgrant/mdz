# MDZ Language Specification v0.3

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

Required and optional fields in the YAML frontmatter:

```yaml
---
name: skill-name              # Required: identifier (kebab-case)
description: When...          # Required: trigger description
uses:                         # Optional: skill dependencies
  - skill-a
  - skill-b
---
```

The `description` field follows the pattern:
- **When**: trigger condition
- **Does**: what the skill accomplishes
- **Uses**: other skills it depends on (implicit in uses array)

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

### Semantic Variable Transformation

When a variable's structure changes during workflow execution (e.g., loading and parsing a file path into an AST), use distinct variable names to clarify the transformation:

```
## Input
- $skillPath: $String  <!-- path to the skill -->

## Context
- $skill: /the loaded and parsed skill AST from $skillPath/

## Workflow
1. Load skill source from $skillPath
2. Parse into $skill AST
3. FOR EACH $statement IN $skill.statements:
```

This pattern:
- Uses `$skillPath` for the input (a string)
- Uses `$skill` for the transformed result (an AST with `.statements`)
- Makes the semantic transformation explicit in Context
- Avoids confusion about where properties like `.statements` come from

**Anti-pattern** (avoid):
```
## Input
- $skill: $String  <!-- the skill to debug -->

## Workflow
FOR EACH $statement IN $skill.statements:  # Where does .statements come from?
```

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

References are passed to the LLM as-is. The LLM runtime (e.g., Claude's skill loader) resolves them.

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

### Semantic Markers in Context

Semantic markers are valid in:
- Prose text
- Variable assignments
- Lambda expressions
- Type annotations
- Control flow conditions (with caution)

```
- $path = /the most relevant file path/
- $output: /where to write results/ = "output.md"
- Write output to /appropriate location/
```

### Nested Semantics

**Nested semantic markers are NOT supported**:

```
# Invalid
//inner content//
```

This is a deliberate constraint to maintain clarity about what is being interpreted.

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

Loop with condition. The `DO` keyword acts as the condition delimiter (like `THEN` for `IF`):

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

With comparisons:
```
IF $strategy = "accumulate" THEN:
  - Validate incrementally
  - Update on success
ELSE:
  - Collect all candidates
  - Validate at end
```

With semantic conditions:
```
IF /any critical findings/ THEN:
  - Request changes
```

**Note:** Parentheses are optional for grouping complex conditions but not required by syntax.

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
2. **Skill references** - Warns when `[[skill]]` isn't declared in `uses:`
3. **Section references** - Errors when `[[#section]]` references a non-existent section
4. **Syntax errors** - Errors for malformed control flow, unterminated constructs, etc.
5. **Scope** - Tracks variable definitions (informational)
6. **Dependency cycles** - Detects circular dependencies across skills

### Error Codes

| Code | Severity | Description |
|------|----------|-------------|
| E001-E007 | Error | Parse errors (syntax) |
| E008 | Warning | Type not defined in document |
| E009 | Error | Skill not found in registry |
| E010 | Error | Section reference broken |
| W001 | Warning | Skill not declared in uses |

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

v0.3 does not define exception mechanisms.

## Tooling Requirements

### Parser Requirements

A compliant parser must extract:
- Frontmatter fields (name, description, uses)
- Type definitions
- Variable declarations
- Skill and section references
- Semantic markers
- Control flow constructs (including PARALLEL, BREAK, CONTINUE)

### Validator Requirements

A compliant validator must:
- Report syntax errors with location
- Check type reference validity
- Check section reference validity
- Build dependency graph
- Support registry-based skill validation (optional)

### LSP Features

The syntax supports:
- **Go-to-definition**: For `[[references]]` and `$variables`
- **Autocomplete**: After `[[`, `$`, and `/`
- **Hover**: Show type definitions
- **Diagnostics**: Undefined references, unused variables, BREAK/CONTINUE outside loops

### Highlighting

Syntax highlighting should distinguish:
- Frontmatter (YAML)
- Headings (markdown)
- Types (`$TypeName`)
- Variables (`$varName`)
- References (`[[...]]`)
- Semantic markers (`/.../`)
- Inferred variables (`$/name/`)
- Control flow keywords (`FOR EACH`, `PARALLEL FOR EACH`, `WHILE`, `DO`, `IF`, `THEN`, `ELSE`, `BREAK`, `CONTINUE`)

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

Square brackets have two uses:

#### 1. Array types and literals

```
# Array type suffix
$Task[]                               # Array of Task
($Task, $Strategy)[]                  # Array of tuples

# Array literals  
$items = [1, 2, 3]
$transforms = [("task1", "strategy1"), ("task2", "strategy2")]
```

#### 2. Double brackets for references

```
[[skill-name]]                        # Skill reference
[[#section-name]]                     # Section in current document
[[skill#section]]                     # Section in another skill
```

The double bracket `[[...]]` syntax is distinct and unambiguous.

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
TYPE_DEF        = '$' UPPER_IDENT '=' /.+/
VAR_DECL        = '$' IDENT (':' TYPE)? '=' EXPR
VAR_REF         = '$' IDENT
SKILL_REF       = '[[' IDENT ']]'
SECTION_REF     = '[[' IDENT? '#' IDENT ']]'
SEMANTIC        = '/' /[^\/\n]+/ '/'
INFERRED_VAR    = '$/' /[^\/\n]+/ '/'                         <!-- v0.4 -->
SEMANTIC_TYPE   = ':' '/' /[^\/\n]+/ '/'                      <!-- v0.4 -->
FOR_EACH        = 'FOR EACH' PATTERN 'IN' EXPR ':'
PARALLEL_FOR    = 'PARALLEL FOR EACH' PATTERN 'IN' EXPR ':'  <!-- v0.2 -->
WHILE           = 'WHILE' CONDITION 'DO:'       <!-- DO delimits, like THEN for IF -->
IF_THEN         = 'IF' CONDITION 'THEN:'       <!-- THEN delimits -->
ELSE            = 'ELSE:'
BREAK           = 'BREAK'                                     <!-- v0.2 -->
CONTINUE        = 'CONTINUE'                                  <!-- v0.2 -->
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

### Why [[wiki-links]]?

- Familiar (Wikipedia, Obsidian, Notion)
- Distinct from markdown links
- Enables internal linking
- Natural for skill references

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

## Terminology

This glossary provides canonical names for MDZ syntax elements. Use these terms consistently in documentation, error messages, and discussion.

### Sigils

- **Dollar sigil** (`$`) — Prefix marking variables and types. `$name` for variables, `$Name` for types.

### Delimiters

- **Frontmatter fence** (`---`) — YAML frontmatter delimiter (opening and closing).
- **Skill link** (`[[name]]`) — Reference to another skill. Wiki-link style.
- **Section link** (`[[#name]]` or `[[skill#name]]`) — Reference to a section, optionally in another skill.
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
- **Else clause** (`ELSE:`) — Alternative branch of a conditional.
- **With clause** (`WITH:`) — Parameter block for skill delegation.
- **Logical operators** (`AND`, `OR`, `NOT`) — Boolean logic in conditions.
- **Loop control** (`BREAK`, `CONTINUE`) — Early exit or skip within loops.
- **Collection operator** (`IN`) — Specifies the collection in a loop.

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

- **Frontmatter** — Skill metadata in YAML between `---` fences: name, description, uses.
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

- **Delegation** (`Execute [[skill]] WITH:`) — Invoking another skill with parameters.
- **Dependency** (`uses:` in frontmatter) — Declared skill dependency.

## Version History

- **v0.5** (2026-01-05): New semantic marker syntax `/content/`, inferred variables `$/name/`, semantic type annotations `: /description/`
- **v0.4** (2026-01-05): Changed type definition syntax from `=` to `:` for clarity
- **v0.3** (2026-01-03): Validator-first architecture - source = output, validation focus
- **v0.2** (2026-01-03): Added PARALLEL FOR EACH, typed parameters, BREAK/CONTINUE
- **v0.1** (2026-01-03): Initial specification based on Phase 1-2 validation
