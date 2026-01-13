# Clean Room File Tree Implementation

## Goal

Replace the current broken file tree UI with a clean, VS Code-style implementation.

## Context

- **File**: `/Users/coder/Repos/ai/mdz/website/src/pages/playground.astro`
- This is an Astro page with scoped CSS (must use `:global()` for dynamically generated content)
- The file tree is rendered via JavaScript into `#file-tree` element
- Two projects exist: "Compiler Examples" (flat files) and "The Scientist" (nested folders)

## Data Structure

Keep these - they work correctly:

- `buildFileTree(filePaths)` - converts flat paths to tree structure:
  ```javascript
  { name, path, type: 'file'|'folder', children: [] }
  ```
- `expandedFolders` - Set tracking which folders are expanded
- `currentFile` - currently selected file path

## Required Functions

1. **`renderFileTree()`** - renders the tree into `#file-tree`
2. **`renderTreeNode(node, depth)`** - renders a single node recursively
3. **`toggleFolder(path)`** - toggles folder expansion
4. **`expandParentFolders(filePath)`** - expands all parent folders of a path

## Visual Requirements

- Minimal, clean design like VS Code file explorer
- 22-24px row height
- Icons: chevron (12x12), folder/file (14x14)
- Monospace font for file names
- Subtle indentation per level (12-16px)
- No connecting lines (remove border-left approach)
- Hover: subtle background highlight
- Active: accent color highlight
- Dark mode support via `.dark` class on html element

## CSS Variables Available

```css
--color-text, --color-text-dark
--color-muted, --color-muted-dark
--color-accent (indigo)
--color-border, --color-border-dark
```

## Acceptance Criteria

1. Files display correctly with file icon
2. Folders display with chevron + folder icon
3. Clicking folder toggles expansion with chevron rotation
4. Clicking file calls `switchToFile(path)`
5. Selected file highlighted
6. Proper indentation at each nesting level
7. Works in light and dark mode
8. Icons properly sized and aligned with text

## Results

Implementation completed successfully.

### CSS Styles Added (lines 220-322)

Added VS Code-style file tree CSS using `:global()` wrappers:

- `.tree-list` - Unstyled list container
- `.tree-item` - 22px height rows with flexbox layout, rounded corners
- `.tree-item:hover` - Subtle background highlight (different for light/dark)
- `.tree-item.active` - Accent color background with white text
- `.tree-chevron` - 12x12 chevron icon with 0.15s rotation transition
- `.tree-chevron.expanded` - 90deg rotation for expanded state
- `.tree-chevron-spacer` - Invisible spacer for file alignment
- `.tree-icon` - 14x14 icons with muted color (folder icons use golden #e8a838)
- `.tree-name` - Monospace font (JetBrains Mono/Fira Code), 12px

### Updated Functions

**`renderTreeNode()`** (lines 1503-1550):
- Inline SVG icons for chevron, folder, and file
- 14px indentation per depth level
- Chevron rotation via `.expanded` class
- Files get spacer element to align with folder names
- `event.stopPropagation()` on click handlers

**`renderFileTree()`** (lines 1581-1606):
- Root `<ul>` uses `class="tree-list"` instead of inline styles

### Acceptance Criteria Verification

1. ✓ Files display with file icon (document SVG)
2. ✓ Folders display with chevron + folder icon
3. ✓ Clicking folder toggles with animated chevron rotation
4. ✓ Clicking file calls `switchToFile(path)`
5. ✓ Selected file highlighted with accent color
6. ✓ Proper 14px indentation per level
7. ✓ Works in light and dark mode via `:global(.dark ...)` selectors
8. ✓ Icons properly sized (12x12 chevron, 14x14 icons) and aligned via flexbox

## Evaluation

The implementation successfully replaces the broken file tree with a clean, VS Code-style component. All acceptance criteria are met. The approach of using `:global()` CSS selectors for dynamically-generated content works correctly in the Astro context. The chevron rotation animation provides good visual feedback for folder state changes.
