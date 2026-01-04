---
size: md
category: docs
---

# HN Launch Prep

## Goal/Problem

Prepare for a Hacker News launch. This bundles several concerns:
- Compelling README
- Clear positioning
- Real example that resonates
- Anticipate questions/objections

## Scope

- README.md polish
- Positioning/messaging review
- Launch checklist

## Approach

1. README audit:
   - Does it explain what MDZ is in 10 seconds?
   - Is the value prop clear?
   - Is there a quick start that works?
   - Are examples compelling?

2. Positioning:
   - What's the one-liner?
   - What category does this fit? (programming language? framework? tool?)
   - What's the "why now" story?

3. Anticipate HN audience:
   - "Why not just use markdown?"
   - "Isn't this just prompt engineering?"
   - "What about [competitor]?"
   - "Show me something real"

4. Launch checklist:
   - [ ] README polished
   - [ ] Examples work out of box
   - [ ] Playground functional
   - [ ] Real-world example ready
   - [ ] FAQ for common objections

## Hypothesis

Preparation prevents the "interesting but I don't get it" response.

## Results

### README Audit

**Does it explain what MDZ is in 10 seconds?**

Current tagline: "A language for the world's most powerful runtime"

**Assessment: UNCLEAR** - This is evocative but requires the reader to figure out what "most powerful runtime" means. A HN reader scrolling quickly may not connect this to LLMs.

The second paragraph (line 5) is clearer: "MDZ extends markdown with constructs for expressing agent behaviors, composition, and orchestration patterns." But it's buried.

**Recommendations:**
1. Lead with the concrete: "MDZ is markdown with syntax for building LLM-powered agents"
2. Keep the evocative tagline but use it as secondary
3. Consider: "A component architecture for multi-agent systems" (from AGENTS.md)

**Is the value prop clear?**

The "Why MDZ?" section has good points but uses abstract language ("signal over noise", "clarity of thought"). These are aspirational, not concrete.

**What's missing:** 
- What problem does this solve that I have today?
- Before/after comparison
- "Without MDZ, X happens. With MDZ, Y."

**Concrete angle from benchmarks:** "2-3x fewer tokens with no loss in task completion" - this is measurable and HN loves numbers.

**Is there a quick start that works?**

Quick start section (lines 18-35) looks good structurally. Key concern: `npm install zenmarkdown` - is this actually published to npm? If not, the quick start is broken.

Commands `mdz check`, `mdz compile`, `mdz graph`, `mdz parse` are documented. Tests pass (155 tests). CLI appears functional.

**Are examples compelling?**

The syntax example in README is good but abstract. The `examples/` directory has:
- `the-scientist.mdz` - hypothesis-driven iteration
- `skill-composer.mdz` - multi-skill orchestration
- `debugger.mdz` - skill execution tracing

**Assessment:** These are meta/tooling examples. HN audience will want something more relatable like:
- A code review skill
- A bug triage workflow  
- A PR summary generator

### Positioning Analysis

**One-liner candidates:**

1. Current: "A language for the world's most powerful runtime" - poetic but obscure
2. From Vision: "A superset of markdown for multi-agent systems" - technical but clear
3. Hybrid: "Markdown syntax for LLM-native programs" - concise
4. Provocative: "What if your LLM could execute structured programs?" - hooks curiosity

**Recommended one-liner for HN:**
> "MDZ: Markdown syntax for building LLM agents - with static analysis to catch errors before runtime"

This hits: what it is (markdown), who it's for (agent builders), why it matters (static analysis = less runtime confusion).

**Category:**

MDZ is closest to a **DSL (domain-specific language)** or **authoring format** rather than:
- A framework (no runtime layer)
- A library (no code to import for execution)
- A tool (the CLI is tooling, but MDZ itself is a format)

**For HN, position as:** "A DSL for multi-agent workflows" or simply "A language"

**Why now story:**

1. LLMs have become capable enough to be treated as runtimes
2. As agent systems grow complex, the same problems that plagued software (dependencies, types, testing) emerge
3. SOTA models work better with concise prompts than verbose ones (validated in benchmarks)
4. The tooling gap: we have linters for code, but prompts are validated at runtime by a confused LLM

### HN Objection Responses

**"Why not just use markdown?"**

Response: "You can. MDZ is valid markdown. But as your agent systems grow, you need contracts (types), dependency validation (references), and composition patterns. MDZ adds these without changing the prose you write for the LLM."

**"Isn't this just prompt engineering?"**

Response: "It's prompt engineering with tooling. Like how TypeScript is still JavaScript, but with types. MDZ validates your skill definitions before the LLM sees them - catching broken references, undefined types, and circular dependencies."

**"What about [competitor]?"**

Likely comparisons:
- LangChain: "LangChain is a framework with code; MDZ is an authoring format with validation"
- YAML prompts: "YAML captures structure; MDZ captures semantics the LLM interprets"
- DSPy: "DSPy optimizes prompts programmatically; MDZ gives human authors a structured format"

**"Show me something real"**

This is the gap. The examples are all meta (orchestration, scientific method). Need:
- A production-ready skill that does something useful
- Before/after: "Here's a messy prompt. Here's the MDZ version."
- Ideally: "Here's a skill we use to build this project"

### Launch Checklist Status

- [ ] **README polished** - Needs work. One-liner unclear, value prop abstract, missing concrete before/after.
- [x] **Examples work out of box** - Parser/compiler tests pass (155 tests), examples parse correctly
- [x] **Playground functional** - Web worker, Monaco editor, validation, dependency graph all working
- [ ] **Real-world example ready** - Current examples are meta/tooling. Need relatable use case.
- [ ] **FAQ for common objections** - Not present. Should add to README or website.

### Draft README Improvements

**Proposed new opening:**

```markdown
# MDZ (ZenMarkdown)

> Markdown syntax for building LLM agents - with static analysis to catch errors before runtime

MDZ extends markdown with types, references, and control flow for multi-agent systems. Write readable skills that tools can validate and LLMs can execute directly.

**Why MDZ?**
- **Validation before runtime** - Catch broken references and undefined types before your agent runs confused
- **2-3x fewer tokens** - Compact syntax, same task completion (benchmarked)
- **Composition** - Reference and validate skills against each other
- **LLM-native** - No transformation layer. What you write is what the LLM sees.
```

## Evaluation

### Key Recommendations

1. **Rewrite README opening** - Lead with concrete, follow with evocative
2. **Add one real-world example** - Code review, PR summary, or similar relatable workflow
3. **Add FAQ section** - Preempt the predictable HN objections
4. **Verify npm publish** - Ensure quick start actually works
5. **Consider homepage alignment** - Website says `mdz build` but CLI is `mdz compile`

### Launch Readiness

**Current state: 60% ready**

Blockers:
- README doesn't land the value prop in 10 seconds
- No relatable real-world example
- Missing FAQ/objection handling

Strengths:
- Playground is impressive and functional
- Tests pass, tooling works
- Benchmarks provide credible evidence
- Design is well-thought-out (VISION.md is strong)

### Priority Actions

1. Polish README opening (1 hour)
2. Write one relatable example skill (1-2 hours)
3. Add 4-5 FAQ items to README (30 min)
4. Verify npm publish works (30 min)
