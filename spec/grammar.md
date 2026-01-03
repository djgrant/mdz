# Zen Grammar Specification

## Overview

This document defines the formal grammar for Zen v0.2 in Extended Backus-Naur Form (EBNF).

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
template_char   = ? any char except '`' and '${' and '{~~' ? ;
template_expr   = '${' expression '}' | '{~~' semantic_content '}' ;
```

### Keywords

```ebnf
FOR             = "FOR" ;
EACH            = "EACH" ;
IN              = "IN" ;
WHILE           = "WHILE" ;
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
semantic_open   = "{~~" ;
semantic_close  = '}' ;
```

### Comments and Markdown

```ebnf
line_comment    = ? markdown blockquote starting with '>' ? ;
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

### Frontmatter Schema (v0.2)

```ebnf
/* Extended for v0.2 with imports */
frontmatter_fields = name_field description_field [ uses_field ] [ imports_field ] ;

imports_field   = "imports:" newline { import_entry } ;
import_entry    = "- path:" string_literal newline
                  [ "skills:" skill_list newline ]
                  [ "alias:" newline { alias_entry } ] ;
skill_list      = '[' [ ident { ',' ident } ] ']' ;
alias_entry     = ident ':' ident newline ;
```

### Type Definitions

```ebnf
type_definition = type_name assign_op type_expr newline ;

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
variable_declaration = [ list_marker ] var_decl newline ;

var_decl        = var_name [ type_annotation ] [ assign_op expression ] ;

var_name        = dollar ident ;

type_annotation = colon type_reference ;

/* v0.2: In WITH clauses, typed param without value is required */
required_param  = var_name type_annotation ;  /* No assign_op or expression */

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
semantic_marker   = semantic_open semantic_content semantic_close ;
semantic_content  = { semantic_char | var_reference } ;
semantic_char     = ? any char except '}' and '$' ? ;
```

### Control Flow

```ebnf
control_flow      = for_each_stmt
                  | parallel_for_each_stmt     /* v0.2 */
                  | while_stmt
                  | if_then_stmt
                  | break_stmt                  /* v0.2 */
                  | continue_stmt               /* v0.2 */
                  ;

for_each_stmt     = FOR EACH pattern IN collection colon newline block_body ;

/* v0.2: PARALLEL FOR EACH */
parallel_for_each_stmt = PARALLEL FOR EACH pattern IN collection colon newline block_body ;

pattern           = var_name
                  | lparen var_name { comma var_name } rparen
                  ;

collection        = var_reference | array_literal ;

while_stmt        = WHILE lparen condition rparen colon newline block_body ;

if_then_stmt      = IF condition THEN colon newline block_body [ else_clause ] ;
else_clause       = ELSE colon newline block_body ;

/* v0.2: BREAK and CONTINUE */
break_stmt        = [ list_marker ] BREAK newline ;
continue_stmt     = [ list_marker ] CONTINUE newline ;

condition         = comparison_expr { logical_op comparison_expr } ;
comparison_expr   = simple_condition | lparen condition rparen ;
simple_condition  = semantic_condition | deterministic_condition ;

semantic_condition = NOT? { word } ;  /* LLM interprets: "diminishing returns" */
deterministic_condition = var_reference comparison_op value_expr ;

comparison_op     = '=' | "!=" | '<' | '>' | "<=" | ">=" ;
logical_op        = AND | OR ;

block_body        = { indented_line } ;
indented_line     = whitespace whitespace block newline ;  /* 2+ space indent */
```

### Composition

```ebnf
delegation        = delegate_verb reference [ with_clause ] ;
delegate_verb     = "Execute" | "Delegate" | "Use" | ? verb phrase ? ;

with_clause       = WITH colon newline { with_param } ;
/* v0.2: with_param can be required (no default value) */
with_param        = list_marker ( var_decl | required_param ) newline ;
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
- There's an `=` that's not preceded by `:`

```
$Task = description          → Type definition
$task = value                → Variable declaration
- $task: $Task = value       → Variable declaration
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

`{~~` starts a semantic marker that extends to the next `}`:
- No nesting allowed
- Variables within are interpolated

```
{~~content with $var}        → Semantic marker with var interpolation
{{~~content}}                → Error: invalid syntax
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

#### Rule 6: BREAK/CONTINUE Scope (v0.2)

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

## Error Productions

For error recovery, the parser recognizes these malformed constructs:

```ebnf
error_unmatched_bracket  = ( "[[" | "[" | "{~~" ) { any_char } EOF ;
error_unclosed_semantic  = "{~~" { any_char } ( newline newline | EOF ) ;
error_invalid_type_name  = dollar lower_ident assign_op { any_char } newline ;
error_malformed_control  = ( FOR | WHILE | IF | PARALLEL ) { any_char } ( newline | EOF ) ;
error_break_outside_loop = BREAK ; /* v0.2: When not inside a loop */
error_continue_outside_loop = CONTINUE ; /* v0.2: When not inside a loop */
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

## Examples

### Complete Skill Example with v0.2 Features

```zen
---
name: parallel-processor
description: When you need to process items concurrently
uses:
  - validator
imports:
  - path: "./helpers/"
    skills: [item-validator]
  - path: "@zen/stdlib"
    alias:
      orchestrate-map-reduce: omr
---

## Types

$Task = any executable instruction
$Strategy = "fast" | "thorough"
$Result = outcome of executing a task

## Input

- $task: $Task
- $strategy: $Strategy = "fast"
- $items: $Task[]

## Context

- $path = $n => `output-{$n}.md`
- $current: $FilePath = $path(0)
- $iterations: $Number = 0

## Workflow

1. Setup at {~~appropriate location}

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

4. WHILE (not complete AND $iterations < 5):
   - Execute [[#process-step]]
   - Validate with [[item-validator]]

5. Return $result

## Process Step

Execute [[omr]] WITH:
  - $transforms = [("Apply heuristic", "accumulate")]
  - $validator: $Task              # Required parameter
```

## Version

Grammar version: 0.2
Aligned with: language-spec.md v0.2

### Changes from v0.1

- Added `PARALLEL` keyword and `parallel_for_each_stmt`
- Added `BREAK` and `CONTINUE` statements
- Added `break_stmt` and `continue_stmt` productions
- Extended frontmatter with `imports_field`
- Extended `with_param` to support required parameters
- Added error productions for BREAK/CONTINUE outside loops
