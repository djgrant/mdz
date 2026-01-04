# Stream 3: Package & Code Updates

## Goal/Problem
Update all references from `zen-lang` to `zenmarkdown` and change file extension from `.zen.md` to `.mdz`.

## Scope
- `package.json` - Package name and bin command
- `README.md` - All references to package name and file extension
- `examples/*.mdz` - Renamed from .zen.md
- `src/cli/index.ts` - CLI help and messages

## Results

### Changes Made

1. **package.json**:
   - `"name": "zen-lang"` → `"zenmarkdown"`
   - `"bin": { "zen": ... }` → `"bin": { "mdz": ... }`

2. **File Renames**:
   - `examples/the-scientist.zen.md` → `examples/the-scientist.mdz`
   - `examples/debugger.zen.md` → `examples/debugger.mdz`
   - `examples/skill-composer.zen.md` → `examples/skill-composer.mdz`
   - `test-loop.zen.md` → `test-loop.mdz`

3. **README.md** - Complete rewrite with:
   - Title changed to "MDZ (Zen Markdown)"
   - New tagline: "A language for the world's most powerful runtime"
   - Install: `npm install zenmarkdown`
   - CLI: `mdz check`, `mdz compile`, etc.
   - Extension: `.mdz` throughout
   - Import: `from 'zenmarkdown'`
   - Added "Why MDZ?" section explaining philosophy
   - Added built-in primitives documentation

4. **src/cli/index.ts**:
   - All `zen` → `mdz` in commands and messages
   - Help text updated with MDZ branding
   - Import examples use `zenmarkdown`
   - File extensions updated to `.mdz`

### Test Results
All 39+ tests pass after changes.

## Evaluation
✅ Package successfully rebranded to MDZ:
- NPM package name is unique and discoverable
- CLI command `mdz` follows convention
- File extension `.mdz` is clean and memorable
- Consistent branding throughout documentation
