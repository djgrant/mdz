# MDZ Specification

## 1. Overview

MDZ extends a host text format e.g. Markdown with a small set of all-caps keywords that opt a line into programmatic control flow. Everything else remains
host text and is preserved as-is.

The parser yields a stream of blocks that alternate between:
- host blocks (raw host text), and
- MDZ blocks (AST nodes for statements and expressions).

MDZ is indentation-insensitive. Line breaks are meaningful for separating statements and host text, but indentation is treated as presentation only.

Conformance is defined by the fixture suite in `grammar/tests/`.

MDZ differs from conventional programming languages  by its flexibility to express non-deterministic behaviours. The language is designed to be intuitive to both humans and LLMs.  

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
<!-- declartive for interpretation -->
$summary = the main argument in one sentence

<!-- impreative for instructions -->
USE ~/skill/debug TO find the root cause
```

**Syntax:** any unquoted text in expression position (e.g. assignment RHS or condition) is treated as a semantic expression.

**Runtime behaviour:** the executor infers the meaning within the current context.

**Design notes:** semantic expressions leverage LLMs' ability to infer meaning from context. They are the default syntax, because LLMs already default to interpreting text.

### Literal strings

```
$title = "changelog"
$message = "release #{version}"
```

**Syntax:** double-quoted strings support interpolation via `#{expr}`; plain strings without interpolation remain a literal value.

**Runtime behaviour:** interpolated expressions are evaluated and substituted; the result is a single string value.

**Design notes:** explicit quoting clarifies when an _exact_ value must be used.

### Number literals

```md
$count = 5
$ratio = 0.75
$bytes = 1e3
```

**Syntax:** numeric forms are written as plain text tokens (e.g. `5`, `0.75`, `1e3`) and are parsed as number literals when the entire value expression is a number.

**Runtime behaviour:** number literals are treated as exact number values.

**Design notes:** number parsing is intentionally conservative to avoid interfering with semantic expressions that happen to include digits.

### Links

```md
$snippet = #code-snippet
USE ~/skill/alpha
```

**Syntax:** `#anchor` or `~/path`.

**Runtime behaviour:** links are resolved by the executor (anchor to section content, path to a prompt file e.g. skill/agent/resource).

**Design notes:** links are the core primitve that enables modularity and composition of prompts, and enable compile-time checking of dependencies.

### Lambdas

```md
$format = (title, name) => "hello #{title} #{name}"
```

**Syntax:** `param => body` or `(...args) => body`.

**Runtime behaviour:** a callable value that executes `body` with bound parameters in the current context. A first-class type that can be passed around.

**Design notes:** lambdas enable developers to express simple deterministic behaviours concisely and clearly.

## Data Structures 

### Arrays

```md
$items = ["draft", "pending", "published"]
$approaches = [the question reframed, kill your darlings]
```

**Syntax:** `[elem1, elem2, ...]` where elements are any value expression, including nested arrays.

**Runtime behaviour:** yields an ordered list of values.

## 5. Assignment and Types

### Assignment

```md
$count = 5
$title = "release #{version}"
$status = "draft"
```

**Syntax:** `$name = value` assigns a value expression to a variable. `$name: Type = value` includes a type annotation. `$name: Type` declares a variable with a type but no value.

**Runtime behaviour:** assigns the resolved value into the current scope; uninitialized typed variables reserve a slot for later assignment.

**Design notes:** assignment keeps syntax minimal and prose-friendly while allowing optional type hints for validation or downstream tooling.

### Types

```md
$status: draft | pending | published = draft
$pair: (String, Int)
```

**Syntax:** type annotations are introduced with `:` and may be a tuple `(t1, t2, ...)`, an enum `a | b | c`, or an arbitrary type expression.

**Runtime behaviour:** type annotations are metadata for validators or executors; they do not change parsing of values.

**Design notes:** types are lightweight and permissive to avoid constraining experimentation while enabling linting and schema-like checks.
