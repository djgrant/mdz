# v0.9 Specification Updates

## Goal

Update grammar.md and language-spec.md for v0.9 language extensions.

## Scope

- `spec/grammar.md` (773 lines)
- `spec/language-spec.md` (1103 lines)

## Approach

### grammar.md Changes

**Add Keywords (lines 59-81):**
- `RETURN = "RETURN" ;`
- `ASYNC = "ASYNC" ;`
- `AWAIT = "AWAIT" ;`

**Remove Keywords:**
- `PARALLEL` (line 73)

**Add Operators (lines 85-104):**
- `push_op = "<<" ;`

**New Productions:**

```ebnf
return_stmt = RETURN [ expression ] newline ;

do_stmt = DO prose_instruction newline ;
prose_instruction = { any_char } ;

push_stmt = var_reference "<<" expression newline ;

delegate_stmt = [ ASYNC | AWAIT ] DELEGATE [ task_expr ] [ TO target_expr ] [ WITH context_expr ] newline ;
```

**Update Productions:**
- `with_param`: Change from `list_marker var_decl` to `indent ident colon expression`
- Remove `parallel_for_each_stmt` entirely

**Update Frontmatter Schema (lines 136-145):**
```ebnf
frontmatter_fields = name_field description_field [ types_field ] [ input_field ] [ context_field ] ;
types_field = "types:" newline { type_entry } ;
input_field = "input:" newline { input_entry } ;
context_field = "context:" newline { context_entry } ;
```

**Add Disambiguation Rules:**
- Colon rule: colon at line end = indented block follows
- Keyword placement rule: CAPS at line start or indented
- RETURN placement: only at end of section or loop iteration

**Remove Sections:**
- `## Types`, `## Input`, `## Context` as body sections (moved to frontmatter)
- `parallel_for_each_stmt` production
- PARALLEL FOR EACH examples

### language-spec.md Changes

**Add Sections:**
- RETURN statement (after Control Flow, ~line 407)
- ASYNC/AWAIT DELEGATE (expand DELEGATE section, lines 413-444)
- Push operator `<<` (in Variables section, ~line 157)
- DO instruction (in Control Flow section)
- Frontmatter declarations (expand Frontmatter Schema, lines 30-45)
- Colon rule (new section after Grouping and Braces)
- Keyword placement rule (new section)

**Remove Sections:**
- PARALLEL FOR EACH (lines 348-363)
- `## Types`, `## Input`, `## Context` conventional sections (lines 519-535)
- "Why PARALLEL FOR EACH?" design decision (lines 954-959)

**Update Sections:**
- Parameter Passing: new WITH syntax (lines 495-503)
- Statement Comparison table: add async column (lines 471-478)
- Grammar Summary tokens (lines 857-893)
- Terminology: add RETURN, ASYNC, AWAIT, push (lines 988-1092)
- Highlighting keywords list (line 689)

**Version History:**
```markdown
- **v0.9** (2026-01-xx): Added RETURN keyword; ASYNC/AWAIT modifiers for DELEGATE; 
  optional TO target in DELEGATE; push operator `<<`; WITH param syntax change 
  (colon, no $ prefix); **Breaking**: removed PARALLEL FOR EACH; added DO keyword 
  for prose; **Breaking**: Types/Input/Context moved to YAML frontmatter; 
  colon rule; keyword placement rule
```

## Decisions (Resolved)

1. RETURN valid at end of section or loop iteration only ✓
2. Implicit return allowed (no RETURN = natural completion) ✓
3. Type inference deferred to v0.10 (DELEGATE targets must be literals) ✓
4. `## Types`, `## Input`, `## Context` sections removed entirely ✓

## Measures of Success

- [ ] grammar.md updated to v0.9
- [ ] language-spec.md updated to v0.9
- [ ] All examples in specs use v0.9 syntax
- [ ] Version history updated
- [ ] Cross-reference consistency verified

## Estimated Effort

15-21 hours
