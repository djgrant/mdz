---
size: sm
category: tooling
---

# Zed Extension for MDZ

## Goal/Problem

Add syntax highlighting support for MDZ files in Zed editor.

## Scope

- New directory: `editors/zed/`
- Tree-sitter grammar or TextMate grammar
- Extension packaging for Zed

## Approach

1. Research Zed extension format (tree-sitter based)
2. Option A: Port existing VSCode TextMate grammar (`editors/vscode/syntaxes/zen.tmLanguage.json`)
3. Option B: Write tree-sitter grammar for better accuracy
4. Package and test locally

## Hypothesis

Syntax highlighting makes MDZ files more readable and catches obvious errors.

## Results

**Implemented: `editors/zed/`**

Created a Zed extension with the following structure:
```
editors/zed/
├── extension.toml         # Extension metadata
├── LICENSE                # MIT license (required by Zed)
├── README.md              # Documentation
└── languages/
    └── mdz/
        ├── config.toml    # Language configuration
        ├── highlights.scm # Syntax highlighting queries
        └── brackets.scm   # Bracket matching
```

**Key Design Decisions:**

1. **Used markdown grammar as base**: Zed requires Tree-sitter grammars (not TextMate). Since MDZ extends markdown, we leverage the existing `tree-sitter-markdown` grammar.

2. **File association**: `.mdz` files are associated with the MDZ language.

3. **Bracket auto-closing**: Added MDZ-specific bracket pairs:
   - `[[` → `]]` for skill references
   - `{~~` → `}` for semantic markers

4. **Comment style**: Block quotes (`> `) as line comments (MDZ convention)

**Limitations:**

The current implementation provides markdown-level syntax highlighting. Full MDZ-specific highlighting (variables like `$name`, keywords like `FOR EACH`, semantic markers `{~~}`) would require a custom Tree-sitter grammar (`tree-sitter-mdz`). This is a larger effort that could be a future enhancement.

**To Install:**
1. In Zed, use `zed: install dev extension`
2. Select the `editors/zed` directory

## Evaluation

The approach worked with a pragmatic trade-off:
- ✅ Provides useful syntax support for MDZ files
- ✅ Brackets auto-close correctly
- ✅ Matches Zed's extension format requirements
- ⚠️ Full MDZ highlighting would require custom Tree-sitter grammar

**Future work:**
- Create `tree-sitter-mdz` grammar for full syntax highlighting
- Publish to Zed extension registry
- Add outline support via `outline.scm`
