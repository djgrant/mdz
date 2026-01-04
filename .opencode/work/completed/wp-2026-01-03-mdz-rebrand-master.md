# MDZ Rebrand - Master Work Package

## Goal/Problem
Rebrand the project from "zen" to "MDZ" (Zen Markdown) across all components: language, website, docs, package, and file extensions.

## Scope
- Stream 1: Website hero, code example, logomark, Header.astro, index.astro
- Stream 2: Docs styling (list spacing, syntax highlighting, nav headings), content additions
- Stream 3: Package rename (zen-lang → zenmarkdown), file extension (.zen.md → .mdz)
- Stream 4: Language primitive types ($String, $Number, $Boolean), FilePath warning

## Execution Order
1. ✅ Stream 4 first (language change affects validation)
2. ✅ Stream 3 (package rename - foundational)
3. ✅ Streams 1 & 2 in parallel (website updates)

## Work Packages Completed

### Stream 4: Language Primitives
- Added `BUILTIN_PRIMITIVES = new Set(['String', 'Number', 'Boolean'])`
- Updated `validateTypes()` to skip warnings for built-in primitives
- Added 5 tests for primitive type behavior
- All tests pass

### Stream 3: Package & Code
- `package.json`: name → "zenmarkdown", bin → "mdz"
- Renamed all example files to .mdz
- Updated README.md with complete MDZ branding
- Updated CLI with new command name and help text

### Stream 1: Website Hero
- New headline: "A language for the world's most powerful runtime"
- Reduced hero padding
- Created MDZ logomark (SVG)
- Updated Header with logo
- All references to "zen" replaced

### Stream 2: Docs Styling
- List spacing: margin-bottom 0.5rem → 0.25rem
- Nav headings: 0.85rem, line-height 1, weight 600
- Added syntax highlighting classes
- Added "How it Works Under the Hood" content
- Added "What Makes an LLM Language Different" content
- Updated all docs with MDZ branding

## Results

### Summary of Changes

**Files Modified:**
- `src/compiler/compiler.ts` - Built-in primitives, MDZ comments
- `src/cli/index.ts` - MDZ branding, commands
- `package.json` - name, bin command
- `README.md` - Complete rewrite
- `website/src/pages/index.astro` - Hero, branding
- `website/src/components/Header.astro` - Logo, branding
- `website/src/layouts/DocsLayout.astro` - Styling fixes
- `website/src/pages/docs/*.astro` - Content updates

**Files Renamed:**
- `examples/the-scientist.zen.md` → `examples/the-scientist.mdz`
- `examples/debugger.zen.md` → `examples/debugger.mdz`
- `examples/skill-composer.zen.md` → `examples/skill-composer.mdz`
- `test-loop.zen.md` → `test-loop.mdz`

**Files Created:**
- `website/public/mdz-logo.svg` - New logomark

### Logomark Description
The MDZ logomark features:
- Three horizontal lines of decreasing length (representing document/markdown structure)
- A circle element (representing focus and clarity - the "Zen" philosophy)
- Monochrome design using currentColor (works in light/dark modes)
- Minimal, developer-friendly aesthetic

### Test Status
- All 39+ tests pass
- Website builds successfully (13 pages)

## Evaluation
✅ **Rebrand completed successfully**

All four streams executed in the correct dependency order. The project is now consistently branded as "MDZ (Zen Markdown)" throughout:

- Package name: zenmarkdown
- CLI command: mdz
- File extension: .mdz
- Brand name: MDZ or Zen Markdown (never just "zen")

The technical content additions (How it Works, LLM Language differences) strengthen the documentation for technical readers while the styling fixes improve readability.
