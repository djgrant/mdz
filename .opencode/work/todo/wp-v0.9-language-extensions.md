# MDZ v0.9 Language Extensions

## Goal

Extend MDZ with RETURN keyword, flexible DELEGATE syntax, and async delegation to support map-reduce patterns and general orchestration.

## Background

Distilling `the-scientist/skill/orchestrate-map-reduce` into mdz syntax revealed gaps:
1. No way to return values from skills
2. DELEGATE requires explicit agent target - can't delegate to "any appropriate agent"
3. DELEGATE target must be a literal link - can't use variables or semantic markers
4. No way to fire-and-forget delegates for parallel work
5. WITH params used `=` which conflicted with assignment semantics
6. No clear way to express prose instructions vs commentary
7. Numbered lists mixed with code created ambiguity about what's executable

## Changes

### 1. RETURN Keyword

New keyword for yielding control back to caller with optional value.

**Syntax:**
```
RETURN [value]
```

**Forms:**
```mdz
RETURN                           # done, no value
RETURN $findings                 # return variable
RETURN /summary of results/      # return semantic (LLM determines)
```

**Semantics:**
- Terminates skill execution
- Passes value (if any) to caller
- No explicit RETURN = implicit `RETURN` (nothing)
- Everything is serializable, so anything can be returned

### 2. Flexible DELEGATE

DELEGATE becomes more flexible: target optional, all positions accept variables/semantics.

**Current syntax (v0.8.1):**
```
DELEGATE [task] TO link [WITH (anchor | : params)]
```

**New syntax (v0.9):**
```
[ASYNC|AWAIT] DELEGATE [task] [TO target] [WITH context]
```

**Where:**
- `task` = semantic marker | variable | omitted
- `target` = link | variable | semantic marker | omitted
- `context` = anchor | variable | semantic marker | `:` params | omitted

**Forms:**
```mdz
# All literals (current)
DELEGATE /analyze/ TO ~/agent/x WITH #prompt

# All variables
DELEGATE $task TO $agent WITH $template

# No explicit target (runtime picks)
DELEGATE WITH #accumulate-prompt
DELEGATE $task WITH $context

# Mixed
DELEGATE /task/ TO $worker WITH #template
DELEGATE $task TO ~/agent/specialist

# Async (fire-and-forget)
ASYNC DELEGATE $transform WITH:
  iteration: $n

# Await (explicit wait)
AWAIT DELEGATE $validator WITH:
  candidate: $current
```

**Semantics:**
- If `TO target` omitted, runtime/LLM selects appropriate agent
- `WITH context` passes prompt/context to sub-agent (whatever form it takes)
- No modifier = LLM decides whether to wait based on context
- `ASYNC` = fire-and-forget, don't wait for result
- `AWAIT` = explicitly wait for result before continuing
- Type checking infers agent-ness from variable assignment (e.g., `$x = ~/agent/y` means `$x` is an agent link)

### 3. Push Operator for Collecting Delegates

New `<<` operator to push values (including delegate handles) onto arrays.

**Syntax:**
```mdz
$array << value
```

**Example:**
```mdz
$results = []

WHILE $iteration < $maxIterations DO:
  $results << ASYNC DELEGATE $transform WITH:
    iteration: $iteration
  $iteration = $iteration + 1
```

**Semantics:**
- Appends value to array
- When used with `ASYNC DELEGATE`, collects handle/result for later use

### 4. WITH Parameter Syntax Change

WITH params now use colon (`:`) instead of equals (`=`), param names drop the `$` prefix, and no list markers.

**Old syntax (v0.8.1):**
```mdz
DELEGATE $task WITH:
  - $input = $current
  - $output = /candidate path/
```

**New syntax (v0.9):**
```mdz
DELEGATE $task WITH:
  input: $current
  output: /candidate path/
```

**Rationale:**
- `=` is for assignment, `:` is for key-value mapping
- Param names are identifiers for the callee, not variables in current scope
- No list markers - follows YAML semantics where:
  - `key: value` (no dash) = object/map of named parameters
  - `- key: value` (with dash) = array of single-key objects (not what we want)

### 5. Drop PARALLEL FOR EACH

`PARALLEL FOR EACH` is removed. Use `ASYNC DELEGATE` inside regular loops instead.

**Old pattern:**
```mdz
PARALLEL FOR EACH $n IN [1, 2, 3]:
  DELEGATE $transform WITH:
    iteration: $n
```

**New pattern:**
```mdz
$results = []
WHILE $iteration < $maxIterations DO:
  $results << ASYNC DELEGATE $transform WITH:
    iteration: $iteration
  $iteration = $iteration + 1
```

**Rationale:**
- More explicit control over async behavior
- Eliminates need for literal arrays like `[1, 2, 3]`
- Consistent with ASYNC/AWAIT model

### 6. DO Keyword for Prose Instructions

New `DO` keyword to mark prose as an executable instruction (vs commentary).

**Syntax:**
```mdz
DO instruction text
```

**Example:**
```mdz
USE ~/skill/work-packages TO /create master work package/
DO summarise status quo into $statusQuo

IF $strategy = "accumulate" THEN:
  DELEGATE WITH #accumulate-prompt
```

**Rationale:**
- Distinguishes executable prose from documentation/commentary
- No semantic marker needed - `DO` signals "execute this"
- Semantic markers (`/.../`) remain for value interpolation, not instructions

**Comparison:**
- `$path = /appropriate location/` - semantic marker, LLM interpolates a value
- `DO summarise status quo` - instruction, LLM performs an action

### 7. Move Declarations to YAML Frontmatter

Types, Input, and Context move into YAML frontmatter. Body is purely executable.

**Old syntax:**
```mdz
---
name: skill-name
description: When...
---

## Types

$Task: /instructions for a sub-agent/
$Strategy: "accumulate" | "independent"

## Input

$transform: $Task
$strategy: $Strategy = "accumulate"

## Context

$statusQuo = /path/
$iteration = 0

## Workflow

USE ~/skill/x TO /task/
...
```

**New syntax:**
```mdz
---
name: skill-name
description: When...

types:
  $Task: /instructions for a sub-agent/
  $Strategy: "accumulate" | "independent"

input:
  $transform: $Task
  $strategy: $Strategy = "accumulate"

context:
  $statusQuo: /path/
  $iteration: 0
---

## Workflow

USE ~/skill/x TO /task/
...
```

**Rationale:**
- Clear separation: YAML for declarations, body for execution
- Frontmatter is already YAML - natural fit
- Standard YAML parsers can extract declarations
- `$` is valid in YAML keys - consistent naming everywhere
- Body sections are purely procedural - no more ambiguity

### 8. Colon Rule

Colons signal "indented block follows on next line".

**With colon (block follows):**
```mdz
IF condition THEN:
  indented body

WHILE condition DO:
  indented body

FOR EACH $x IN $y:
  indented body

ELSE:
  indented body

DELEGATE ... WITH:
  param: value
```

**Without colon (no block):**
```mdz
DELEGATE WITH #anchor
RETURN $value
USE ~/skill/x TO /task/
DO summarise the findings
```

**Rationale:**
- Consistent with YAML/Python conventions
- Colon visually signals "more coming below"
- No colon = statement is complete on this line

### 9. Keyword Placement Rule

Procedural CAPS keywords must appear at:
- Start of line (top-level), or
- Indented according to block structure

**Valid:**
```mdz
IF $x THEN:
  DELEGATE WITH #prompt
  IF $y THEN:
    RETURN $value
```

**Invalid:**
```mdz
Some prose and then IF $x THEN:    # keyword mid-line
  DELEGATE WITH #prompt
```

**Rationale:**
- Clear visual parsing - keywords start statements
- No ambiguity between prose and code
- Consistent indentation hierarchy
```

**Rationale:**
- Consistent with YAML/Python conventions
- Colon visually signals "more coming below"
- No colon = statement is complete on this line

## Grammar Changes

### New Keywords

```ebnf
RETURN = "RETURN" ;
ASYNC  = "ASYNC" ;
AWAIT  = "AWAIT" ;
DO     = "DO" ;
```

### RETURN Statement

```ebnf
return_stmt = RETURN [ expression ] newline ;
```

### DELEGATE Statement

```ebnf
delegate_stmt = [ ASYNC | AWAIT ] DELEGATE [ task_expr ] [ TO target_expr ] [ WITH context_expr ] newline ;

task_expr    = semantic_marker | var_reference ;
target_expr  = link | var_reference | semantic_marker ;
context_expr = anchor | var_reference | semantic_marker | colon newline with_params ;

with_params  = { with_param } ;
with_param   = indent ident colon expression newline ;
```

### Push Statement

```ebnf
push_stmt = var_reference "<<" expression newline ;
```

### DO Statement

```ebnf
do_stmt = DO prose_instruction newline ;
prose_instruction = { any_char } ;  /* Plain text, no semantic markers needed */
```

### Remove PARALLEL FOR EACH

Remove from grammar:
```ebnf
# REMOVED: parallel_for_each_stmt = PARALLEL FOR EACH pattern IN collection colon newline block_body ;
```

## Measures of Success

1. Spec updated (language-spec.md, grammar.md)
2. Parser handles RETURN keyword
3. Parser handles ASYNC/AWAIT modifiers on DELEGATE
4. Parser handles optional TO in DELEGATE
5. Parser handles `<<` push operator
6. Parser handles new WITH param syntax (colon, no $ prefix)
7. Parser handles DO keyword
8. PARALLEL FOR EACH removed from parser
9. Compiler validates appropriately
10. Examples updated (map-reduce.mdz working)
11. Tests pass
12. Website docs updated

## Work Packages

| # | Package | Description |
|---|---------|-------------|
| 1 | v0.9-spec | Update language-spec.md and grammar.md |
| 2 | v0.9-lexer | Add RETURN, ASYNC, AWAIT, DO tokens and << operator |
| 3 | v0.9-ast | Add ReturnStatement, AsyncDelegate, PushStatement, DoStatement nodes |
| 4 | v0.9-parser | Parse new syntax, remove PARALLEL FOR EACH |
| 5 | v0.9-compiler | Validate new constructs |
| 6 | v0.9-examples | Update map-reduce.mdz and others |
| 7 | v0.9-tests | Test coverage for new syntax |
| 8 | v0.9-website | Update documentation |

## Open Questions

1. Should RETURN be valid anywhere, or only at workflow top-level?
2. Should tooling warn if a skill has no RETURN paths?

## Example: map-reduce.mdz (v0.9)

```mdz
---
name: map-reduce
description: When you need multiple iterations to converge on a solution, use this skill to transform, validate, and iterate.

types:
  $Task: /instructions for a sub-agent to execute/
  $Strategy: "accumulate" | "independent"

input:
  $transform: $Task
  $validator: $Task
  $strategy: $Strategy = "accumulate"
  $maxIterations: $Number = 5

context:
  $statusQuo: $FilePath
  $iteration: $Number = 0
---

## Workflow

USE ~/skill/work-packages TO /create master work package/
DO summarise status quo into $statusQuo

IF $strategy = "accumulate" THEN:
  DELEGATE WITH #accumulate-prompt
ELSE:
  DELEGATE WITH #independent-prompt

RETURN $statusQuo

## Accumulate Prompt

WHILE $iteration < $maxIterations AND NOT /diminishing returns/ DO:
  DELEGATE $transform WITH:
    input: $statusQuo
    output: /next candidate path/
  DELEGATE $validator WITH:
    candidate: /next candidate path/
  IF /validation passed/ THEN:
    $statusQuo = /next candidate path/
  $iteration = $iteration + 1

RETURN $statusQuo

## Independent Prompt

$results = []

WHILE $iteration < $maxIterations DO:
  $results << ASYNC DELEGATE $transform WITH:
    iteration: $iteration
    output: /candidate path/
  $iteration = $iteration + 1

DELEGATE $validator WITH:
  candidates: $results

RETURN /winning candidate/
```

## Progress Log

### 2026-01-13

- Work package drafted from interview with user
- Core decisions made: RETURN keyword, optional TO in DELEGATE, variable targets
- Added ASYNC/AWAIT modifiers for delegate control
- Added `<<` push operator for collecting async results
- Changed WITH params: colon instead of equals, no $ prefix on param names
- Decided to drop PARALLEL FOR EACH in favor of ASYNC DELEGATE pattern
- Added DO keyword for prose instructions (distinct from semantic markers for values)
- Codified colon rule: colon = indented block follows
- Moved types/input/context to YAML frontmatter - clear separation of declarations vs execution
- Added keyword placement rule: CAPS keywords at start of line or indented in block
- Renamed $current to $statusQuo for clarity
- Updated map-reduce.mdz example to v0.9 syntax
- Created separate wp-v0.10-type-constraints.md for type system investigation
