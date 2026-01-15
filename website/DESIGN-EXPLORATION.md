# Zen Website Design Exploration

> Phase 1: Divergent thinking before convergence

## Design Philosophy

Zen is about clarity, intention, and the space between things. The website should embody these principles:

- **空 (Kū)** - Emptiness as design element. White space is not wasted space.
- **間 (Ma)** - The pause between notes. Let content breathe.
- **侘寂 (Wabi-sabi)** - Beauty in simplicity, imperfection, incompleteness.

---

## Option A: "The Void"

**Concept**: Pure minimalism. Black and white only. Maximum negative space.

**Palette**:
- Background: `#FAFAFA` (light) / `#0A0A0A` (dark)
- Text: `#1A1A1A` (light) / `#E5E5E5` (dark)
- Accent: None. All emphasis through typography weight and size.

**Typography**:
- Headings: System UI sans-serif, large sizes (48-72px)
- Body: System UI, comfortable 18-20px
- Code: System monospace

**Layout**:
- Extremely narrow content width (max 640px)
- Massive margins
- Single column only
- No sidebars

**Hero**:
```
                              zen

      a markdown extension language for multi-agent systems


                          [Try it →]
```

**Pros**: 
- Fastest load (no custom fonts, minimal CSS)
- Maximum focus on content
- Unique, memorable

**Cons**: 
- May feel stark/cold
- Limited visual interest
- Hard to create hierarchy

---

## Option B: "Ink & Paper"

**Concept**: Warm, calligraphic feel. Inspired by ink on handmade paper.

**Palette**:
- Background: `#F5F2EB` (warm white/cream)
- Text: `#2C2821` (warm black)
- Accent: `#8B4513` (sienna/terracotta) for links
- Dark mode: `#1C1A17` bg, `#E8E4DC` text

**Typography**:
- Headings: Serif (Georgia, Palatino) or "Source Serif Pro"
- Body: Sans-serif for contrast (system)
- Code: "JetBrains Mono" or "Fira Code"

**Layout**:
- Moderate width (max 768px)
- Generous padding
- Subtle paper texture (optional, CSS only)

**Hero**:
```
┌─────────────────────────────────────────────────┐
│                                                 │
│                      禅                         │
│                                                 │
│     zen is a markdown extension language        │
│     for multi-agent systems                     │
│                                                 │
│     It is readable as natural prose,            │
│     parseable by deterministic tools,           │
│     and interpretable by LLMs.                  │
│                                                 │
│     $Task = any executable instruction          │
│     FOR $step IN $workflow                      │
│       USE ~/skill/helper-skill TO /execute step/│
│     END                                         │
│                                                 │
│                  [ Enter Playground ]           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pros**:
- Warmer, more approachable
- Connects to East Asian aesthetic origin of "zen"
- Good readability

**Cons**:
- May feel dated/traditional
- Custom font loading
- Texture could be distracting

---

## Option C: "Terminal"

**Concept**: Code-first, technical aesthetic. Inspired by terminals and IDEs.

**Palette**:
- Background: `#1E1E1E` (dark) / `#FFFFFF` (light)
- Text: `#D4D4D4` (dark) / `#333333` (light)
- Accent: `#569CD6` (blue) for keywords
- Secondary: `#4EC9B0` (cyan) for types
- Tertiary: `#CE9178` (orange) for strings

**Typography**:
- Everything: Monospace ("JetBrains Mono", "Fira Code", "Monaco")
- Large code blocks as primary content
- Terminal-style interface elements

**Layout**:
- Full width editor-style
- Sidebar navigation (like VS Code explorer)
- Tabbed content areas

**Hero**:
```
┌────────────────────────────────────────────────────────┐
│ zen                                          ⚡ v0.1.0 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  $ npm install zen-lang                                │
│  $ zen compile skill.zen.md                            │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ---                                              │  │
│  │ name: my-skill                                   │  │
│  │ description: When you need to do something       │  │
│  │ ---                                              │  │
│  │                                                  │  │
│  │ ## Workflow                                      │  │
│  │                                                  │  │
│  │ FOR $task IN $tasks                              │  │
│  │   USE ~/skill/helper TO /execute task/           │  │
│  │ END                                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [ Documentation ]  [ Playground ]  [ GitHub ]         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Pros**:
- Familiar to developers
- Code is showcased naturally
- Good playground integration

**Cons**:
- May feel like "just another dev tool"
- Harder to read prose
- Excludes non-developer audiences

---

## Option D: "Linear Minimal"

**Concept**: Modern SaaS aesthetic. Clean lines, subtle gradients, professional.

**Palette**:
- Background: `#FFFFFF` (light) / `#0D0D0D` (dark)
- Text: `#171717` (light) / `#EDEDED` (dark)
- Accent: `#6366F1` (indigo/violet) - single accent color
- Muted: `#A1A1AA` for secondary text

**Typography**:
- Headings: "Inter" or system sans-serif, medium weight
- Body: Same, lighter weight
- Code: "Fira Code" with ligatures

**Layout**:
- Moderate width (max 1024px)
- Clean horizontal navigation
- Cards for features
- Subtle shadows/borders

**Hero**:
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  [Logo]  Docs  Playground  GitHub                        │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│           Write agent behaviors                          │
│           in readable markdown                           │
│                                                          │
│    Zen extends markdown with constructs for              │
│    multi-agent systems. Compose skills,                  │
│    define workflows, orchestrate with ease.              │
│                                                          │
│    [ Get Started ]  [ Try Playground ]                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ```zen                                             │  │
│  │ FOR $task IN $tasks                                │  │
│  │   Execute with /appropriate strategy/              │  │
│  │   IF $task.failed THEN                             │  │
│  │     USE ~/skill/fallback-skill TO /retry/          │  │
│  │   END                                              │  │
│  │ END                                                │  │
│  │ ```                                                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Pros**:
- Professional, trustworthy
- Familiar patterns
- Balanced approach

**Cons**:
- Less distinctive
- May feel corporate
- "Yet another Linear clone"

---

## Playground Layout Options

### Layout 1: Horizontal Split (Recommended for Desktop)

```
┌─────────────────────────────────────────────────────────────┐
│  [Examples ▾]  [Options ▾]                    [Share] [⛶]  │
├─────────────────────────────┬───────────────────────────────┤
│                             │                               │
│  # Editor                   │  # Compiled Output            │
│                             │                               │
│  ---                        │  <!-- Compiled Zen Skill -->  │
│  name: my-skill             │  ---                          │
│  ---                        │  name: my-skill               │
│                             │  ---                          │
│  ## Types                   │                               │
│                             │  ## Types                     │
│  $Task = something to do    │                               │
│                             │  $Task = something to do      │
│  ## Workflow                │                               │
│                             │  ## Workflow                  │
│  Execute with $Task         │                               │
│                             │  Execute with Task (something │
│                             │  to do)                       │
│                             │                               │
├─────────────────────────────┴───────────────────────────────┤
│  Errors: 0  │  Types: 1  │  References: 0  │  Line 14, Col 3│
└─────────────────────────────────────────────────────────────┘
```

### Layout 2: Vertical Split (Mobile-friendly)

```
┌─────────────────────────────────────────┐
│  [Examples ▾]  [Options ▾]  [Share] [⛶] │
├─────────────────────────────────────────┤
│                                         │
│  # Editor                               │
│                                         │
│  ---                                    │
│  name: my-skill                         │
│  ---                                    │
│                                         │
│  ## Workflow                            │
│  USE ~/skill/skill TO /execute/         │
│                                         │
├─────────────────────────────────────────┤
│  [ Source ]  [ Compiled ]  [ AST ]      │
├─────────────────────────────────────────┤
│                                         │
│  # Compiled Output                      │
│                                         │
│  Execute [skill]                        │
│                                         │
└─────────────────────────────────────────┘
```

### Layout 3: Tabbed (Most Compact)

```
┌─────────────────────────────────────────┐
│  [ Edit ]  [ Preview ]  [ AST ]         │
├─────────────────────────────────────────┤
│                                         │
│  (Shows one panel at a time)            │
│                                         │
│  ---                                    │
│  name: my-skill                         │
│  ---                                    │
│                                         │
│  ## Workflow                            │
│  USE ~/skill/skill TO /execute/         │
│                                         │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [Examples ▾]  [Options ▾]  [Share]     │
└─────────────────────────────────────────┘
```

---

## Technical Stack Evaluation

### Option 1: Astro + Tailwind (Recommended)

```
Pros:
- Static-first, great performance
- Island architecture for playground
- Markdown/MDX native
- Minimal JS shipped by default
- Excellent docs site template

Cons:
- Less familiar than Next.js
- Smaller ecosystem

Bundle size estimate: ~50KB base
```

### Option 2: Next.js + Tailwind

```
Pros:
- Very familiar
- Great deployment story
- Large ecosystem
- App router for layouts

Cons:
- Heavier runtime
- More complexity than needed

Bundle size estimate: ~150KB base
```

### Option 3: Vite + Vanilla

```
Pros:
- Maximum control
- Smallest possible bundle
- No framework lock-in

Cons:
- More boilerplate
- No built-in routing
- Manual markdown processing

Bundle size estimate: ~20KB base
```

---

## Recommendation

After exploring these options, I recommend:

**Design**: Option D "Linear Minimal" with elements from Option A "The Void"
- Use the professional structure of Linear Minimal
- Apply the restraint and whitespace of The Void
- Single accent color (indigo/violet or a zen-appropriate alternative)

**Playground**: Layout 1 (Horizontal Split) with responsive fallback to Layout 2

**Tech Stack**: Astro + Tailwind
- Best performance for static content
- Islands for interactive playground
- Native markdown support
- Easy deployment

---

## Next Steps

1. Create Astro project scaffold
2. Define color tokens and typography scale
3. Build component library (Header, Footer, CodeBlock, etc.)
4. Implement landing page
5. Set up documentation structure
6. Build playground with Monaco
7. Optimize and test
