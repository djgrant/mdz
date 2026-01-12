# ELSE IF Support - Specification Updates

## Goal/Problem

Update the MDZ grammar specification and language spec to document `ELSE IF` chain support.

## Scope

Files to modify:
- `spec/grammar.md` - Update the `else_clause` production
- `spec/language-spec.md` - Add ELSE IF documentation to Control Flow section

## Approach

### Grammar Changes (`spec/grammar.md`)

Update the `if_then_stmt` and `else_clause` productions around line 292:

**Current:**
```ebnf
if_then_stmt      = IF condition THEN colon newline block_body [ else_clause ] ;
else_clause       = ELSE colon newline block_body ;
```

**New:**
```ebnf
if_then_stmt      = IF condition THEN colon newline block_body { else_if_clause } [ else_clause ] ;
else_if_clause    = ELSE IF condition THEN colon newline block_body ;
else_clause       = ELSE colon newline block_body ;
```

### Language Spec Changes (`spec/language-spec.md`)

In the "IF THEN ELSE" section (around line 363), add ELSE IF documentation:

```markdown
### IF THEN ELSE IF

For multiple conditions, use ELSE IF chains:

\`\`\`
IF $severity = "critical" THEN:
  - Request changes immediately
ELSE IF $severity = "major" THEN:
  - Add to findings list
ELSE IF /minor concern/ THEN:
  - Note as suggestion
ELSE:
  - Approve
\`\`\`

ELSE IF chains can:
- Mix deterministic and semantic conditions
- Have any number of ELSE IF branches
- Have an optional final ELSE branch
```

### Control Flow vs Macros Table

Update the table in grammar.md (around line 317) to include:
| Runtime ELSE IF | `ELSE IF condition THEN:` | Runtime | LLM |

## Hypothesis

These specification changes will:
1. Formally define ELSE IF syntax in the grammar
2. Provide clear documentation for users
3. Guide the parser implementation

## Results

Completed successfully:
- Updated `spec/grammar.md` with `else_if_clause` production
- Added `ELSE IF` row to Control Flow vs Macros table
- Updated `spec/language-spec.md` with `IF THEN ELSE IF` section
- Added `ELSE_IF` to Grammar Summary tokens
- Added `Else if clause` to Terminology section

## Evaluation

All specification updates implemented as designed. The grammar now formally defines ELSE IF chains.
