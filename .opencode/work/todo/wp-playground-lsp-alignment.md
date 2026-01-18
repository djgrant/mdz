# WP: Playground LSP Intelligence Alignment

## Goal
Resolve the functional gap between the core type system and the Playground UI. Fix completion bugs, frontmatter blindness, and missing semantic highlighting.

## Issues to Fix
1. **Broken Path Completions**: Fix the offset bug (e.g., `~/ap-reduce`) and ensure `skill/` or `agent/` prefixes are included.
2. **Frontmatter Recognition**: Ensure variables/types declared in frontmatter are visible to hover and completion providers.
3. **Contract Tooltips**: Fix the `skillRegistry` lookup so `USE/DELEGATE` hover shows the target's input contract.
4. **Missing Highlighting**: Add `WITH` keyword support and fix semantic marker (`/.../`) tokenization.
5. **Standardize Registry**: Use project-relative paths as canonical keys in the LSP server.

## Success Criteria
- [ ] `~/` autocomplete shows correct full paths without character corruption.
- [ ] Hovering over frontmatter-declared variables shows their type.
- [ ] `USE ~/skill/...` hover shows "Input Contract" section.
- [ ] `WITH` and `/semantic markers/` are correctly colored in the editor.
