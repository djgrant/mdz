# MDZ Grammar Specification

## Overview

This document defines the formal grammar for MDZ v0.10 in Extended Backus-Naur Form (EBNF).

**Core principle:** The source document is the execution format. The grammar defines what tooling can validate—not what gets transformed.

## Notation

- `|` - Alternative
- `[ ]` - Optional (0 or 1)
- `{ }` - Repetition (0 or more)
- `( )` - Grouping
- `" "` - Terminal string
- `' '` - Terminal character
- `/* */` - Comments
- `?...?` - Prose description

## Lexical Grammar

### Character Classes

```ebnf
letter          = 'a'..'z' | 'A'..'Z' ;
digit           = '0'..'9' ;
upper_letter    = 'A'..'Z' ;
lower_letter    = 'a'..'z' ;
whitespace      = ' ' | '\t' ;
newline         = '\n' | '\r\n' ;
any_char        = ? any unicode character ? ;
```

### Identifiers

```ebnf
ident           = letter { letter | digit | '-' } ;
upper_ident     = upper_letter { letter | digit } ;
lower_ident     = lower_letter { letter | digit | '-' } ;
kebab_ident     = lower_letter { lower_letter | digit | '-' } ;
```

### Literals

```ebnf
string_literal  = '"' { string_char } '"' ;
string_char     = ? any char except '"' and newline ? | escape_seq ;
escape_seq      = '\\' ( '"' | '\\' | 'n' | 't' ) ;

number_literal  = [ '-' ] digit { digit } [ '.' digit { digit } ] ;

template_literal = '`' { template_char | template_expr } '`' ;
template_char   = ? any char except '`' and '${' ? ;
template_expr   = '${' expression '}' ;
```

### Keywords

```ebnf
/* Runtime control flow - executed by the LLM */
FOR             = "FOR" ;
IN              = "IN" ;
WHILE           = "WHILE" ;
DO              = "DO" ;           /* v0.3: WHILE...DO syntax; v0.9: standalone prose; v0.10: block delimiter */
IF              = "IF" ;
THEN            = "THEN" ;
ELSE            = "ELSE" ;
END             = "END" ;          /* v0.10: block terminator */
AND             = "AND" ;
OR              = "OR" ;
NOT             = "NOT" ;
WITH            = "WITH" ;
BREAK           = "BREAK" ;        /* v0.2 */
CONTINUE        = "CONTINUE" ;     /* v0.2 */
RETURN          = "RETURN" ;       /* v0.9 */
DELEGATE        = "DELEGATE" ;     /* v0.6 */
TO              = "TO" ;           /* v0.6 */
ASYNC           = "ASYNC" ;        /* v0.9 */
AWAIT           = "AWAIT" ;        /* v0.9 */
USE             = "USE" ;          /* v0.8 */
EXECUTE         = "EXECUTE" ;      /* v0.8 */
GOTO            = "GOTO" ;         /* v0.8 */
```

### Operators

```ebnf
assign_op       = '=' ;
colon           = ':' ;
arrow           = "=>" ;
pipe            = '|' ;
dollar          = '$' ;
hash            = '#' ;
dot             = '.' ;
comma           = ',' ;
semicolon       = ';' ;
push_op         = "<<" ;           /* v0.9: Push operator for array collection */

lparen          = '(' ;
rparen          = ')' ;
lbracket        = '[' ;
rbracket        = ']' ;
lbrace          = '{' ;
rbrace          = '}' ;
inferred_delim  = '/' ;
link_prefix     = '~/' ;                /* v0.8: Link prefix */
```

### Comments and Markdown

```ebnf
comment         = "<!--" { any_char } "-->" ;  /* Standard HTML/Markdown comment */
heading         = '#' { '#' } whitespace heading_text newline ;
heading_text    = { any_char } ;
list_marker     = ( '-' | digit '.' ) whitespace ;
horizontal_rule = "---" newline ;
```

## Syntactic Grammar

### Document Structure

```ebnf
document        = [ frontmatter ] { section } ;

frontmatter     = "---" newline yaml_content "---" newline ;
yaml_content    = ? valid YAML content including imports (v0.2) ? ;

section         = heading { block } ;
block           = type_definition
                | variable_declaration
                | control_flow
                | paragraph
                | code_block
                | list
                ;
```

### Frontmatter Schema

```ebnf
/* v0.9: Frontmatter fields for skill metadata and declarations */
frontmatter_fields = name_field
                   | description_field
                   | types_field          /* v0.9: moved from ## Types section */
                   | input_field          /* v0.9: moved from ## Input section */
                   | context_field        /* v0.9: moved from ## Context section */
                   ;

/* name_field: kebab-case identifier */
/* description_field: "When..." trigger description */
/* types_field: map of type names to type expressions */
/* input_field: map of param names to type/default specs */
/* context_field: map of var names to initial values */

/* Example frontmatter (v0.9):
---
name: my-skill
description: When you need to process items
types:
  Task: any executable instruction
  Strategy: fast | thorough
input:
  task: Task
  strategy: Strategy = "fast"
context:
  iterations: Number = 0
  complete: Boolean = false
---
*/
```

### Type Definitions

```ebnf
type_definition = type_name colon type_expr newline ;

type_name       = dollar upper_ident ;

type_expr       = semantic_type
                | enum_type
                | compound_type
                | array_type
                | function_type
                | type_reference
                ;

semantic_type   = { any_char } ;  /* Natural language description */

enum_type       = enum_value { pipe enum_value } ;
enum_value      = string_literal ;

compound_type   = lparen type_expr { comma type_expr } rparen ;

array_type      = ( type_reference | compound_type ) "[]" ;

function_type   = param_list arrow type_expr ;
param_list      = var_name | lparen var_name { comma var_name } rparen ;

type_reference  = dollar upper_ident ;
```

### Variable Declarations

```ebnf
variable_declaration = var_decl [ comment ] newline ;

var_decl        = var_name [ type_annotation ] [ assign_op default_value ] ;

var_name        = dollar ident ;

type_annotation = colon type_reference
                | semantic_type
                ;

/* Default values must be literal values, not prose descriptions */
default_value   = literal
                | var_reference
                | lambda_expr
                ;

/* In WITH clauses, typed param without value is required */
required_param  = var_name type_annotation ;  /* No assign_op or default_value */

/* Inline comments for documentation (ignored by parser) */
comment         = "<!--" { any_char } "-->" ;  /* Standard HTML/Markdown comment */

expression      = lambda_expr
                | value_expr
                ;

lambda_expr     = param_list arrow expr_body ;
param_list      = var_name | lparen var_name { comma var_name } rparen ;
expr_body       = template_literal | { any_char } ;

value_expr      = literal
                | var_reference
                | function_call
                | skill_reference
                | section_reference
                | inline_text
                ;

literal         = string_literal | number_literal | boolean_literal | array_literal ;
boolean_literal = "true" | "false" ;
array_literal   = lbracket [ expression { comma expression } ] rbracket ;

var_reference   = var_name [ accessor ] ;
accessor        = dot ident | lparen expression { comma expression } rparen ;

function_call   = var_name lparen [ expression { comma expression } ] rparen ;
```

### Input Parameters

In the conventional `## Input` section (or `input:` frontmatter in v0.9), parameters follow interface semantics:

```ebnf
input_param     = var_name type_annotation [ assign_op literal ] [ comment ] ;
```

Examples:
```mdz
$problem: $String                    <!-- required (no default) -->
$maxIterations: $Number = 5          <!-- optional with default -->
$strategy: $Strategy = "accumulate"  <!-- optional with enum default -->
```

Note: The `=` sign is reserved for **literal default values only**. Prose descriptions belong in comments (`<!-- -->`), not after `=`.

### Links and Anchors

```ebnf
/* v0.8: Link-based reference syntax using paths */
reference         = link | anchor ;

/* Links use ~/ prefix with path segments */
link              = link_prefix path [ '#' kebab_ident ] ;   /* ~/path/to/thing or ~/path#section */
link_prefix       = '~/' ;
path              = kebab_ident { '/' kebab_ident } ;        /* e.g., agent/explorer, skill/validator */

/* Anchors reference sections in current document */
anchor            = '#' kebab_ident ;                        /* #section-name (same-file only) */

/* Folder conventions for links:
   ~/agent/name   → agent reference (./agent/name.mdz)
   ~/skill/name   → skill reference (./skill/name.mdz)
   ~/tool/name    → tool reference (./tool/name.mdz or external)
   ~/skill/name#section → section in skill
*/
```

### Semantic Spans and Inferred Variables

```ebnf
/* Semantic spans are positional: they are parsed from the surrounding grammar
   (e.g., after DELEGATE, after TO in USE/EXECUTE, or as a fallback condition). */
semantic_span     = { any_char } ;

/* Inferred variables - value derived by LLM at runtime */
inferred_var      = dollar inferred_delim inferred_content inferred_delim ;
inferred_content  = { any_char } ;
```

### Control Flow

MDZ distinguishes between **runtime control flow** (CAPS keywords executed by the LLM) and **macros** (not yet implemented, but conceptually `{{IF}}` for build-time expansion).

```ebnf
/* Runtime control flow - LLM interprets at execution time */
control_flow      = for_stmt
                  | while_stmt
                  | if_stmt
                  | break_stmt
                  | continue_stmt
                  | return_stmt             /* v0.9 */
                  | do_stmt                 /* v0.9, v0.10 */
                  | push_stmt               /* v0.9 */
                  | delegate_stmt           /* v0.8, updated v0.9 */
                  | use_stmt                /* v0.8 */
                  | execute_stmt            /* v0.8 */
                  | goto_stmt               /* v0.8 */
                  ;

for_stmt          = FOR pattern IN collection [ DO ] newline block_body END newline ;

pattern           = var_name
                  | lparen var_name { comma var_name } rparen
                  ;

collection        = var_reference | array_literal ;

while_stmt        = WHILE condition [ DO ] newline block_body END newline ;

/* IF uses optional THEN delimiter - parentheses are optional (not required) */
if_stmt           = IF condition [ THEN ] newline block_body { else_if_clause } [ else_clause ] END newline ;
else_if_clause    = ELSE IF condition [ THEN ] newline block_body ;
else_clause       = ELSE newline block_body ;

break_stmt        = BREAK newline ;
continue_stmt     = CONTINUE newline ;

/* v0.9: Return statement - valid only at end of section or loop iteration */
return_stmt       = RETURN [ expression ] newline ;

/* v0.9/v0.10: DO statement - standalone or block instruction */
do_stmt           = DO semantic_span newline
                  | DO newline block_body END newline
                  ;

/* v0.9: Push statement - collect values into arrays */
push_stmt         = var_reference push_op expression newline ;

/* v0.8/v0.9: Link-based statements */

/* v0.9: DELEGATE - spawn agent with task
   - TO target is now optional (uses default/inferred target)
   - ASYNC modifier = fire-and-forget
   - AWAIT modifier = wait for result (default behavior)
*/
delegate_stmt     = [ ASYNC | AWAIT ] DELEGATE [ semantic_span ] [ TO link ] [ WITH ( anchor | colon newline with_params ) ] newline
                  ;
/* Examples:
   DELEGATE task TO ~/agent/x                    -- inline, no params
   DELEGATE task TO ~/agent/x WITH #template     -- inline with anchor
   DELEGATE task TO ~/agent/x WITH:              -- inline with params
     param: value
   DELEGATE task                                 -- no target (v0.9)
   ASYNC DELEGATE task TO ~/agent/x              -- fire-and-forget (v0.9)
   AWAIT DELEGATE task TO ~/agent/x              -- wait for result (v0.9)
*/

/* USE - follow skill instructions */
use_stmt          = USE link TO semantic_span newline ;                     /* USE ~/skill/x TO task */

/* EXECUTE - invoke tool */
execute_stmt      = EXECUTE link TO semantic_span newline ;                 /* EXECUTE ~/tool/x TO action */

/* GOTO - control flow to section */
goto_stmt         = GOTO anchor newline ;                                     /* GOTO #section */

dollar_ident      = dollar ident ;

condition         = comparison_expr { logical_op comparison_expr } ;
comparison_expr   = simple_condition | lparen condition rparen ;
simple_condition  = semantic_condition | deterministic_condition ;

/* Semantic conditions: LLM interprets the meaning (positional fallback) */
semantic_condition = [ NOT ] semantic_span ;  /* e.g., diminishing returns */

/* Deterministic conditions: compiler can validate */
deterministic_condition = var_reference comparison_op value_expr ;

comparison_op     = '=' | "!=" | '<' | '>' | "<=" | ">=" ;
logical_op        = AND | OR ;

block_body        = { block_line } ;
block_line        = block newline ;
```

### Control Flow vs Macros

| Construct | Syntax | When Resolved | Who Resolves |
|-----------|--------|---------------|--------------|
| Runtime IF | `IF condition THEN` | Runtime | LLM |
| Runtime ELSE IF | `ELSE IF condition THEN` | Runtime | LLM |
| Build-time IF | `{{IF (x)}}` | Build time | Tooling |
| Runtime WHILE | `WHILE condition DO` | Runtime | LLM |
| Runtime FOR | `FOR $x IN $y` | Runtime | LLM |

**Note:** The `{{macro}}` syntax is specified here for completeness but is not yet implemented in the parser or compiler.

### Composition

```ebnf
/* v0.8: Skill composition using USE statement */
use_stmt          = USE link TO semantic_span [ colon newline with_params ] ;

with_clause       = WITH colon newline { with_param } ;

/* v0.9: WITH param syntax uses colon instead of equals, no $ prefix */
with_param        = whitespace whitespace ident colon expression [ comment ] newline ;
with_params       = { with_param } ;

/* Old syntax (v0.8):
   - $param = value
   
   New syntax (v0.9):
     param: value
*/
```

### Agent Delegation (v0.9)

Agent delegation spawns a subagent with a task. This is distinct from skill composition:
- **Skill composition** (`USE ~/skill/x TO task`) follows skill logic in the current context
- **Agent delegation** (`DELEGATE task TO ~/agent/x`) spawns an independent subagent
- **Tool execution** (`EXECUTE ~/tool/x TO action`) invokes an external tool

```ebnf
/* v0.9: Agent delegation - spawning subagents
   - ASYNC modifier: fire-and-forget (don't wait for result)
   - AWAIT modifier: wait for result (default behavior)
   - TO target is optional (uses default/inferred target)
*/
delegate_stmt     = [ ASYNC | AWAIT ] DELEGATE [ semantic_span ] [ TO link ] [ WITH ( anchor | colon newline with_params ) ] newline ;

/* Examples:
   DELEGATE task TO ~/agent/explorer              -- spawn and wait (default)
   ASYNC DELEGATE task TO ~/agent/explorer        -- fire-and-forget
   AWAIT DELEGATE task TO ~/agent/explorer        -- explicit wait
   DELEGATE task                                  -- inferred target
   DELEGATE task TO ~/agent/x WITH #template      -- with context template
   DELEGATE task TO ~/agent/x WITH:               -- with inline params
     param: value
*/
```

### Prose Content

```ebnf
paragraph         = { inline_content } newline { inline_content newline } newline ;

inline_content    = text
                  | var_reference
                  | reference
                  | emphasis
                  | strong
                  | code_span
                  ;

text              = { any_char } ;  /* Excluding special syntax */

emphasis          = '*' { any_char } '*' | '_' { any_char } '_' ;
strong            = "**" { any_char } "**" | "__" { any_char } "__" ;
code_span         = '`' { any_char } '`' ;
code_block        = "```" [ language ] newline { any_char } "```" newline ;
language          = ident ;

list              = { list_item } ;
list_item         = list_marker inline_content newline [ nested_list ] ;
nested_list       = { whitespace whitespace list_item } ;
```

## Precedence Rules

### Expression Precedence (highest to lowest)

1. **Grouping**: `( )` - Parenthesized expressions
2. **Member access**: `.` - Property/member access
3. **Function call**: `()` - Function invocation
4. **Push**: `<<` - Array push operator (v0.9)
5. **Comparison**: `=`, `!=`, `<`, `>`, `<=`, `>=`
6. **Logical NOT**: `NOT`
7. **Logical AND**: `AND`
8. **Logical OR**: `OR`
9. **Lambda**: `=>` - Binds loosest for expression body

### Disambiguation Rules

#### Rule 1: Type Definition vs Variable Declaration

A line starting with `$` followed by an uppercase letter is a **type definition** if:
- It's at the start of a line
- The identifier starts with uppercase
- Followed by `:` and a type expression (not a type reference)

```
$Task: description           → Type definition
$task = value                → Variable declaration
$task: $Task = value         → Variable declaration (: followed by $Type)
```

#### Rule 2: Lambda vs Assignment

An expression with `=>` is a **lambda** if:
- The left side of `=` contains a param list
- Followed by `=>` and an expression body

```
$fn = $x => expression       → Lambda
$fn = value                  → Assignment
```

#### Rule 3: Semantic Span Boundaries

Semantic spans are positional and derived from grammar context:
- Instructions follow keywords like `DELEGATE`, `DO`, or `TO`
- Conditions become semantic when they don't match deterministic grammar
- Inferred variables still use `$/.../`

```
DELEGATE process item TO ~/agent/worker   → Instruction span
IF diminishing returns THEN              → Semantic condition
$/inferred name/                          → Inferred variable (LLM derives value)
$var: description = value                 → Semantic type annotation
```

#### Rule 4: Control Flow Blocks

END determines block membership:
- Content between the opening keyword and `END` belongs to the block
- `ELSE IF` and `ELSE` belong to the most recent `IF`
- Nested control flow is allowed without extra indentation

```
FOR $x IN $items
  DO process $x             ← Part of FOR block
  IF $x = "special" THEN    ← Nested control flow
    DO handle special       ← Part of IF block
  END
  DO continue processing    ← Back to FOR block
END
Done with loop              ← Outside block
```

#### Rule 5: Link Parsing

`~/` starts a link that extends to whitespace or end of line:
- `~/skill/name` - Skill link
- `~/agent/name` - Agent link
- `~/tool/name` - Tool link
- `~/skill/name#section` - Section in another skill

`#` at word boundary starts an anchor (same-file section):
- `#section` - Section reference in current document

#### Rule 6: BREAK/CONTINUE/RETURN Scope

BREAK and CONTINUE are only valid within loops:
- FOR loops
- WHILE loops

RETURN is only valid at the end of:
- A section (last statement)
- A loop iteration (last statement in loop body)

```
FOR $item IN $items
  IF $done THEN
    BREAK                   ← Valid: inside FOR
  END
  $results << $item         ← Push to array
  RETURN $item              ← Valid: end of loop iteration
END

BREAK                       ← Error: outside loop
RETURN $value               ← Valid: end of section
```

#### Rule 7: Keyword Placement Rule (v0.10)

CAPS keywords must appear at line start (optionally with leading whitespace):

```
FOR $x IN $items            ← Valid: line start
  IF $x THEN                ← Valid: indented position
    BREAK                   ← Valid: indented position
  END
END

The FOR loop runs...        ← Prose, not parsed as control flow
```

Keywords affected: FOR, IN, WHILE, DO, IF, THEN, ELSE, END, AND, OR, NOT, WITH, BREAK, CONTINUE, RETURN, DELEGATE, TO, ASYNC, AWAIT, USE, EXECUTE, GOTO

#### Rule 8: DO Disambiguation (v0.10)

`DO` has three forms:
- After `WHILE`: optional delimiter for the condition
- After `FOR`: optional delimiter for the collection
- At line start: standalone instruction (single-line or block)

```
WHILE $x < 5 DO
  DO process
END

FOR $item IN $items DO
  DO process $item
END

DO analyze the situation  ← Standalone single-line DO (top-level only)

DO
  summarize findings
END
```

Invalid (single-line DO inside a fence):
````md
```md
DO summarize findings
```
````

#### Rule 9: DELEGATE vs USE vs EXECUTE

Each keyword has a distinct purpose:

```
DELEGATE task TO ~/agent/explorer      ← Spawns subagent
ASYNC DELEGATE task TO ~/agent/x       ← Fire-and-forget subagent
AWAIT DELEGATE task TO ~/agent/x       ← Wait for subagent result
DELEGATE task                          ← Inferred target
USE ~/skill/validator TO validate      ← Follows skill instructions
EXECUTE ~/tool/browser TO screenshot   ← Invokes external tool
GOTO #section                            ← Control flow to section
```

- DELEGATE spawns an independent agent (ASYNC = fire-and-forget, AWAIT = wait)
- USE loads and follows skill instructions in current context
- EXECUTE invokes an external tool
- GOTO jumps to a section in the current document

#### Rule 10: Parentheses Requirements

Parentheses are required in some contexts and optional in others:

| Context | Required? | Reason |
|---------|-----------|--------|
| `WHILE condition DO` | No | `DO` keyword delimits condition (like `THEN` for `IF`) |
| `IF condition THEN` | No | Conditions may be semantic (prose) |
| `FOR $x IN ...` | No | Single variable pattern |
| `FOR ($a, $b) IN ...` | **Yes** | Destructuring pattern |
| `$x => expr` | No | Single lambda parameter |
| `($a, $b) => expr` | **Yes** | Multiple lambda parameters |
| `$fn($arg)` | **Yes** | Function call syntax |
| `($A, $B)` | **Yes** | Compound type definition |

```
<!-- WHILE uses DO delimiter (like IF uses THEN) -->
WHILE $x < 5 DO                 ← Valid
WHILE NOT complete DO         ← Valid (semantic condition)
WHILE $x < 5 AND NOT done DO  ← Valid (compound condition)

<!-- IF uses THEN delimiter -->
IF $x = 5 THEN              ← Valid
IF ($x = 5) THEN            ← Also valid (optional parens for grouping)
IF diminishing returns THEN ← Valid (semantic condition)

<!-- Destructuring requires parens -->
FOR ($a, $b) IN $pairs      ← Valid
FOR $a, $b IN $pairs        ← Parse error
```

## Error Productions

For error recovery, the parser recognizes these malformed constructs:

```ebnf
error_unclosed_link      = '~/' { any_char } ( newline | EOF ) ;   /* Malformed link */
error_invalid_type_name  = dollar lower_ident assign_op { any_char } newline ;
error_malformed_control  = ( FOR | WHILE | IF | DELEGATE | USE | EXECUTE | GOTO | DO | RETURN | ASYNC | AWAIT ) { any_char } ( newline | EOF ) ;
error_break_outside_loop = BREAK ; /* When not inside a loop */
error_continue_outside_loop = CONTINUE ; /* When not inside a loop */
error_return_not_at_end  = RETURN ; /* When not at end of section or loop iteration */
error_invalid_link_path  = link_prefix { any_char } ; /* Link path doesn't resolve to valid resource */
error_invalid_anchor     = '#' kebab_ident ; /* Anchor references non-existent section */
```

## Whitespace Handling

- **Cosmetic**: Indentation is optional and does not affect block membership
- **Insignificant**: Around operators, within expressions
- **Line-sensitive**: Type definitions, variable declarations, control flow

```ebnf
/* Whitespace is insignificant in these contexts */
around_op       = { whitespace } operator { whitespace } ;
```

## What Tooling Validates

The grammar enables deterministic validation:

| What | How Checked | Error Code |
|------|-------------|------------|
| Syntax correctness | Parser rules | E001-E007 |
| Type reference exists | Symbol table lookup | E008 (warning) |
| Link path resolves | File system / registry | E009 (error) |
| Anchor reference valid | Heading extraction | E010 (error) |
| BREAK/CONTINUE in loop | Loop depth tracking | E011 (error) |
| RETURN at end position | Block analysis | E015 (error) |
| Dependency cycles | Graph analysis | E012 (error) |
| Link folder convention | Path prefix check | W002 (warning) |
| Keyword placement | Line position check | W003 (warning) |

## What Tooling Does NOT Do

The grammar describes validation, not transformation:

- **No type expansion** - `$Task` stays `$Task`
- **No reference inlining** - `~/skill/x` stays `~/skill/x`
- **No semantic transformation** - instruction spans stay as authored
- **No output compilation** - Source IS the output

## Examples

### Complete Skill Example

```mdz
---
name: task-processor
description: When you need to process items with delegation
types:
  Task: any executable instruction
  Strategy: fast | thorough
  Result: outcome of executing a task
input:
  task: Task
  strategy: Strategy = "fast"
  items: Task[]
context:
  path: $n => `output-${n}.md`
  current: FilePath = $path(0)
  iterations: Number = 0
  results: Result[] = []
  complete: Boolean = false
---

## Workflow

Setup at appropriate location

FOR $item IN $items
  IF $item.invalid THEN
    CONTINUE
  END
  DO process $item according to $strategy
  $results << $item
  IF $item.triggers_stop THEN
    BREAK
  END
END

FOR ($item, $priority) IN $prioritized
  IF $priority = "high" THEN
    DO expedite processing
  ELSE
    DO queue for later
  END
END

WHILE NOT $complete AND $iterations < 5 DO
  GOTO #process-step
  USE ~/skill/item-validator TO validate current state
END

ASYNC DELEGATE find related patterns TO ~/agent/explorer WITH #context-template

AWAIT DELEGATE analyze the findings TO ~/agent/analyzer

DELEGATE background task

EXECUTE ~/tool/browser TO capture final screenshot

RETURN $results

## Process Step

USE ~/skill/omr TO apply transforms:
  transforms: [("Apply heuristic", "accumulate")]
  validator: $Task              <!-- Required parameter -->

## Context Template

Provide context for the explorer.
Current results: $results
Strategy: $strategy
```

## Version

Grammar version: 0.11
Aligned with: language-spec.md v0.11

### Changes from v0.11

- **Breaking change**: Removed `/.../` semantic markers in favor of positional instruction/condition spans
- Semantic type annotations are now unquoted prose after `:`
- Inferred variables keep `$/.../` syntax

### Changes from v0.10

- **Breaking change**: END-delimited blocks replace indentation-based blocks
- **Control flow**:
  - `FOR EACH` replaced by `FOR $x IN $y`
  - `END` closes `FOR`, `WHILE`, `IF/ELSE`, and multi-line `DO`
  - `DO` optional after `FOR`/`WHILE`
  - `THEN` optional after `IF`/`ELSE IF`
- **Removed colon delimiters**: `THEN:` → `THEN`, `DO:` → `DO`
- **Indentation cosmetic only**: no effect on block membership
- **DO blocks**: single-line `DO instruction` and multi-line `DO ... END`
- **Single-line DO restriction**: valid only at top-level (outside fences)

### Changes from v0.9

- **New keywords**: `RETURN`, `ASYNC`, `AWAIT`
- **Removed keywords**: `PARALLEL`
- **New operators**: `<<` (push operator for array collection)
- **New statements**:
  - `RETURN [expression]` - Return from section or loop iteration
  - `DO prose instruction` - Standalone prose instruction
  - `$array << value` - Push value to array
- **Updated DELEGATE syntax**:
  - `TO target` is now optional
  - `ASYNC DELEGATE` - Fire-and-forget (don't wait)
  - `AWAIT DELEGATE` - Wait for result (default behavior)
- **Updated WITH param syntax**:
  - Old: `- $param = value`
  - New: `  param: value` (colon instead of equals, no $ prefix)
- **Removed `PARALLEL FOR EACH`** - Replaced by `ASYNC DELEGATE` pattern
- **Frontmatter declarations**: `types:`, `input:`, `context:` fields in frontmatter
  - `## Types`, `## Input`, `## Context` sections are deprecated
- **New disambiguation rules**:
  - Colon rule: colon at line end signals indented block
  - Keyword placement rule: CAPS keywords at line start or indented
  - DO disambiguation: WHILE...DO vs standalone DO
  - RETURN scope: only at end of section or loop iteration
- **New error codes**:
  - E015: RETURN not at end position
  - W003: Keyword placement warning

### Changes from v0.7

- **Breaking change**: Replaced sigil-based `(reference)` syntax with link-based `~/path` syntax
- New link syntax:
  - `~/agent/name` - Agent link
  - `~/skill/name` - Skill link
  - `~/tool/name` - Tool link
  - `~/skill/name#section` - Section in skill link
  - `#section` - Same-file anchor (unchanged)
- Removed `uses:` frontmatter field - dependencies inferred from statements
- New keywords: `USE`, `EXECUTE`, `GOTO`
- New statement forms:
  - `DELEGATE task TO ~/agent/x` - Spawn agent
  - `USE ~/skill/x TO task` - Follow skill
  - `EXECUTE ~/tool/x TO action` - Invoke tool
  - `GOTO #section` - Control flow
- Added `WITH #template` clause for passing context to delegates
- Removed `at_sign`, `tilde`, `bang` operators (replaced by link_prefix)
- Folder conventions: `agent/`, `skill/`, `tool/` prefixes in links

### Changes from v0.6

- **Breaking change**: Replaced `[[wiki-link]]` syntax with sigil-based `(reference)` syntax
- New reference types with sigils:
  - `(@agent)` - Agent reference
  - `(~skill)` - Skill reference
  - `(#section)` - Section reference
  - `(!tool)` - Tool reference
  - `(~skill#section)` - Cross-skill section reference
- Unified `uses:` frontmatter field with sigil-prefixed identifiers
- Removed separate `skills:`, `agents:`, `tools:` frontmatter fields
- Added `at_sign`, `tilde`, `bang` operators
- Removed `double_lbracket` and `double_rbracket` operators
- Updated `delegate_stmt` to use new agent reference syntax
- Added E014 error code for undeclared tool references

### Changes from v0.5

- Added `DELEGATE` and `TO` keywords for agent delegation
- Added `delegate_stmt` production for spawning subagents
- Added `agent_ref` production for agent references
- Added frontmatter fields: `skills:`, `agents:`, `tools:`

### Changes from v0.4

- Changed semantic marker syntax from `{~~content}` to `/content/` (removed in v0.11)
- Added inferred variable syntax `$/name/`
- Added semantic type annotation syntax `: /description/` (now unquoted prose)
- Updated `semantic_delim` operator (replaces `semantic_open` and `semantic_close`)

### Changes from v0.3

- Changed type definition syntax from `$Type = expr` to `$Type: expr`
- Uses `:` for type definitions (like TypeScript interfaces)
- Avoids confusion with assignment (`=`)

### Changes from v0.2

- Aligned version number with language-spec.md
- Added "What Tooling Validates" section
- Added "What Tooling Does NOT Do" section (source = output)
- Added control flow vs macros distinction table
- Clarified that macros (`{{IF}}`) are not yet implemented

### Changes from v0.1

- Added `PARALLEL` keyword and `parallel_for_each_stmt`
- Added `BREAK` and `CONTINUE` statements
- Added `break_stmt` and `continue_stmt` productions
- Extended `with_param` to support required parameters
- Added error productions for BREAK/CONTINUE outside loops
