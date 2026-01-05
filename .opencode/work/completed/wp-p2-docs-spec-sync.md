---
size: sm
category: docs
parent: wp-p1-language-coherence-master
status: completed
---

# Documentation-Spec Synchronization

## Goal/Problem

Website documentation may be out of sync with the current spec and implementation. Need to audit and update.

## Scope

- `website/src/pages/docs/syntax.astro`
- `website/src/pages/docs/concepts.astro`
- `website/src/pages/docs/control-flow.astro`
- `website/src/pages/docs/composition.astro`
- `website/src/pages/docs/types.astro`
- `website/src/pages/docs/getting-started.astro`
- `website/src/pages/docs/index.astro`
- `website/src/pages/docs/ide.astro`
- `website/src/pages/docs/higher-order.astro`
- `website/src/pages/docs/internals.astro`
- `website/src/pages/docs/skill-library.astro`
- `website/src/pages/docs/using-in-project.astro`
- `README.md`
- `spec/language-spec.md` (reference)
- `spec/grammar.md` (reference)

## Audit Checklist

### Issues Found and Fixed

1. **concepts.astro line 9**: ~~"MDZ (Zen Markdown)"~~ → "MDZ" ✓
2. **control-flow.astro line 9**: ~~"Zen uses CAPS keywords"~~ → "MDZ uses" ✓
3. **syntax.astro line 22**: ~~"zen constructs"~~ → "MDZ constructs" ✓
4. **syntax.astro line 87**: Input parameter example ~~`= path to the skill`~~ → `# path to the skill` (comments for prose descriptions) ✓
5. **index.astro line 9**: ~~"MDZ (Zen Markdown)"~~ → "MDZ" ✓
6. **ide.astro line 36**: Wrong path ~~`editors/zen.tmLanguage.json`~~ → `editors/vscode/syntaxes/zen.tmLanguage.json` ✓
7. **control-flow.astro**: Missing PARALLEL FOR EACH documentation → Added ✓
8. **control-flow.astro**: Missing BREAK/CONTINUE documentation → Added ✓
9. **concepts.astro line 125**: CAPS keywords list missing PARALLEL, BREAK, CONTINUE → Added ✓
10. **control-flow.astro Design Philosophy**: Missing PARALLEL and BREAK/CONTINUE bullets → Added ✓
11. **skill-library.astro line 97-101**: Wrong imports syntax → Fixed to use `uses:` ✓
12. **using-in-project.astro**: WHILE loops missing parentheses → Fixed all instances ✓

### Verified Correct

- Type definitions use `=` (correct per spec)
- Input parameters with literal defaults use `=` correctly
- `#` comments used for parameter descriptions
- WHILE loops have parentheses (required per spec)
- IF conditions don't require parentheses (THEN is delimiter)
- Skill links `[[skill]]` and section links `[[#section]]` syntax correct
- Semantic markers `{~~content}` syntax correct
- WITH clause syntax correct for delegation

### Terminology Verification

- "Skill links" terminology used consistently ✓
- "Section links" terminology used consistently ✓
- "Semantic markers" terminology used consistently ✓
- "Dollar sigil" terminology available in docs ✓
- "Type annotation" (`:`) terminology correct ✓
- "Arrow operator" (`=>`) terminology correct ✓

## Changes Made

### control-flow.astro
- Changed "Zen" to "MDZ"
- Added "Parallel For-Each Loop" section with PARALLEL FOR EACH documentation
- Added "Break and Continue" section with BREAK/CONTINUE documentation
- Updated "Design Philosophy" list to include PARALLEL and BREAK/CONTINUE

### concepts.astro
- Removed "(Zen Markdown)" from lead paragraph
- Added PARALLEL, BREAK, CONTINUE to CAPS keywords list

### syntax.astro
- Changed "zen constructs" to "MDZ constructs"
- Fixed input parameter example to use `#` comment instead of `=` for prose

### index.astro
- Removed "(Zen Markdown)" from lead paragraph

### ide.astro
- Fixed TextMate grammar path

### skill-library.astro
- Fixed dependency declaration to use `uses:` instead of `imports:` with path

### using-in-project.astro
- Fixed WHILE loop syntax to include required parentheses (3 instances)

## Verification Approach

1. Read spec files (grammar.md, language-spec.md)
2. Audited each docs page against spec
3. Fixed discrepancies
4. Verified terminology matches glossary in spec

## Results

All documentation pages now match the v0.3 specification:
- Terminology is consistent (MDZ, not "Zen Markdown")
- Syntax examples are correct (parens for WHILE, no parens required for IF)
- v0.2 features documented (PARALLEL, BREAK/CONTINUE)
- Input parameter syntax correct (= for literals, # for comments)
- File paths accurate

## Evaluation

The sync identified 12 issues across 8 files. Most issues were:
- Stale "Zen" terminology (3 fixes)
- Missing v0.2 feature documentation (2 major additions)
- Syntax accuracy issues (WHILE parens, input comments)

The sync process is valuable for ensuring documentation stays current with spec evolution. Recommend running this audit after each spec version change.
