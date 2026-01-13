# v0.9 Website Updates

## Goal

Update documentation and playground for v0.9 language features.

## Scope

- `website/src/pages/docs/*.astro` (5 core docs)
- `website/src/pages/index.astro` (homepage)
- `website/src/pages/playground.astro` (Monaco highlighting)
- `website/src/data/examples.json`
- `website/public/*.js` (compiler bundles)
- `editors/vscode/syntaxes/mdz.tmLanguage.json`

## Approach

### Documentation Updates

**syntax.astro:**
- Add RETURN keyword
- Add push operator `<<`
- Add DO instruction
- Update WITH syntax examples

**control-flow.astro:**
- Remove PARALLEL FOR EACH section
- Add ASYNC/AWAIT DELEGATE section
- Clarify DO (WHILE delimiter vs instruction)

**composition.astro:**
- Update DELEGATE for ASYNC/AWAIT
- Update WITH clause syntax

**concepts.astro:**
- Update CAPS keywords list (add RETURN, ASYNC, AWAIT; remove PARALLEL)

**higher-order.astro:**
- Remove PARALLEL FOR EACH examples
- Add ASYNC DELEGATE patterns

### Homepage Updates (index.astro)

Update hero code example and syntax overview sections.

### Playground Updates (playground.astro)

**Monaco keywords (line ~1254):**
```javascript
// Before
/\b(PARALLEL FOR EACH|FOR EACH|WHILE|DO|IF|THEN|ELSE|IN|AND|OR|NOT|WITH|BREAK|CONTINUE|DELEGATE|USE|EXECUTE|GOTO|TO)\b/

// After
/\b(FOR EACH|WHILE|DO|IF|THEN|ELSE|IN|AND|OR|NOT|WITH|BREAK|CONTINUE|RETURN|ASYNC|AWAIT|DELEGATE|USE|EXECUTE|GOTO|TO)\b/
```

Add operator pattern for `<<`.

### VS Code Extension (mdz.tmLanguage.json)

**Control flow keywords (lines 47-60):**
- Remove `PARALLEL\\s+FOR\\s+EACH` pattern
- Add `RETURN`, `ASYNC`, `AWAIT` to keyword list
- Add `<<` operator pattern

### Compiler Bundle Rebuild

After parser changes complete:
```bash
cd website
node scripts/bundle-compiler.js
node scripts/build-worker.js
```

### Examples Data (examples.json)

Update inline examples to use v0.9 syntax.

### Migration Guide (NEW)

Create `website/src/pages/docs/migration-v09.astro`:
- Breaking changes summary
- PARALLEL FOR EACH → ASYNC DELEGATE migration
- WITH syntax change
- Frontmatter declarations

## Dependency Order

```
1. Wait for wp-v0.9-parser completion
2. Rebuild compiler bundle
3. Update documentation
4. Update playground highlighting
5. Create migration guide
```

## Measures of Success

- [ ] All docs updated for v0.9
- [ ] Playground recognizes new keywords
- [ ] VS Code extension highlights new syntax
- [ ] Migration guide published
- [ ] Compiler bundle rebuilt

## Estimated Effort

16-24 hours
