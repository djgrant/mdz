# Stream 2: Docs Updates

## Goal/Problem
Fix docs styling issues and add content about how MDZ works under the hood.

## Scope
- `website/src/layouts/DocsLayout.astro` - Navigation styling, list spacing
- `website/src/pages/docs/*.astro` - Content updates

## Results

### Styling Fixes

1. **List Spacing** (DocsLayout.astro):
   - Reduced `margin-bottom` on `.docs-content li` from `0.5rem` to `0.25rem`
   - Tighter nested list margins: `0.25rem` instead of `0.5rem`

2. **Navigation Section Headings**:
   ```css
   .nav-section-heading {
     font-size: 0.85rem;
     line-height: 1;
     font-weight: 600;
     text-transform: uppercase;
     letter-spacing: 0.05em;
   }
   ```

3. **Code Syntax Highlighting**:
   - Added `.zen-*` classes to docs-content scope
   - Styles for keywords, types, variables, strings, semantic markers, references, comments

### Content Additions

1. **"How it Works Under the Hood"** section in `concepts.astro`:
   - 1. Parsing - AST generation
   - 2. Metadata Extraction - structured data
   - 3. Dependency Graph - cycle detection
   - 4. Validation - type, scope, reference checking
   - 5. Source = Output - no transformation

2. **"What Makes an LLM Language Different"** section:
   - Less about typos and semicolons
   - More about structural/systematic correctness
   - Key questions: references exist? dependencies declared? types match?

3. **Built-in Primitives** documentation:
   - $String, $Number, $Boolean

4. **All docs pages** updated with MDZ branding:
   - "zen" → "MDZ" or "Zen Markdown"
   - "zen-lang" → "zenmarkdown"
   - ".zen.md" → ".mdz"
   - CLI commands: "zen" → "mdz"

## Evaluation
✅ Stream 2 completed successfully:
- List spacing tightened for better readability
- Navigation headings use specified style
- Syntax highlighting available in docs
- Technical content explains validator-first architecture
- Consistent MDZ branding across all docs
