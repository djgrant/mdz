# Link-Based References: Spec Updates

## Goal/Problem

Update the formal grammar and language specification to document link-based references, replacing sigil-based references (`@`, `~`, `#`, `!`) with path-based links (`~/path`).

## Scope

**Files to modify:**
- `spec/grammar.md` (lines 100-102, 142-148, 253-261, 314-322, 553-561, 602-673)
- `spec/language-spec.md` (lines 30-57, 202-278, 292-348, 551-626, 627-691, 1034-1061)

## Approach

### grammar.md Changes

1. **Token definitions (lines 100-102):**
   - Remove: `SIGIL_AT`, `SIGIL_TILDE`, `SIGIL_HASH`, `SIGIL_BANG`
   - Add: `LINK` token for `~/path/to/thing`
   - Keep: `ANCHOR` for `#section` (same-file only)

2. **Frontmatter (lines 142-148):**
   - Remove `uses:` section entirely
   - Dependencies are inferred from statements

3. **Reference productions (lines 253-261):**
   - Replace sigil-based productions with single `Link` production
   - Add optional `#anchor` suffix syntax
   ```
   Link         ::= '~/' Path ('#' Identifier)?
   Anchor       ::= '#' Identifier
   Path         ::= Identifier ('/' Identifier)*
   ```

4. **Statement productions (lines 314-322):**
   - Update DELEGATE: `DELEGATE Task TO Link (WITH Anchor)?`
   - Add USE: `USE Link TO Task`
   - Add EXECUTE: `EXECUTE Link TO Task`
   - Add GOTO: `GOTO Anchor`

5. **Error productions (lines 553-561):**
   - Update error examples to use new syntax

6. **Complete example (lines 602-673):**
   - Rewrite example with link-based references

### language-spec.md Changes

1. **Frontmatter section (lines 30-57):**
   - Remove `uses:` documentation
   - Note that dependencies are inferred from statements

2. **Reference documentation (lines 202-278):**
   - Document link syntax: `~/path/to/file`
   - Document anchor syntax: `#section`
   - Explain path resolution: `~/agent/x` → `./agent/x.mdz`
   - Document folder conventions: `agent/`, `skill/`, `tool/`

3. **Agents section (lines 292-348):**
   - Update to show `DELEGATE ... TO ~/agent/x` syntax

4. **Delegation section (lines 551-626):**
   - Full rewrite with new DELEGATE syntax
   - Add USE statement documentation
   - Add EXECUTE statement documentation
   - Add GOTO statement documentation

5. **Composition section (lines 627-691):**
   - Update all examples to use links
   - Document WITH clause for passing templates

6. **Grammar summary (lines 1034-1061):**
   - Update reference summary table

## Hypothesis

Updating specs first provides:
1. Clear reference for implementation work packages
2. Formal definition of syntax to guide parser changes
3. Documentation-driven design ensures coherence
4. Easier to catch design issues before code changes

## Results

### grammar.md Updates

1. **Token definitions**: Replaced `at_sign`, `tilde`, `bang` with `link_prefix = '~/'`
2. **Frontmatter**: Removed `uses_field` production, added comment about dependency inference
3. **Links and Anchors section**: New productions:
   - `link = link_prefix path [ '#' kebab_ident ]`
   - `anchor = '#' kebab_ident`
   - `path = kebab_ident { '/' kebab_ident }`
4. **Statement productions**: Added `USE`, `EXECUTE`, `GOTO` keywords and statements:
   - `delegate_stmt = DELEGATE semantic_marker TO link [ WITH anchor ]`
   - `use_stmt = USE link TO semantic_marker`
   - `execute_stmt = EXECUTE link TO semantic_marker`
   - `goto_stmt = GOTO anchor`
5. **Error productions**: Updated to reference link-based errors
6. **Disambiguation rules**: Updated Rule 5 (Link Parsing) and Rule 8 (DELEGATE vs USE vs EXECUTE)
7. **What Tooling Validates table**: Updated for link resolution
8. **Complete example**: Rewritten with new syntax
9. **Version**: Updated to v0.8 with changelog

### language-spec.md Updates

1. **Frontmatter Schema**: Removed `uses:` documentation, added note about dependency inference
2. **Links and Anchors section**: New ## section documenting:
   - Link syntax: `~/agent/x`, `~/skill/x`, `~/tool/x`
   - Folder conventions table
   - Anchor syntax: `#section`
   - Link resolution
   - Dependency inference
3. **Agents section**: Updated to show `DELEGATE TO ~/agent/x` syntax
4. **Semantic Markers section**: Restored (was missing after edits)
5. **Control Flow section**: Restored (was missing after edits)
6. **Statements section**: New ## section documenting:
   - `DELEGATE /task/ TO ~/agent/x`
   - `USE ~/skill/x TO /task/`
   - `EXECUTE ~/tool/x TO /action/`
   - `GOTO #section`
   - Statement comparison table
7. **Composition section**: Updated examples for USE and parameter passing
8. **Grammar Summary**: Updated token definitions for LINK, ANCHOR, PATH
9. **Validation section**: Updated error codes and what tooling checks
10. **Tooling Requirements**: Updated parser/validator/LSP requirements
11. **Highlighting**: Updated for new syntax elements
12. **Terminology**: Updated prefixes, links/anchors, keywords, composition sections
13. **Design Decisions**: Added "Why Link-Based References?", "Why Infer Dependencies?", "Why USE/EXECUTE/GOTO?"
14. **Version History**: Added v0.8 entry

### Verification

- No sigil-based references remain in active content
- All remaining `(@agent)`, `(~skill)` etc. are in version history or "Previous syntax" documentation
- Both spec files updated to v0.8
- Internal cross-references corrected

## Evaluation

The hypothesis was confirmed:

1. **Clear reference for implementation**: The specs now define exact syntax for parser changes
2. **Formal definition**: Grammar productions are complete and unambiguous
3. **Documentation-driven design**: Writing specs first revealed the need for:
   - `WITH #anchor` clause for passing context to delegates
   - Clear folder conventions (agent/, skill/, tool/)
   - Statement comparison table to clarify when to use each keyword
4. **Caught design issues**: The original approach didn't account for parameter passing with USE; added colon-newline syntax for that case

Ready for implementation work packages (parser, compiler, LSP).
