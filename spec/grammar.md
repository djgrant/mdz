# MDZ Grammar Specification

## Overview

This document defines the formal grammar for MDZ v0.3 in Extended Backus-Naur Form (EBNF).

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
template_char   = ? any char except '`' and '${' and '/' ? ;
template_expr   = '${' expression '}' | semantic_marker ;
```

### Keywords

```ebnf
/* Runtime control flow - executed by the LLM */
FOR             = "FOR" ;
EACH            = "EACH" ;
IN              = "IN" ;
WHILE           = "WHILE" ;
DO              = "DO" ;           /* v0.3: WHILE...DO syntax */
IF              = "IF" ;
THEN            = "THEN" ;
ELSE            = "ELSE" ;
AND             = "AND" ;
OR              = "OR" ;
NOT             = "NOT" ;
WITH            = "WITH" ;
PARALLEL        = "PARALLEL" ;     /* v0.2 */
BREAK           = "BREAK" ;        /* v0.2 */
CONTINUE        = "CONTINUE" ;     /* v0.2 */
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

lparen          = '(' ;
rparen          = ')' ;
lbracket        = '[' ;
rbracket        = ']' ;
lbrace          = '{' ;
rbrace          = '}' ;
double_lbracket = "[[" ;
double_rbracket = "]]" ;
semantic_delim  = '/' ;
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
/* Frontmatter fields for skill metadata */
frontmatter_fields = name_field description_field [ uses_field ] ;
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
variable_declaration = [ list_marker ] var_decl [ comment ] newline ;

var_decl        = var_name [ type_annotation ] [ assign_op default_value ] ;

var_name        = dollar ident ;

type_annotation = colon type_reference
                | semantic_type_annotation
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
                | semantic_marker
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

In the conventional `## Input` section, parameters follow interface semantics:

```ebnf
input_param     = list_marker var_name type_annotation [ assign_op literal ] [ comment ] ;
```

Examples:
```mdz
- $problem: $String                    <!-- required (no default) -->
- $maxIterations: $Number = 5          <!-- optional with default -->
- $strategy: $Strategy = "accumulate"  <!-- optional with enum default -->
```

Note: The `=` sign is reserved for **literal default values only**. Prose descriptions belong in comments (`<!-- -->`), not after `=`.

### References

```ebnf
skill_reference   = double_lbracket skill_name double_rbracket ;
skill_name        = kebab_ident ;

section_reference = double_lbracket [ skill_name ] hash section_name double_rbracket ;
section_name      = kebab_ident ;

reference         = skill_reference | section_reference ;
```

### Semantic Markers

```ebnf
semantic_marker   = semantic_delim semantic_content semantic_delim ;
semantic_content  = { semantic_char | var_reference } ;
semantic_char     = ? any char except '/' and '$' and newline ? ;

/* Inferred variables - value derived by LLM at runtime */
inferred_var      = dollar semantic_marker ;
inferred_name     = { letter | digit | whitespace } ;

/* Semantic type annotations - describes what a value should be */
semantic_type_annotation = colon semantic_marker ;
```

### Control Flow

MDZ distinguishes between **runtime control flow** (CAPS keywords executed by the LLM) and **macros** (not yet implemented, but conceptually `{{IF}}` for build-time expansion).

```ebnf
/* Runtime control flow - LLM interprets at execution time */
control_flow      = for_each_stmt
                  | parallel_for_each_stmt
                  | while_stmt
                  | if_then_stmt
                  | break_stmt
                  | continue_stmt
                  ;

for_each_stmt     = FOR EACH pattern IN collection colon newline block_body ;

parallel_for_each_stmt = PARALLEL FOR EACH pattern IN collection colon newline block_body ;

pattern           = var_name
                  | lparen var_name { comma var_name } rparen
                  ;

collection        = var_reference | array_literal ;

while_stmt        = WHILE condition DO colon newline block_body ;

/* IF uses THEN as delimiter - parentheses are optional (not required) */
if_then_stmt      = IF condition THEN colon newline block_body [ else_clause ] ;
else_clause       = ELSE colon newline block_body ;

break_stmt        = [ list_marker ] BREAK newline ;
continue_stmt     = [ list_marker ] CONTINUE newline ;

condition         = comparison_expr { logical_op comparison_expr } ;
comparison_expr   = simple_condition | lparen condition rparen ;
simple_condition  = semantic_condition | deterministic_condition ;

/* Semantic conditions: LLM interprets the meaning */
semantic_condition = NOT? { word } ;  /* e.g., "diminishing returns" */

/* Deterministic conditions: compiler can validate */
deterministic_condition = var_reference comparison_op value_expr ;

comparison_op     = '=' | "!=" | '<' | '>' | "<=" | ">=" ;
logical_op        = AND | OR ;

block_body        = { indented_line } ;
indented_line     = whitespace whitespace block newline ;  /* 2+ space indent */
```

### Control Flow vs Macros

| Construct | Syntax | When Resolved | Who Resolves |
|-----------|--------|---------------|--------------|
| Runtime IF | `IF condition THEN:` | Runtime | LLM |
| Build-time IF | `{{IF (x)}}` | Build time | Tooling |
| Runtime WHILE | `WHILE condition DO:` | Runtime | LLM |
| Runtime FOR EACH | `FOR EACH $x IN $y:` | Runtime | LLM |

**Note:** The `{{macro}}` syntax is specified here for completeness but is not yet implemented in the parser or compiler.

### Composition

```ebnf
delegation        = delegate_verb reference [ with_clause ] ;
delegate_verb     = "Execute" | "Delegate" | "Use" | ? verb phrase ? ;

with_clause       = WITH colon newline { with_param } ;
with_param        = list_marker ( var_decl | required_param ) [ comment ] newline ;
```

### Prose Content

```ebnf
paragraph         = { inline_content } newline { inline_content newline } newline ;

inline_content    = text
                  | var_reference
                  | reference
                  | semantic_marker
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
4. **Comparison**: `=`, `!=`, `<`, `>`, `<=`, `>=`
5. **Logical NOT**: `NOT`
6. **Logical AND**: `AND`
7. **Logical OR**: `OR`
8. **Lambda**: `=>` - Binds loosest for expression body

### Disambiguation Rules

#### Rule 1: Type Definition vs Variable Declaration

A line starting with `$` followed by an uppercase letter is a **type definition** if:
- It's at the start of a line (ignoring leading list markers)
- The identifier starts with uppercase
- Followed by `:` and a type expression (not a type reference)

```
$Task: description           → Type definition
$task = value                → Variable declaration
- $task: $Task = value       → Variable declaration (: followed by $Type)
```

#### Rule 2: Lambda vs Assignment

An expression with `=>` is a **lambda** if:
- The left side of `=` contains a param list
- Followed by `=>` and an expression body

```
$fn = $x => expression       → Lambda
$fn = value                  → Assignment
```

#### Rule 3: Semantic Marker Boundary

`/` starts a semantic marker that extends to the next `/`:
- No nesting allowed
- Variables within are interpolated
- Cannot contain newlines

```
/content with $var/          → Semantic marker with var interpolation
$/inferred name/             → Inferred variable (LLM derives value)
$var: /description/ = value  → Semantic type annotation
//content//                  → Error: invalid syntax (empty marker)
```

#### Rule 4: Control Flow Blocks

Indentation determines block membership:
- Content indented beyond the control flow keyword belongs to the block
- First non-indented line ends the block
- Nested control flow must be further indented

```
FOR EACH $x IN $items:
  - Process $x              ← Part of FOR EACH block
  - IF $x = "special" THEN: ← Nested control flow
    - Handle special        ← Part of IF block
  - Continue processing     ← Back to FOR EACH block
Done with loop              ← Outside block
```

#### Rule 5: Reference Parsing

`[[` starts a reference that extends to matching `]]`:
- `[[name]]` - Skill reference
- `[[#section]]` - Section reference in current document
- `[[name#section]]` - Section in another skill

#### Rule 6: BREAK/CONTINUE Scope

BREAK and CONTINUE are only valid within loops:
- FOR EACH loops
- PARALLEL FOR EACH loops
- WHILE loops

```
FOR EACH $item IN $items:
  - IF $done THEN:
    - BREAK                 ← Valid: inside FOR EACH
  
BREAK                       ← Error: outside loop
```

#### Rule 7: Parentheses Requirements

Parentheses are required in some contexts and optional in others:

| Context | Required? | Reason |
|---------|-----------|--------|
| `WHILE condition DO:` | No | `DO` keyword delimits condition (like `THEN` for `IF`) |
| `IF condition THEN:` | No | Conditions may be semantic (prose) |
| `FOR EACH $x IN ...` | No | Single variable pattern |
| `FOR EACH ($a, $b) IN ...` | **Yes** | Destructuring pattern |
| `$x => expr` | No | Single lambda parameter |
| `($a, $b) => expr` | **Yes** | Multiple lambda parameters |
| `$fn($arg)` | **Yes** | Function call syntax |
| `($A, $B)` | **Yes** | Compound type definition |

```
<!-- WHILE uses DO delimiter (like IF uses THEN) -->
WHILE $x < 5 DO:                 ← Valid
WHILE NOT complete DO:           ← Valid (semantic condition)
WHILE $x < 5 AND NOT done DO:    ← Valid (compound condition)

<!-- IF uses THEN delimiter -->
IF $x = 5 THEN:              ← Valid
IF ($x = 5) THEN:            ← Also valid (optional parens for grouping)
IF diminishing returns THEN: ← Valid (semantic condition)

<!-- Destructuring requires parens -->
FOR EACH ($a, $b) IN $pairs: ← Valid
FOR EACH $a, $b IN $pairs:   ← Parse error
```

## Error Productions

For error recovery, the parser recognizes these malformed constructs:

```ebnf
error_unmatched_bracket  = ( "[[" | "[" ) { any_char } EOF ;
error_unclosed_semantic  = '/' { any_char } ( newline | EOF ) ;
error_invalid_type_name  = dollar lower_ident assign_op { any_char } newline ;
error_malformed_control  = ( FOR | WHILE | IF | PARALLEL ) { any_char } ( newline | EOF ) ;
error_break_outside_loop = BREAK ; /* When not inside a loop */
error_continue_outside_loop = CONTINUE ; /* When not inside a loop */
```

## Whitespace Handling

- **Significant**: Indentation in control flow blocks
- **Insignificant**: Around operators, within expressions
- **Line-sensitive**: Type definitions, variable declarations, control flow

```ebnf
/* Whitespace is significant for indentation */
indent_level    = { whitespace whitespace } ;  /* Each level = 2 spaces */

/* Whitespace is insignificant in these contexts */
around_op       = { whitespace } operator { whitespace } ;
```

## What Tooling Validates

The grammar enables deterministic validation:

| What | How Checked | Error Code |
|------|-------------|------------|
| Syntax correctness | Parser rules | E001-E007 |
| Type reference exists | Symbol table lookup | E008 (warning) |
| Skill reference declared | Frontmatter `uses:` check | W001 (warning) |
| Section reference valid | Heading extraction | E010 (error) |
| BREAK/CONTINUE in loop | Loop depth tracking | E011 (error) |
| Dependency cycles | Graph analysis | E012 (error) |

## What Tooling Does NOT Do

The grammar describes validation, not transformation:

- **No type expansion** - `$Task` stays `$Task`
- **No reference inlining** - `[[skill]]` stays `[[skill]]`
- **No semantic transformation** - `/content/` stays `/content/`
- **No output compilation** - Source IS the output

## Examples

### Complete Skill Example

```mdz
---
name: parallel-processor
description: When you need to process items concurrently
uses:
  - validator
  - item-validator
  - omr
---

## Types

$Task: any executable instruction
$Strategy: "fast" | "thorough"
$Result: outcome of executing a task

## Input

- $task: $Task                       <!-- the task to execute -->
- $strategy: $Strategy = "fast"      <!-- execution strategy -->
- $items: $Task[]                    <!-- items to process -->

## Context

- $path = $n => `output-{$n}.md`
- $current: $FilePath = $path(0)
- $iterations: $Number = 0

## Workflow

1. Setup at /appropriate location/

2. PARALLEL FOR EACH $item IN $items:
   - IF $item.invalid THEN:
     - CONTINUE
   - Process $item with $priority
   - IF $item.triggers_stop THEN:
     - BREAK

3. FOR EACH ($item, $priority) IN $prioritized:
   - IF $priority = "high" THEN:
     - Expedite processing
   - ELSE:
     - Queue for later

4. WHILE NOT complete AND $iterations < 5 DO:
   - Execute [[#process-step]]
   - Validate with [[item-validator]]

5. Return $result

## Process Step

Execute [[omr]] WITH:
  - $transforms = [("Apply heuristic", "accumulate")]
  - $validator: $Task              <!-- Required parameter -->
```

## Version

Grammar version: 0.5
Aligned with: language-spec.md v0.5

### Changes from v0.4

- Changed semantic marker syntax from `{~~content}` to `/content/`
- Added inferred variable syntax `$/name/`
- Added semantic type annotation syntax `: /description/`
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
