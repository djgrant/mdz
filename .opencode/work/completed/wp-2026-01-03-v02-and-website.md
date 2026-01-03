# Zen v0.2 + Website

## Goal/Problem

Two parallel workstreams:
1. Implement the v0.2 roadmap features
2. Build a minimalist website with docs and playground

## Workstream 1: v0.2 Language Features

### Features to Implement

1. **PARALLEL FOR EACH** - Concurrent iteration for multi-agent orchestration
2. **Extended imports in frontmatter** - Explicit skill loading
3. **Typed parameters in delegation** - Type annotations in WITH clauses  
4. **BREAK and CONTINUE** - Loop control keywords

### Success Criteria
- All features specified in grammar
- Parser handles new syntax
- Compiler transforms correctly
- Tests cover new features
- Documentation updated

## Workstream 2: Website

### Requirements

**Aesthetic**: Minimalist, conveys the vision
- Clean, focused design
- Zen-inspired aesthetic (space, simplicity, clarity)
- Dark/light mode

**Content**:
- Vision/philosophy
- Documentation (spec, grammar, API)
- Examples gallery
- Getting started guide

**Playground**:
- Monaco editor with zen syntax highlighting
- LSP integration (autocomplete, hover, diagnostics)
- Live compilation preview
- Share functionality

### Technical Approach
- Static site (likely Astro, Next.js, or similar)
- Monaco editor for playground
- LSP running in browser via WebWorker or WebSocket
- Deploy to Vercel/Netlify/Cloudflare Pages

## Approach

Run both workstreams in parallel:
- v0.2 features: Diverge on implementation approaches, converge on best
- Website: Diverge on design/UX, converge on final implementation

## Hypothesis

1. v0.2 features can be added without breaking existing syntax
2. A playground with LSP is feasible in-browser
3. Minimalist aesthetic will communicate zen philosophy effectively

## Results

(To be filled)

## Evaluation

(To be filled)
