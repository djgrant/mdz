# Docs Markdown Source of Truth + Minimal Site

## Goal

Deprecate the current website and establish markdown files in a new `docs/` directory as the single source of truth. Build a minimal website that renders those markdown files and provides a global switch to view MDZ snippets highlighted by different highlighters (TextMate, Monaco Monarch, LSP semantic tokens).

## Background

Docs content has drifted across multiple website pages and implementations, causing inconsistency when language updates land in one place but not others. A markdown-first source of truth will make updates traceable and easier to keep in sync with the language.

## Scope

### In Scope

- Create `docs/` directory and define a content structure (topics, ordering, frontmatter conventions).
- Inventory existing docs and collect content into markdown files.
- Minimal website that renders markdown content (no heavy design requirements).
- Global highlighter switch that changes how MDZ code blocks are highlighted:
  - TextMate grammar: `editors/vscode/syntaxes/mdz.tmLanguage.json`
  - Monaco Monarch tokenizer: `website/src/pages/playground.astro`
  - LSP semantic tokens: `packages/lsp/src/server.ts`
- Document the mapping between markdown pages and routes.
- All code snippets from landing page and playground
- Store MDZ code snippets as standalone `.mdz` files and import them into markdown (via MDX or custom templating).
- Add tests to parse all snippet files through the MDZ parser.

### Out of Scope (for this package)

- Final site design or visual polish.
- Migration of the full existing website framework (decide tech later).

## Deliverables

1. `docs/` directory populated with markdown content captured from existing docs.
2. Content map (table of contents + route plan).
3. Build minimal docs site rendering the markdown.
4. Global highlighter switch spec (and initial implementation if feasible within the prototype).
5. MDZ snippets extracted into `.mdz` files with automated parser coverage.

## Work Breakdown

1. **Content Inventory**
   - List all existing docs pages and map them to planned markdown files.
   - Identify duplicated or conflicting content.

2. **Markdown Collection**
   - Extract current docs into `docs/` markdown files.
   - Normalize structure (frontmatter, headings, code blocks).
   - Extract MDZ examples into `.mdz` snippet files and replace inline blocks with imports.

3. **Rendering Prototype**
   - Choose a simple renderer (run by user).
   - Implement rendering of `docs/` content into a basic site.

4. **Highlighter Switch**
   - Define how the switch affects all MDZ code blocks globally.
   - Implement at least one highlighter as baseline, then plug in others.

5. **Validation & Notes**
   - Document known inconsistencies and gaps discovered during migration.
   - Add a checklist for later polish/cleanup.
   - Add/adjust tests to parse all snippet files.

## Small Decisions

- Global highlighter switch will be persisted in local storage
- Docs will live in /docs at root of repo
- Current playground will be updated to reference /docs/examples
- Categorisation will be encoded in the path, not in frontmatter
- MDZ snippets will live in a dedicated folder (e.g. `docs/snippets/`) and be imported into markdown

## Measures of Success

- All docs content exists in `docs/` and renders correctly.
- Single place to edit docs text going forward.
- Global highlighter switch works for all MDZ code blocks.
- Tests are updated to compile examples in their new locations
- Snippet parser suite covers all `.mdz` snippet files

## Progress Log

### 2026-01-15

- Work package created to migrate docs to markdown-first source of truth and prototype a minimal docs site with a global highlighter switch.
