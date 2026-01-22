# MDZ Specification

## 1. Overview

MDZ extends a host text format e.g. Markdown with a small and flexible grammar designed for evaluation by LLMs. Everything else remains host text and is preserved as-is.

The parser yields a stream of blocks that alternate between:
- host blocks (raw host text), and
- MDZ blocks (AST nodes for statements and expressions).

MDZ is indentation-insensitive. Line breaks are meaningful for separating statements and host text, but indentation is treated as presentation only.

Conformance is defined by the fixture suite in `grammar/tests/`.

MDZ differs from conventional programming languages by its flexibility to express non-deterministic behaviours. The language is designed to be intuitive to both humans and LLMs.  

This spec documents both syntax and the intended runtime semantics.

## 2. Lexical and Layout Rules

MDZ is case-sensitive. Keywords are written in all caps to clearly signal an opt-in to programmatic control flow.

MDZ is indentation-insensitive. Indentation is treated as presentation only and must not affect parsing or runtime behavior.

Blocks are delimited by grammar rules, including keywords and line breaks. Prose may be nested within the MDZ AST.

Statements start when a line begins with an MDZ keyword, optionally preceded by a list marker (see below). 

Blank lines are preserved as host text unless inside an MDZ block, in which case they are ignored.

List markers are optional in Markdown hosts to prevent formatters (e.g. Prettier) from stripping indentation. When present, a list marker immediately preceding an
MDZ keyword is ignored by the parser. 

Numbered list markers are not treated as MDZ statements and are parsed as host text.

MDZ does not define its own comment syntax. Use host-language comments (e.g. `<!-- -->` in Markdown).

## 3. Host Text and Block Stream

The parser emits a block stream, preserving host text exactly as it appears in the source, including whitespace and punctuation. Host text is emitted as contiguous blocks until a statement is encountered.

MDZ statements and blocks interleave with host text. A block may contain nested host blocks (e.g. prose inside `FOR`, `IF`, `WHILE`, or `CASE`), which are emitted as `host` nodes inside that block’s AST.

Block boundaries are determined by construct grammar. Once a statement begins, if the required syntax does not follow, parsing fails. For example, after `FOR` the parser expects `IN`.

## 4. Literals and Expressions

### Semantic expressions

```md
<!-- declarative for interpretation -->
$summary = the main argument in one sentence

<!-- imperative for instructions -->
USE ~/skill/debug TO find the root cause
```

**Syntax:** Any unquoted text in expression position (e.g. assignment RHS or condition) is treated as a semantic expression.

**Runtime behaviour:** The executor infers the meaning within the current context.

**Design notes:** Semantic expressions leverage LLMs' ability to infer meaning from context. They are the default syntax, because LLMs already default to interpreting text.

### Literal strings

```
$title = "changelog"
$message = "release #{version}"
```

**Syntax:** Double-quoted strings support interpolation via `#{expr}`; plain strings without interpolation remain a literal value.

**Runtime behaviour:** Interpolated expressions are evaluated and substituted; the result is a single string value.

**Design notes:** Explicit quoting clarifies when an _exact_ value must be used.

### Number literals

```md
$count = 5
$ratio = 0.75
$bytes = 1e3
```

**Syntax:** Numeric forms are written as plain text tokens (e.g. `5`, `0.75`, `1e3`) and are parsed as number literals when the entire value expression is a number.

**Runtime behaviour:** Number literals are treated as exact number values.

**Design notes:** Number parsing is intentionally conservative to avoid interfering with semantic expressions that happen to include digits.

### Links

```md
$snippet = #code-snippet
USE ~/skill/debugger
```

**Syntax:** `#anchor` or `~/path`.

**Runtime behaviour:** Links are resolved by the executor (anchor to section content, path to a prompt file e.g. skill/agent/resource).

**Design notes:** Links are the core primitive for splitting prompts into modules. They enable dependencies to be checked at compile time.

### Lambdas

```md
$format = (title, name) => "hello #{title} #{name}"
```

**Syntax:** `param => expression` or `(param1, param2, ...) => expression`.

**Runtime behaviour:** A callable value that evaluates `expression` with parameters bound to the current context. Lambdas are a first-class type that can be passed around.

**Design notes:** Lambdas exist to provide an explicit representation of simple deterministic computations.

## Data Structures

### Arrays

```md
$items = ["draft", "pending", "published"]
$approaches = [the question reframed, kill your darlings]
```

**Syntax:** `[elem1, elem2, ...]` where elements are any value expression, including nested arrays.

**Runtime behaviour:** Yields an ordered list of values.

### Tuples

```md
$pair: (String, Number) = ("draft", 3)
```

**Syntax:** `(t1, t2, ...)` defines a fixed-length tuple type or value; tuple values accept any value expression.

**Runtime behaviour:** Yields a fixed-length ordered value with positional typing.

## 5. Variables

### Variable declarations

```md
$count = 5
$title = "release #{version}"
$status = "draft"
```

**Syntax:** `$name = value` assigns a value expression to a variable. `$name: Type = value` includes a type annotation. `$name: Type` declares a variable with a type but no value.

**Runtime behaviour:** Tracks the assigned value of the variable through evaluation.

### Variable references

```md
$log = "processing #{item}"
SPAWN ~/agent/reporter WITH $log
```

**Syntax:** Variables are referenced by `$name` in expressions, and any prose.

**Runtime behaviour:** Variable references resolve to the current bound value in scope.

## 6. Types

### Built-in types

```md
Number
String
Array<T>
Tuple<T...>
Link
Lambda
Expr
```

### User-defined types

```md
<!-- semantic -->
a random number

<!-- link literal -->
~/agent/general

<!-- string literal -->
"draft"

<!-- number literal -->
123

<!-- enum -->
"draft" | "pending" | "published"

<!-- ref -->
MyType

<!-- array -->
Array<Number>
Array<MyType>

<!-- tuple -->
(String, Number)
```

**Syntax:** Type parsing is ordered. Tuples and enums are matched first, then type references (identifiers with optional generic arguments), then literal types (string/number/link), and any remaining text is parsed as a semantic type expression.

### Type declarations

```md
TYPE Status = "draft" | "pending" | "published"
TYPE Pair = (String, Number)
TYPE Agent = ~/agent/general
```

**Syntax:** `TYPE Name = TypeExpr`.

### Type annotations

```md
$status: Status
$pairs: Array<Pair>
```

**Syntax:** `$name: Type` or `$name: Type = value`.

**Runtime behaviour:** Types can optionally be used at runtime for validation.

**Design notes:** Types are primarily available as a developer tool to ensure program correctness.

## 7. Control flow

Control flow is heavily inspired by Ruby for its readability and obvious runtime behaviour. 

### FOR

```md
FOR $item IN $items
  SPAWN ~/agent/reporter WITH note that post is published
END

FOR $item
IN $items
  CONTINUE
END
```

**Syntax:** `FOR <target> IN <iterable>` starts a loop block terminated by `END`. `DO` is optional. Headers may span multiple lines.

**Runtime behaviour:** Iterates over the iterable expression, binding each item to the target for the loop body.

### WHILE

```md
WHILE $remaining != 0
  $remaining = $remaining - 1
END

WHILE diminishing returns DO
  BREAK
END
```

**Syntax:** `WHILE <condition>` starts a loop block terminated by `END`. `DO` is optional.

**Runtime behaviour:** Repeats while the condition evaluates truthy.

### BREAK

```md
BREAK
```

**Syntax:** `BREAK` is a standalone statement.

**Runtime behaviour:** Exits the innermost loop immediately.

### CONTINUE

```md
CONTINUE
```

**Syntax:** `CONTINUE` is a standalone statement.

**Runtime behaviour:** Skips to the next iteration of the innermost loop.

### IF

```md
IF $status = "draft" THEN
  RETURN "needs review"
ELSE
  RETURN "publish"
END

IF $x = 1
  AND $y != 2
  OR NOT diminishing returns
THEN
  RETURN true
END
```

**Syntax:** `IF <condition>` introduces a conditional block; `THEN` is optional and may appear on a new line. `ELSE` is optional.

**Runtime behaviour:** Conditions evaluate as truthy/falsey expressions. If the condition is truthy, the `THEN` block runs; otherwise `ELSE` runs if present.

### CASE

```md
CASE $status
WHEN "draft" OR "pending"
  RETURN "needs review"
WHEN "published" THEN
  SPAWN ~/agent/reporter WITH note that post is published
ELSE
  RETURN "ignore"
END
```

**Syntax:** `CASE <expr>` introduces a case block with one or more `WHEN <condition>` clauses and optional `ELSE`. `WHEN` may include `THEN`.

**Runtime behaviour:** Conditions evaluate as truthy/falsey expressions. The first matching `WHEN` executes, and no further `WHEN` clauses are evaluated. If no `WHEN` clause matches, `ELSE` runs, if present.

### DO

```md
DO
  Take out the trash
  RETURN "ok"
END
```

**Syntax:** `DO ... END` defines an explicit block with no additional semantics.

**Runtime behaviour:** Executes its inner statements in order.

**Design notes:** `DO` primarily exists to wrap prose instructions in a formal block.

### END

```md
END
```

**Syntax:** `END` closes the most recent open block.

**Runtime behaviour:** Terminates the current block scope.

### RETURN

```md
RETURN
RETURN result of analysis
```

**Syntax:** `RETURN` is a standalone statement with an optional value.

**Runtime behaviour:** Defines the return value of the execution context i.e. the LLMs response.

### GOTO

```md
GOTO next section
```

**Syntax:** `GOTO <target>` is a standalone statement.

**Runtime behaviour:** Reserved for explicit control transfer.

## 8. Composition

### SPAWN

```md
SPAWN ~/agent/reporter TO summarize the findings

FOR $instruction IN $instructions
  ASYNC SPAWN ~/agent/explore
    WITH $instruction
END
```

**Syntax:** `SPAWN` requires a target, and supports optional `TO` and `WITH`, which may be an anchor or a parameter block.

**Runtime behaviour:** Delegates work to an agent. `WITH` describes the prompt to be passed to the spawned agent. `ASYNC`/`AWAIT` determine whether or not to pause execution until the spawned agent responds. If omitted, the evaluator decides on async/await semantics.

### USE

```md
USE ~/skill/debug

USE ~/skill/debug TO do thing WITH
  p1: val
```

**Syntax:** `USE` targets a skill and supports optional `TO` and `WITH`. `WITH` may be an anchor or a parameter block.

**Runtime behaviour:** Composes a skill prompt into the current execution.
