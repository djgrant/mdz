# V4: Reference and Linking Mechanisms for Zen

## Goal/Problem

Explore how skills, prompts, and sections can reference each other.

## Results

### Mechanism 1: Markdown Anchor Links

**Example:**

```markdown
# orchestrate-map-reduce

## Workflow

1. Delegate to sub-agent with [iteration manager](#iteration-manager-prompt)
2. Reference the [validation interface](#validation-interface)

See also: [orchestrate](./orchestrate.md#methodology)

### Iteration Manager Prompt

You are responsible for mapping over Task...

### Validation Interface

After each iteration determine progress, regression, or plateau.
```

**How references resolve:**
- `#section-heading` → heading in same file (slugified)
- `./file.md#section` → heading in another file
- `./file.md` → entire file

**Strengths:**
- Standard markdown - works everywhere
- Familiar to anyone who's written markdown
- Links render and navigate in editors
- No new syntax to learn

**Weaknesses:**
- Fragile - renaming heading breaks links
- Case sensitivity varies by parser
- No type information in reference
- Can't reference non-heading content

**Tooling:** Standard markdown link detection; broken link checking possible

---

### Mechanism 2: Wiki-Style Links

**Example:**

```markdown
# orchestrate-map-reduce

## Workflow

1. Delegate to sub-agent with [[iteration-manager-prompt]]
2. Run [[validation-interface]]

Uses [[orchestrate#methodology]] as base.

Inputs are typed as [[types/Task]] and [[types/Strategy]].
```

**How references resolve:**
- `[[name]]` → find skill/section by name (fuzzy)
- `[[skill#section]]` → section within skill
- `[[folder/name]]` → namespaced reference

**Strengths:**
- Very readable - just the name
- Familiar from wikis, Obsidian, Notion
- Easy to type - just double brackets
- Can reference by semantic name, not slug

**Weaknesses:**
- Ambiguous if multiple matches exist
- Needs custom parser (not standard markdown)
- Brackets might conflict with other syntax
- No parameter passing

**Tooling:** Requires link index for resolution; great autocomplete potential

---

### Mechanism 3: Import Statements

**Example:**

```markdown
---
imports:
  - from: ./types.md
    types: [Task, Strategy]
  - from: ./orchestrate.md
    sections: [methodology]
  - from: ./prompts.md
    as: prompts
---

# orchestrate-map-reduce

## Types

Uses imported $Task and $Strategy

## Workflow

Follow methodology from orchestrate.

Delegate with prompts.build-prompt
```

**How references resolve:**
- Explicit imports at top of file
- Types and sections imported by name
- Can alias imports (`as: prompts`)

**Strengths:**
- Explicit dependencies - no magic
- Familiar from programming languages
- Enables tree-shaking/bundling
- Clear scope for tooling

**Weaknesses:**
- Verbose boilerplate
- Must update imports when adding references
- Doesn't feel like markdown
- Frontmatter becomes cluttered

**Tooling:** Import graph analysis; unused import detection

---

### Mechanism 4: Implicit Resolution

**Example:**

```markdown
# orchestrate-map-reduce

## Workflow

Uses the orchestrate methodology.

1. Delegate with iteration-manager-prompt
2. Validate using validation-interface
3. Task and Strategy types are inherited

Types: $Task, $Strategy (from context)
```

**How references resolve:**
- Names like `orchestrate` resolved by searching known skills
- Types with `$` prefix resolved from type registry
- Section names matched by heading text
- Loading order determines resolution

**Strengths:**
- Zero boilerplate
- Reads like natural prose
- Easy to write and modify
- Flexible matching

**Weaknesses:**
- Magic - hard to know what will resolve
- Collisions if two skills have same name
- Loading order affects behavior
- Hard to analyze statically

**Tooling:** Requires full skill index; ambiguity warnings

---

### Mechanism 5: URI-Based

**Example:**

```markdown
# orchestrate-map-reduce

## Workflow

Uses zen://skills/orchestrate#methodology

1. Delegate with zen://prompts/iteration-manager
2. Validate with zen://interfaces/validation

Types:
- $Task = zen://types/Task@v1
- $Strategy = zen://types/Strategy@v1
```

**How references resolve:**
- `zen://namespace/path` as structured URI
- Version pinning with `@version`
- Namespaces: skills, types, prompts, interfaces

**Strengths:**
- Unambiguous - full path
- Versioning built in
- Extensible to remote references
- Good for large ecosystems

**Weaknesses:**
- Very verbose
- Doesn't feel like markdown
- Learning curve
- Over-engineered for small projects

**Tooling:** Standard URI parsing; registry lookups

---

### Mechanism 6: Variable References

**Example:**

```markdown
## Context

$current: $FilePath = $SolutionPath(0)
$next: $FilePath = $SolutionPath(1)
$iterations: int = 0

## Workflow

1. Write result to $current
2. Set $next = $SolutionPath($iterations + 1)
3. $current = $next after validation
```

**Types of variables:**
- `$name` - mutable reference
- `$Name` - type reference (by convention)
- `$name: $Type` - typed variable
- `$fn(args)` - function call

**Strengths:**
- Clear that this is a variable, not prose
- Consistent with shell/template conventions
- Can be typed
- Familiar from many languages

**Weaknesses:**
- $ might conflict with currency, LaTeX
- No namespace for variables
- Mutable state is complex
- Need to track scope

**Tooling:** Variable tracking; scope analysis

---

### Mechanism 7: Inline References with Context

**Example:**

```markdown
## Workflow

1. Delegate with #build-prompt {task: $task, context: $current}
2. Run #validate-prompt -> $result
3. IF $result.pass THEN update with #update-wp

### build-prompt (task, context)

Execute: {task}
From: {context}
```

**How it works:**
- `#name` references a section
- `{param: value}` passes parameters inline
- `-> $var` captures output
- Section defines expected parameters

**Strengths:**
- Parameters visible at call site
- Output capture is explicit
- Section declares its interface
- Readable flow

**Weaknesses:**
- Syntax is getting complex
- Multiple concepts in one expression
- Need to parse parameter expressions
- May conflict with markdown

**Tooling:** Parameter validation; type checking at call sites

---

## Cross-Cutting Concerns

### Circular References

```markdown
# skill-a
Uses skill-b for validation

# skill-b  
Uses skill-a for execution

# Problem: Loading order?
```

**Solutions:**
1. **Disallow** - Detect and error at compile time
2. **Lazy loading** - References resolved at runtime
3. **Stratified** - Different layers can't cross-reference

### Version Pinning

```markdown
# Option 1: In frontmatter
---
dependencies:
  orchestrate: "^1.0"
---

# Option 2: Inline
Uses [[orchestrate@1.0#methodology]]

# Option 3: Lock file
zen.lock alongside zen skills
```

### Aliasing

```markdown
---
imports:
  - from: ./very-long-skill-name.md
    as: short
---

Uses short#section

# Or inline
[[very-long-skill-name|short]]
```

---

## Evaluation

### Key Findings

1. **Wiki-style [[links]] win for DX** - Familiar, readable, easy to type. Should be the primary mechanism.

2. **Anchor links as fallback** - Standard `#section` links work for local references, familiar to markdown users.

3. **Variable references need $ prefix** - Clear distinction between prose and variables is essential.

4. **Imports are optional enhancement** - Nice for large projects, overkill for simple skills.

5. **Parameter passing is critical** - References need to carry context. `#prompt {key: value}` pattern is promising.

### Tensions Identified

- **Implicit vs Explicit**: Implicit is easier to write; explicit is easier to maintain
- **Brevity vs Precision**: Short names are nice; full paths are unambiguous
- **Familiarity vs Power**: Markdown links are known; wiki links need learning
- **Local vs Global**: File-relative or project-wide resolution?

### Promising Directions

1. **Primary: Wiki links `[[name]]`** for skill references
2. **Secondary: Anchor links `#section`** for local sections
3. **Variables: `$name`** for all dynamic references
4. **Parameters: `{key: value}`** at call sites
5. **Optional: Imports** for large projects or version pinning

### Open Questions

- How do references work across repositories?
- Should there be a skill registry/package manager?
- How do we handle renamed/moved skills?
- What's the resolution algorithm when multiple matches exist?
