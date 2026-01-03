# V9: Tooling-First Design Analysis

## Goal/Problem

Explore language design from a tooling perspective.

## Results

### Tooling Need 1: Language Server Protocol (LSP)

#### Syntax Highlighting

```markdown
# What needs distinct highlighting?

---                          # Frontmatter delimiter
name: skill-name             # Key-value pairs

## Section Heading           # Structure
$variable                    # Variables
$Type                        # Types (capitalized)
[[skill-reference]]          # Skill references
#section-reference           # Section references
{~~semantic content}         # Semantic markers
{{FOR EACH}}...{{END}}       # Control flow
```

**Syntax approach impact:**
- Fenced blocks (`~~~zen:types`): Easy - different language per block
- Inline mixed syntax: Harder - need regex for each construct
- Pure markdown: Trivial - standard highlighting works
- Heavy annotations: Need many distinct token types

**Recommendation:** Fewer syntactic categories = easier highlighting

---

#### Autocompletion

```markdown
# Trigger points for autocomplete

[[     # Start of skill reference → suggest skill names
#      # Start of section reference → suggest sections
$      # Start of variable → suggest in-scope variables
{~~    # Start of semantic → no completion (free-form)

## Types
$Task = [[   # After [[ in type position → suggest types
```

**Requirements for good autocomplete:**
- Skill index (all skill names and paths)
- Section index per skill (headings)
- Variable scope tracking
- Type registry

**Syntax approach impact:**
- Explicit references (`[[skill]]`): Easy trigger points
- Implicit references: Harder - need to infer when to suggest
- Wiki links: Great - `[[` is unambiguous trigger

---

#### Go-to-Definition

```markdown
## Workflow

1. Delegate with [[build-prompt]]   # Ctrl+click → jump to build-prompt skill
2. Use $currentPath                  # Ctrl+click → jump to variable declaration
3. Call #validation                  # Ctrl+click → jump to #validation section

## validation

(cursor lands here)
```

**Requirements:**
- Reference → declaration mapping
- Cross-file resolution
- Handling of multiple matches

**Syntax approach impact:**
- Named references: Direct mapping possible
- Implicit references: Need fuzzy matching
- Inlined content: May lose source location

---

#### Find References

```markdown
# Query: Where is $currentPath used?

## Context
$currentPath = "./solution.md"     # Declaration

## Workflow  
Write result to $currentPath       # Usage 1

## Prompts
Output path: {$currentPath}        # Usage 2
```

**Requirements:**
- Bidirectional mapping (declaration ↔ usages)
- Rename propagation
- Dead reference detection

---

#### Diagnostics/Errors

```markdown
# Error categories to detect

## Syntax errors
{{FOR EACH x IN y}              # Missing {{END}}
$variable: $UndefinedType       # Unknown type

## Reference errors  
Delegate with [[nonexistent]]   # Skill not found
Call #missing-section           # Section not found

## Type errors
count: integer = "five"         # Type mismatch

## Warnings
## EmptySection                 # Empty section (unusual)
$unused_variable = 5            # Never used
```

**Severity levels:**
- Error: Prevents compilation/execution
- Warning: Suspicious but valid
- Info: Style suggestions
- Hint: Possible improvements

---

### Tooling Need 2: Compilation/Transformation

#### Parsing Requirements

```markdown
# What needs to be parsed?

1. YAML frontmatter            # Standard YAML parser
2. Markdown structure          # Heading hierarchy, lists
3. Custom syntax               # References, control flow, types
4. Inline expressions          # Variable interpolation
```

**Parser complexity by approach:**
- Pure markdown: Use remark/unified - minimal custom
- Frontmatter + markdown: YAML parser + markdown parser
- Custom tags `{% %}`: Need tag parser
- Inline expressions `{$var}`: Need expression parser

**AST structure (proposed):**

```
Skill
├── Frontmatter
│   ├── name: string
│   ├── description: string
│   └── uses: Reference[]
├── Types[]
│   └── Type { name, definition, constraints }
├── Inputs[]
│   └── Input { name, type, required, default }
├── Sections[]
│   └── Section { id, title, content: Node[] }
└── Content: Node[]
    ├── Paragraph
    ├── ControlFlow (FOR, IF, WHILE)
    ├── Reference (skill, section, variable)
    └── SemanticContent
```

---

#### Transformations Needed

```markdown
# Source → Compiled output transformations

1. Reference expansion
   [[skill#section]] → (inline content from that section)

2. Type checking
   Validate all type annotations are consistent

3. Control flow validation
   Check all branches have termination

4. Variable scope analysis
   Track what's in scope at each point

5. Semantic boundary marking
   Ensure LLM knows what to interpret vs execute literally
```

---

#### Source Maps

```markdown
# Compiled output
Line 47: Execute the task from transforms[0]

# Source map entry
compiled:47 → source:skill.md:23 (from FOR EACH expansion)

# Use case: "This execution failed at line 47"
# → Show user the original source location
```

**Requirements:**
- Track origin of every compiled line
- Handle multi-level expansion (A includes B includes C)
- Debug mode: add comments showing origin

---

### Tooling Need 3: Validation

#### Type Checking

```markdown
## Types
$Task = { description: string, execute: () -> void }
$Strategy = "accumulate" | "independent"

## Inputs
transforms: ($Task, $Strategy)[]
validator: $Task

## Workflow
# Type checker verifies:
# - transforms is array of tuples
# - Each tuple has Task and Strategy
# - validator is a Task
```

**Type checking levels:**
1. **Structural**: Shapes match
2. **Nominal**: Names match
3. **Semantic**: (can't fully check - requires LLM)

---

#### Reference Resolution

```markdown
# Resolution algorithm

1. Parse reference: [[skill-name#section]]
2. Search in:
   a. Current directory
   b. Registered skill paths
   c. Skill registry/index
3. If multiple matches: error or disambiguate
4. If no match: error with suggestions
```

---

#### Dead Code Detection

```markdown
## Types
$UnusedType = string         # Warning: never referenced

## Workflow
{{IF false}}                 # Warning: unreachable branch
  Do something
{{END}}

#unreferenced-section        # Warning: never called

### unreferenced-section
This is never used.
```

---

#### Cycle Detection

```markdown
# Build dependency graph

skill-a → skill-b → skill-c → skill-a  # Cycle!

# Report: 
# Error: Circular dependency detected
# skill-a → skill-b → skill-c → skill-a
```

---

### Tooling Need 4: Runtime Tracing

#### Execution Path Tracking

```markdown
# Execution trace output

[00:00:00] ENTER skill: orchestrate-map-reduce
[00:00:01] FOR EACH: iteration 1 of 3
[00:00:02]   DELEGATE: build-prompt { task: "simplify" }
[00:00:15]   RESULT: { success: true, output: "..." }
[00:00:16]   DELEGATE: validate-prompt
[00:00:30]   RESULT: { valid: true }
[00:00:31] FOR EACH: iteration 2 of 3
...
[00:02:00] EXIT skill: orchestrate-map-reduce
```

**Trace levels:**
- Minimal: Enter/exit skills
- Normal: + control flow + delegations
- Verbose: + variable values + full outputs
- Debug: + all LLM prompts/responses

---

#### Variable Inspection

```markdown
# At any point in execution, show:

Variables in scope:
  $current = "./solutions/attempt-1.md"
  $next = "./solutions/attempt-2.md"
  $iterations = 2
  $strategy = "accumulate"

Types:
  $current: $FilePath
  $strategy: $Strategy
```

---

#### Work Package State

```markdown
# Track work package evolution

WP: simplify-2026-01-03
Status: in-progress
Created: 00:00:00
Iterations:
  1. [00:01:00] Initial attempt - regression
  2. [00:05:00] Second attempt - progress
  3. [00:10:00] Third attempt - progress (current)
```

---

### Tooling Need 5: Testing

#### Unit Testing Skills

```markdown
# Test file: test-simplify.zen

@test "simplify reduces complexity"
@input
  code: "function f(a, b, c) { return a + b + c; }"
@expect
  result.complexity < input.complexity
  result.functionality == input.functionality
```

**Test types:**
- Input/output matching
- Property-based (output has property X)
- Regression (output matches snapshot)
- LLM-evaluated (semantic comparison)

---

#### Integration Testing Compositions

```markdown
# Test composition: simplify + orchestrate-map-reduce

@test "simplify uses map-reduce correctly"
@setup
  mock: orchestrate-map-reduce returns { findings: [...] }
@run
  simplify with { code: "..." }
@verify
  orchestrate-map-reduce.called == true
  orchestrate-map-reduce.transforms.length == 2
```

---

#### Mocking Agent Responses

```markdown
# Mock file: mocks/build-prompt.zen

@mock "build-prompt"
@when
  task.type == "simplify"
@return
  success: true
  output: "simplified code here"
  confidence: 0.9
```

---

## Evaluation

### Syntax Toolability Ranking

From most to least toolable:

1. **Fenced blocks with languages** (`~~~zen:types`)
   - Each block is independently parseable
   - Language-specific tooling per block

2. **Explicit delimited references** (`[[skill]]`, `{$var}`)
   - Clear trigger points
   - Unambiguous parsing

3. **Directive-based** (`@if`, `@for`)
   - @ is distinct character
   - Directives are enumerable

4. **Template style** (`{{IF}}`)
   - Clear delimiters
   - But nesting is complex

5. **CAPS keywords** (`FOR EACH`)
   - Regex-matchable
   - But false positives with acronyms

6. **Inline attributes** (`{.class key=value}`)
   - Pandoc has tooling
   - But complex to parse fully

7. **Indentation-based**
   - Whitespace-sensitive = fragile
   - Copy-paste issues

8. **Pure markdown / natural language**
   - Minimal custom tooling possible
   - Semantics by convention only

---

### Tooling Priority Matrix

| Feature | Essential | Nice-to-have | Complexity |
|---------|-----------|--------------|------------|
| Syntax highlighting | ✓ | | Low |
| Error diagnostics | ✓ | | Medium |
| Autocomplete refs | ✓ | | Medium |
| Go-to-definition | ✓ | | Medium |
| Type checking | | ✓ | High |
| Execution tracing | ✓ | | High |
| Unit testing | | ✓ | High |
| Visual debugging | | ✓ | Very High |

---

### Key Findings

1. **Reference syntax determines toolability** - `[[wiki-style]]` links are highly toolable.

2. **Fewer token types = easier highlighting** - Aim for <10 distinct syntactic elements.

3. **Compilation is necessary** - Source format should differ from execution format for debugging.

4. **Type checking is partial** - Full checking impossible due to semantic content.

5. **Execution tracing is critical** - Multi-agent debugging is hard without visibility.

### Design Constraints from Tooling

- Use explicit delimiters (not context-dependent)
- Avoid whitespace-sensitivity
- Make references machine-parseable
- Keep AST structure simple
- Support source maps for compilation

### Recommended Tooling Stack

1. **Parser**: Tree-sitter or Lezer for incremental parsing
2. **Type system**: Structural with gradual typing
3. **LSP**: Build on top of existing markdown LSP
4. **Runtime**: Custom executor with tracing hooks
5. **Testing**: Property-based + snapshot + LLM-evaluated
