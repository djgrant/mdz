---
size: sm
category: website
---

# Stream 2: Docs Design System

## Goal/Problem

The documentation pages need visual polish. The current layout and typography may have inconsistencies that make the docs less readable and professional.

## Scope

- `/website/src/layouts/DocsLayout.astro` - Main docs layout
- `/website/src/styles/global.css` - Global styles and design tokens
- Individual doc pages as needed

## Approach

### 1. Audit Current State

Review each docs page visually and identify issues:
- Spacing inconsistencies (margins, padding, gaps)
- Typography issues (line-height, font-size, weights)
- Layout problems (sidebar, content width, alignment)
- Code block styling
- List styling
- Link styling

### 2. Rationalize Design System

Define clear scales and patterns:

**Spacing Scale:**
- Base unit (e.g., 4px or 0.25rem)
- Standard gaps: 4, 8, 12, 16, 24, 32, 48, 64
- Section spacing
- Component internal spacing

**Typography Scale:**
- Body text size and line-height
- Heading sizes (h1-h4)
- Code text size
- Small/caption text

**Component Patterns:**
- Code blocks (padding, border-radius, background)
- Inline code
- Blockquotes
- Lists (ul, ol)
- Tables if any

### 3. Implement Fixes

Apply the rationalized system consistently:
- Update DocsLayout prose configuration
- Adjust CSS custom properties if needed
- Fix specific issues identified in audit

## Current Layout Structure

DocsLayout has:
- Fixed sidebar (hidden on mobile)
- Main content area with prose styling
- Tailwind prose classes for typography

Key styles from DocsLayout:
```css
.prose h1 { font-size: 2rem; margin-top: 0; }
.prose h2 { font-size: 1.5rem; margin-top: 2rem; }
.prose h3 { font-size: 1.25rem; }

.prose pre {
  background: #1E1E1E;
  padding: 1.5rem;
  border-radius: 0.5rem;
}
```

## Hypothesis

A rationalized design system will:
1. Make docs more readable and professional
2. Create visual consistency across pages
3. Improve the overall perceived quality of zen

## Results

_To be filled by implementing agent_

## Evaluation

_To be filled upon completion_
