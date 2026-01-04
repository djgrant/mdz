# MDZ Website

Documentation and interactive playground for MDZ.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Structure

```
src/
├── components/     # Reusable Astro components
│   └── Header.astro
├── layouts/        # Page layouts
│   ├── Layout.astro
│   └── DocsLayout.astro
├── pages/          # Routes
│   ├── index.astro        # Landing page
│   ├── playground.astro   # Interactive editor
│   ├── docs/              # Documentation
│   └── examples/          # Examples gallery
└── styles/
    └── global.css         # Design tokens and base styles
```

## Design System

The site uses a minimal design system with:

- **Colors**: Monochrome with indigo accent (#6366F1)
- **Typography**: System fonts (fast loading)
- **Spacing**: Generous whitespace, max 72rem content width
- **Dark Mode**: Automatic based on system preference

## Playground

The playground uses Monaco Editor (VS Code's editor) with:

- Custom MDZ syntax highlighting
- Live compilation preview
- Example loading
- URL-based sharing

## Deployment

Build produces static files in `dist/`. Deploy to any static host:

- Vercel: `vercel --prod`
- Netlify: Connect repo or drag `dist/`
- Cloudflare Pages: Connect repo
- GitHub Pages: Deploy `dist/` folder

## Tech Stack

- **Astro** - Static site generator
- **Tailwind CSS** - Utility-first styling
- **Monaco Editor** - Code editor (loaded from CDN)
- **MDX** - Markdown with components (optional)
