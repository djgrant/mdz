# Stream 1: Website Updates

## Goal/Problem
Update the website homepage with new MDZ branding, improved hero section, and add a logomark.

## Scope
- `website/src/pages/index.astro` - Hero section, code example, branding
- `website/src/components/Header.astro` - Logo/brand name
- `website/public/mdz-logo.svg` - New logomark

## Results

### Changes Made

1. **Hero Section** (`index.astro`):
   - Headline: "A language for the world's most powerful runtime" (single line)
   - Reduced padding: `py-16 md:py-20` (from py-24 md:py-32)
   - New tagline: "Zen Markdown" 
   - Description emphasizes MDZ philosophy: "offloads logic, variables, and structure to syntax"
   - All "zen" → "MDZ" throughout

2. **Code Example Section**:
   - Changed `items-start` to `items-center` for vertical centering
   - Updated code snippets to use `.mdz` extension

3. **Quick Start Section**:
   - `npm install zenmarkdown`
   - `mdz check skill.mdz`

4. **Header** (`Header.astro`):
   - Logo text: "zen" → "MDZ"
   - Added inline SVG logomark (three lines + circle motif)
   - Clean, minimal design that works in light/dark mode

5. **Logomark** (`public/mdz-logo.svg`):
   - Three horizontal lines of decreasing length (markdown metaphor)
   - Circle element (focus/clarity)
   - Monochrome, works with currentColor
   - Simple, developer-friendly aesthetic

6. **Footer**:
   - "MDZ is open source under MIT license"

### Design Rationale

The logomark combines:
- **Three lines**: Represents markdown/document structure
- **Circle**: Represents focus, clarity (Zen philosophy)
- **Minimal design**: Aligns with "signal over noise" brand identity

## Evaluation
✅ Stream 1 completed successfully:
- Hero is concise and impactful
- MDZ branding consistent throughout
- Logomark is clean and developer-friendly
- Website builds successfully
