---
size: sm
category: language
parent: wp-p1-language-coherence-master
---

# Operator Naming and Documentation

## Goal/Problem

Developers need names for all operators/constructs so they can talk about MDZ clearly. These names should be documented prominently.

## Operators/Constructs to Name

### Sigils
- `$` before variable/type names — ?
- `@` (if adopted for implicit vars) — ?

### Brackets
- `[[...]]` — "skill reference"? "wiki-link"?
- `[[#...]]` — "section reference"?
- `{~~...}` — "semantic marker"? "inference marker"? "fuzzy block"?
- `(...)` — "grouping"? "tuple"? (context dependent)
- `[...]` — "array"?

### Keywords
- `FOR EACH ... IN` — "for-each loop"
- `PARALLEL FOR EACH` — "parallel loop"
- `WHILE` — "while loop"
- `IF ... THEN ... ELSE` — "conditional"
- `WITH:` — "parameter block"? "with clause"?
- `AND`, `OR`, `NOT` — "logical operators"
- `BREAK`, `CONTINUE` — "loop control"

### Operators
- `=` — "assignment"? "equals"?
- `:` — "type annotation"? "definition"?
- `=>` — "arrow"? "lambda"?
- `|` — "union"? "or"? (in types)

### Other
- `---` — "frontmatter delimiter"
- `##` — "section heading"
- `-` — "list item"

## Approach

1. Research naming conventions in similar languages
2. Propose clear, memorable names
3. Ensure names are used consistently in:
   - spec/grammar.md
   - spec/language-spec.md
   - website docs
   - error messages
   - LSP tooltips

## Deliverable

A terminology glossary to be added to docs, with each construct named and briefly explained.

## Results

### Canonical Terminology (added to spec/language-spec.md)

**Sigils:**
- `$` — **Dollar sigil** (prefix for variables and types)

**Delimiters:**
- `---` — **Frontmatter fence**
- `[[name]]` — **Skill link** (wiki-link style reference)
- `[[#name]]` — **Section link**
- `{~~content}` — **Semantic marker** (the `~~` suggests "approximately")
- `(a, b)` — **Tuple** (grouping/compound values)
- `[a, b]` — **Array literal**
- `$Type[]` — **Array suffix**

**Keywords:**
- `FOR EACH $x IN $y:` — **For-each loop**
- `PARALLEL FOR EACH` — **Parallel loop**
- `WHILE (cond):` — **While loop**
- `IF cond THEN:` — **Conditional**
- `ELSE:` — **Else clause**
- `WITH:` — **With clause** (parameter block)
- `AND`, `OR`, `NOT` — **Logical operators**
- `BREAK`, `CONTINUE` — **Loop control**
- `IN` — **Collection operator**

**Operators:**
- `=` — **Assignment** (also **Equality** in conditions)
- `:` — **Type annotation**
- `=>` — **Arrow** (lambda definition)
- `|` — **Union** (enum variant separator)
- `.` — **Member access**

**Comparison Operators:**
- `=`, `!=`, `<`, `>`, `<=`, `>=` — Named by their function (equality, inequality, less than, etc.)

**Document Structure:**
- YAML between `---` — **Frontmatter**
- `##` — **Section heading**
- `-` — **List item**

**Type Forms:**
- `$Task = description` — **Semantic type**
- `$Status = "a" | "b"` — **Enum type**
- `($A, $B)` — **Tuple type**
- `$Task[]` — **Array type**
- `$fn = $x => expr` — **Function type**
- `$Task` — **Type reference**

**Variable Forms:**
- `$name = value` — **Variable declaration**
- `$name: $Type = value` — **Typed declaration**
- `$name: $Type` (in WITH) — **Required parameter**
- `$name` — **Variable reference**
- `$fn = $x => expr` — **Lambda expression**

**Control Flow:**
- Indented content after `:` — **Block**
- Boolean expr in WHILE/IF — **Condition** (semantic or deterministic)
- `($a, $b) IN $tuples` — **Destructuring**

**Composition:**
- `Execute [[skill]] WITH:` — **Delegation**
- `uses:` in frontmatter — **Dependency**
- `imports:` in frontmatter — **Import**
- Short name for skill — **Alias**

### Notes

- Decided against `@` sigil for now (not yet adopted)
- "Semantic marker" chosen over "fuzzy block" or "inference marker" for clarity
- "Skill link" and "section link" distinguish the two reference types
- "With clause" preferred over "parameter block" for consistency with SQL heritage

## Evaluation

Developers can now discuss MDZ unambiguously:
- "Add a dollar sigil before the variable name"
- "Use a semantic marker for LLM-interpreted content"
- "The skill link references the orchestrator"
- "Pass parameters via the with clause"

Terminology added to `spec/language-spec.md` in a new `## Terminology` section.
