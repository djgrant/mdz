---
size: xs
category: website
---

# Stream 4: Header Width Fix

## Goal/Problem

When page content is full-screen width (like the playground), the header content inside should also be full-screen. Currently, the header content is constrained by `max-w-[var(--max-width-content)]`.

## Scope

- `/website/src/components/Header.astro` - Header component
- `/website/src/layouts/Layout.astro` - May need to pass width context
- `/website/src/pages/playground.astro` - Example of full-width page

## Current Implementation

Header.astro:
```html
<header class="fixed top-0 left-0 right-0 z-50 bg-... backdrop-blur-md border-b ...">
  <nav class="max-w-[var(--max-width-content)] mx-auto px-[var(--spacing-page)] h-16 flex items-center justify-between">
    <!-- Logo and nav links -->
  </nav>
</header>
```

The nav has `max-w-[var(--max-width-content)]` which constrains it to 72rem regardless of page content width.

## Approach

### Option A: Pass width mode to Header

Add a prop to Header:
```astro
interface Props {
  currentPath?: string;
  fullWidth?: boolean;
}
```

Then conditionally apply width:
```html
<nav class:list={[
  'mx-auto px-[var(--spacing-page)] h-16 flex items-center justify-between',
  fullWidth ? 'max-w-full' : 'max-w-[var(--max-width-content)]'
]}>
```

### Option B: Detect page type from path

Infer from currentPath whether page should be full-width:
- `/playground` → full-width
- Everything else → constrained

### Option C: CSS-only solution

Use container queries or page-specific CSS to adjust header width.

## Recommendation

Option A is clearest - explicit prop makes behavior obvious.

## Hypothesis

Making the header width match the page content width will:
1. Create visual consistency
2. Better utilize screen space on full-width pages
3. Maintain the design on constrained pages

## Results

_To be filled by implementing agent_

## Evaluation

_To be filled upon completion_
