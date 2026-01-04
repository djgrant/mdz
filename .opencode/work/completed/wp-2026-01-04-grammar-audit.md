# Full Grammar Audit

## Goal/Problem

Audit every construct in the MDZ grammar. For each, provide rationale for why it exists. Question if it's justified. Propose changes if not.

## Scope

- `spec/grammar.md`
- `spec/language-spec.md`
- `src/parser/`

## Approach

For each construct, document:

1. **What it is** - syntax and semantics
2. **Why it exists** - the problem it solves
3. **Evidence of value** - is it used? in examples? in real skills?
4. **Alternatives considered** - why this syntax over others?
5. **Verdict** - Keep / Modify / Remove / Needs discussion

## Hypothesis

A rigorous audit will identify cruft, clarify design decisions, and surface inconsistencies.

## Results

### 1. Frontmatter (`---`)

**What it is:** YAML block delimited by `---` at document start. Contains `name`, `description`, `uses`, and `imports` fields.

**Why it exists:** Provides machine-readable metadata for skill discovery, dependency management, and tooling integration. The `description` field serves as a trigger for when to use the skill.

**Evidence of value:**
- Used in ALL 4 example files (pr-reviewer, skill-composer, the-scientist, debugger)
- Parsed and validated in compiler
- Required for skill registration and dependency graph building
- Tests cover frontmatter parsing extensively

**Alternatives considered:** Could embed metadata inline, but YAML frontmatter is familiar from static site generators and provides clear separation of metadata from content.

**Verdict:** ✅ **KEEP** - Essential, well-justified, standard practice.

---

### 2. Type Definitions (`$TypeName = ...`)

**What it is:** Type declarations using `$UpperCase = description | "enum" | "values"`. Types can be semantic (natural language), enum (string literals), compound (tuples), array, or function.

**Why it exists:** Documents intent for humans, guides LLM interpretation, enables tooling (autocomplete, validation). Types are hints, not runtime enforcement.

**Evidence of value:**
- Used in ALL 4 example files
- Multiple type variants tested: semantic, enum, compound, array
- Compiler extracts type definitions into metadata
- Validation warns on undefined type references

**Alternatives considered:** Could use explicit `TYPE` keyword, but current syntax is more concise. Dollar prefix creates visual distinction.

**Verdict:** ✅ **KEEP** - Well-designed, evidence of utility across examples.

---

### 3. Variable Declarations (`$var: $Type = value`)

**What it is:** Variables declared with `$varName`, optional type annotation (`: $Type`), and optional assignment (`= value`). Supports lambdas (`$fn = $x => expr`).

**Why it exists:** Variables track state, enable parameterization, and provide named values the LLM can reference and update.

**Evidence of value:**
- Used extensively in all examples
- Lambda expressions used for dynamic path generation in the-scientist.mdz
- Tests cover typed variables, untyped variables, lambdas
- Required parameters (typed without default) used in WITH clauses

**Alternatives considered:** Could use `let` or `var` keywords, but `$prefix` is visually distinct and familiar from shell/PHP.

**Verdict:** ✅ **KEEP** - Essential for any programming language.

---

### 4. Semantic Markers (`{~~content}`)

**What it is:** Curly braces with `~~` prefix containing content for LLM interpretation. Variables inside are interpolated before semantic evaluation.

**Why it exists:** Marks portions of text as requiring LLM judgment rather than literal interpretation. The LLM determines the concrete value based on context.

**Evidence of value:**
- Used in ALL 4 example files
- Common patterns: `{~~appropriate location}`, `{~~file contains logic changes}`, `{~~encouraging tone}`
- Parser extracts semantic markers with interpolations
- Compiler tracks in source map

**Alternatives considered:** `~~content~~` markdown strikethrough style, `{{content}}` template style. Current `{~~}` syntax is unique, clear, and suggests "approximately interpret this".

**Verdict:** ✅ **KEEP** - Distinctive MDZ feature, well-used and justified.

---

### 5. Skill References (`[[skill-name]]`)

**What it is:** Wiki-link syntax to reference other skills. At runtime, LLM loads the referenced skill content.

**Why it exists:** Enables skill composition and delegation. Central to the component-based architecture.

**Evidence of value:**
- Used in skill-composer.mdz, debugger.mdz, the-scientist.mdz
- Tests cover skill reference parsing
- Compiler builds dependency graph from references
- Validation checks against `uses:` declarations and registry

**Alternatives considered:** Markdown link syntax `[skill](path)` would conflict with standard links. Wiki-links are familiar from Obsidian, Wikipedia, Notion.

**Verdict:** ✅ **KEEP** - Core composition mechanism.

---

### 6. Section References (`[[#section]]`, `[[skill#section]]`)

**What it is:** References to sections within current document (`[[#section]]`) or other skills (`[[skill#section]]`). Section names derived from headings.

**Why it exists:** Allows fine-grained composition - reference just a portion of a skill as a sub-task or prompt.

**Evidence of value:**
- Used in the-scientist.mdz (`[[#experiment-prompt]]`)
- Used in skill-composer.mdz (`[[#recovery-strategy]]`)
- Used in debugger.mdz (`[[#parse-step]]`, `[[#inspection-prompt]]`)
- Validation errors on undefined local sections

**Alternatives considered:** Same wiki-link syntax is natural extension. Hash anchor is standard web convention.

**Verdict:** ✅ **KEEP** - Essential for modular skill design.

---

### 7. FOR EACH Loop

**What it is:** `FOR EACH $item IN $collection:` with indented body. Supports destructuring pattern `($a, $b)`.

**Why it exists:** Iteration over collections is fundamental. Many agent workflows process lists of items.

**Evidence of value:**
- Used in ALL 4 examples
- pr-reviewer: iterates over files
- skill-composer: iterates over skills, batches
- the-scientist: could use for hypotheses
- Tests cover simple pattern, destructuring pattern

**Alternatives considered:** CAPS keywords for visual distinction from prose, standard imperative syntax.

**Verdict:** ✅ **KEEP** - Essential control flow.

---

### 8. WHILE Loop

**What it is:** `WHILE (condition):` with indented body. Conditions can be deterministic (`$x < 5`) or semantic (`not diminishing returns`).

**Why it exists:** Enables iterative refinement until a condition is met. Mixed deterministic/semantic conditions allow LLM judgment in loop control.

**Evidence of value:**
- Used in the-scientist.mdz for experiment loop
- Used in skill-composer.mdz (legacy v0.1 test)
- Tests cover deterministic, semantic, and compound conditions

**Alternatives considered:** Standard while loop syntax. Semantic conditions are a distinctive MDZ feature.

**Verdict:** ✅ **KEEP** - Important for iterative workflows.

---

### 9. IF THEN ELSE

**What it is:** `IF condition THEN:` with optional `ELSE:` block. Conditions same as WHILE.

**Why it exists:** Conditional branching is fundamental. Semantic conditions allow LLM to evaluate complex situations.

**Evidence of value:**
- Used extensively in ALL 4 examples
- pr-reviewer: conditional logic based on file types, findings
- the-scientist: branching based on experiment results
- Tests cover IF, IF/ELSE, nested conditions

**Alternatives considered:** Standard conditional syntax. CAPS keywords for visual distinction.

**Verdict:** ✅ **KEEP** - Essential control flow.

---

### 10. PARALLEL FOR EACH (v0.2)

**What it is:** `PARALLEL FOR EACH $item IN $items:` - concurrent iteration where all items can execute simultaneously.

**Why it exists:** Multi-agent orchestration requires concurrency. Fan-out patterns for parallel processing.

**Evidence of value:**
- Documented in spec, full parser/compiler support
- Tests cover parsing, compilation, nesting
- Example in grammar.md comprehensive skill

**Observation:** NOT used in any of the 4 example files. The construct exists in spec and implementation but lacks real-world example usage.

**Verdict:** ⚠️ **KEEP but ADD EXAMPLE** - Justified for concurrency, but needs demonstration in examples to validate utility.

---

### 11. BREAK and CONTINUE (v0.2)

**What it is:** `BREAK` exits loop early, `CONTINUE` skips to next iteration. Only valid inside loops.

**Why it exists:** Standard loop control for efficiency (early exit) and skip patterns.

**Evidence of value:**
- Parser validates they're inside loops (E016, E017 errors)
- Tests cover valid and invalid usage
- Documented in grammar and spec

**Observation:** NOT used in any of the 4 example files. Implementation exists but no real-world demonstration.

**Verdict:** ⚠️ **KEEP but ADD EXAMPLE** - Standard constructs, but could use real-world example.

---

### 12. WITH Clauses

**What it is:** `WITH:` followed by parameter list for passing values to delegated skills. Supports typed required parameters.

**Why it exists:** Parameterized skill composition - pass context when delegating.

**Evidence of value:**
- Defined in grammar spec (line 300-304)
- AST has `Delegation` node with parameters
- Parser has `isRequired` flag for typed params without defaults

**Observation:** The grammar defines WITH clauses, but:
- Parser does NOT have a `parseWithClause` or `parseDelegation` method
- No example uses `WITH:` syntax
- the-scientist.mdz uses a different pattern: `Delegate to sub-agent with [[#prompt]]:`

**Verdict:** ❌ **NEEDS DISCUSSION** - Specified but not fully implemented. Delegation syntax is inconsistent between spec and examples.

---

### 13. EXECUTE, YIELD, Delegate Verbs

**What it is:** Grammar specifies `delegate_verb = "Execute" | "Delegate" | "Use" | ? verb phrase ?` followed by reference.

**Evidence of value:**
- Grammar defines delegation syntax
- AST has `Delegation` type with `verb`, `target`, `parameters`
- Examples use prose like "Execute", "Delegate to sub-agent"

**Observation:** 
- Parser does NOT implement delegation parsing as a distinct construct
- The verbs are just prose text, not parsed specially
- Only the `[[reference]]` part is recognized as a reference

**Verdict:** ❌ **REMOVE FROM SPEC or IMPLEMENT** - Currently misleading. Either implement as distinct construct or clarify it's just prose convention.

---

### 14. Imports (v0.2)

**What it is:** `imports:` array in frontmatter with `path`, `skills`, and `alias` fields. Allows explicit control over skill resolution and aliasing.

**Why it exists:** Enables modular skill organization, package references, and shorter names via aliases.

**Evidence of value:**
- Full parser support (parseImports method)
- Tests cover simple imports, aliases, multiple imports, empty skills
- Grammar example shows comprehensive usage

**Observation:** NOT used in any of the 4 example files. They all use simpler `uses:` arrays.

**Verdict:** ⚠️ **KEEP but ADD EXAMPLE** - Good feature for larger projects, but needs real-world demonstration.

---

### 15. Uses Declarations

**What it is:** `uses:` array in frontmatter listing skill dependencies.

**Why it exists:** Declares dependencies for load order optimization, cycle detection, and tooling.

**Evidence of value:**
- Used in ALL 4 example files
- Validation warns when skills are referenced but not declared
- Dependency graph built from uses declarations

**Verdict:** ✅ **KEEP** - Essential for dependency management.

---

## Evaluation

### Well-Justified Constructs (Keep as-is)
- Frontmatter
- Type definitions
- Variable declarations
- Semantic markers
- Skill and section references
- FOR EACH, WHILE, IF THEN ELSE
- Uses declarations

### Need Examples Added
- PARALLEL FOR EACH - implemented but no example usage
- BREAK/CONTINUE - implemented but no example usage
- Imports - implemented but no example usage

### Problematic Constructs

**WITH Clauses / Delegation:**
The grammar specifies a formal delegation syntax (`Execute [[skill]] WITH:`) but:
1. Parser doesn't implement `parseDelegation` or `parseWithClause`
2. Examples use informal prose patterns
3. `isRequired` flag exists for WITH parameters but can't be triggered

**Recommendation:** Either:
- A) Remove WITH clauses and delegation verbs from spec (document as prose convention)
- B) Fully implement delegation parsing to recognize the pattern

### Inconsistencies Found

1. **AST `Delegation` type never instantiated** - Defined in ast.ts (line 347) but parser never creates it

2. **WITH keyword lexed but unused** - Lexer has `WITH` token type, but parser never checks for it

3. **Function types defined but unused** - Grammar defines `function_type = param_list arrow type_expr` but this is for lambda *values*, not type definitions

### Summary Recommendations

1. **Add examples** demonstrating PARALLEL FOR EACH, BREAK/CONTINUE, and imports
2. **Clarify delegation** - either implement WITH clause parsing or document that delegation is prose-based
3. **Remove dead code** - AST `Delegation` type is unused
4. **Consider simplification** - If delegation will remain prose-based, remove `WITH` keyword from lexer and delegation grammar from spec
