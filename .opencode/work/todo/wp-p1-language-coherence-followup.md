# Language Coherence Follow-up

## Issues Identified in Review

### 1. Undeclared Variables (e.g., $iteration in playground)

**Problem:** The playground scenario uses `$iteration` without declaring it. The decision was "no new syntax needed" but this doesn't address the actual issue.

**Current state:** Variables like `$iteration`, `$currentHypothesis`, `$result` appear in workflow without declaration.

**Question:** Should we:
- A) Require all variables to be declared (strict mode)
- B) Allow implicit variables but document the convention
- C) Add syntax to mark variables as "LLM-inferred" (revisit `$@` or `$(...)`)

**Action:** Needs design decision

---

### 2. WHILE Syntax Inconsistency

**Problem:** `IF condition THEN:` vs `WHILE (condition):` is asymmetric.

**Proposal:** Change WHILE to `WHILE condition DO:` for consistency with IF/THEN.

```mdz
# Current
WHILE ($iteration < 5):

# Proposed  
WHILE $iteration < 5 DO:
```

**Benefits:**
- Consistent pattern: `KEYWORD condition KEYWORD:`
- No parentheses needed (DO acts as delimiter like THEN)
- Reads more naturally as prose

**Action:** Needs design decision + parser change if approved

---

### 3. Comment Syntax in Markdown Context

**Problem:** Using `#` for inline comments conflicts with Markdown heading syntax.

**Current:** `- $problem: $String  # the problem to solve`

**Alternatives:**
- A) `//` - familiar from C/JS but not Markdown
- B) `--` - familiar from SQL/Haskell  
- C) `>` - Markdown blockquote (already used for comments in spec)
- D) Keep `#` but only at end of line (current)
- E) Use `<!-- -->` Markdown comments

**Action:** Needs design decision

---

### 4. Curly Brace `{}` Usage Clarification

**Problem:** When are `{}` required vs optional?

**Current uses:**
1. Semantic markers: `{~~content}` - REQUIRED (special syntax)
2. Template interpolation: `` `${var}` `` inside backticks - REQUIRED
3. Object literals: NOT SUPPORTED in MDZ

**Question:** Is this documented clearly? Are there other uses?

**Action:** Verify documentation covers this

---

### 5. Terminology Documentation Location

**Problem:** Is the operator naming glossary discoverable?

**Current location:** `spec/language-spec.md` under "## Terminology"

**Should also be in:**
- Website docs (dedicated glossary page?)
- README quick reference?

**Action:** Verify discoverability

---

### 6. Example Co-location and Test Integration

**Problem:** Examples are scattered and not compiled as part of test suite.

**Proposal:**
- All code examples in docs should be extracted from actual `.mdz` files
- Test suite should compile all examples and verify no errors
- Single source of truth prevents drift

**Action:** Create wp for test integration

