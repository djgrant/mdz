# Docs Content Map

This is the migration map from the legacy website docs to markdown files in `docs/`.

## Source Pages

- `website/src/pages/index.astro` -> `docs/landing.mdx`
- `website/src/pages/docs/index.astro` -> `docs/index.mdx`
- `website/src/pages/docs/getting-started.astro` -> `docs/getting-started.mdx`
- `website/src/pages/docs/syntax.astro` -> `docs/syntax.mdx`
- `website/src/pages/docs/control-flow.astro` -> `docs/control-flow.mdx`
- `website/src/pages/docs/composition.astro` -> `docs/composition.mdx`
- `website/src/pages/docs/types.astro` -> `docs/types.mdx`
- `website/src/pages/docs/higher-order.astro` -> `docs/higher-order.mdx`
- `website/src/pages/docs/concepts.astro` -> `docs/concepts.mdx`
- `website/src/pages/docs/skill-library.astro` -> `docs/skill-library.mdx`
- `website/src/pages/docs/cli.astro` -> `docs/cli.mdx`
- `website/src/pages/docs/api.astro` -> `docs/api.mdx`
- `website/src/pages/docs/ide.astro` -> `docs/ide.mdx`
- `website/src/pages/docs/using-in-project.astro` -> `docs/using-in-project.mdx`
- `website/src/pages/docs/internals/index.astro` -> `docs/internals/index.mdx`
- `website/src/pages/docs/internals/terminology.astro` -> `docs/internals/terminology.mdx`
- `website/src/pages/docs/internals/ast.astro` -> `docs/internals/ast.mdx`
- `website/src/pages/docs/internals/validation.astro` -> `docs/internals/validation.mdx`
- `website/src/pages/docs/internals/compilation.astro` -> `docs/internals/compilation.mdx`

## Snippet Storage

- All MDZ code snippets will live in `docs/snippets/` as `.mdz` files.
- Markdown pages will reference snippets via an import/include mechanism (TBD).

## Status

- All legacy docs pages have a corresponding markdown file in `docs/`.

## Open Tasks

- Capture landing page and playground snippets into `docs/snippets/`.
- Decide templating for snippet inclusion (MDX or custom preprocessor).
- Build the minimal docs renderer + global highlighter switch.
