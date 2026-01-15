# Docs Source of Truth

This folder contains the markdown source of truth for MDZ documentation.

## MDX + Snippets

Docs pages use `.mdx` files so they can import MDZ snippets directly. Snippets live under `docs/snippets/` as standalone `.mdz` files and are rendered via the `MdzCodeBlock` component.

Example usage:

```mdx
import MdzCodeBlock from "@web2/components/MdzCodeBlock.astro";
import hero from "snippets/landing/hero-example.mdz?raw";

<MdzCodeBlock source={hero} />
```
