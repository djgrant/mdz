# Onboarding UX Audit

## Goal/Problem

Test the user journey against these benchmarks:
- **3 seconds**: Understand the proposition
- **30 seconds**: Understand the tech at a high level
- **30 minutes**: Ship something (aim lower)

## Scope

- Website homepage
- Documentation flow
- Playground experience
- Getting started guide

## Approach

1. 3-second test:
   - What does the headline communicate?
   - Is the value prop immediately clear?
   - Does the visual design support understanding?

2. 30-second test:
   - Can someone skim and get it?
   - Are there too many concepts at once?
   - Is there a clear mental model?

3. 30-minute test:
   - Follow the getting started guide fresh
   - Note friction points
   - Where do people get stuck?
   - Can they actually ship something?

4. Identify:
   - Confusion points
   - Missing explanations
   - Unnecessary complexity
   - Quick wins to improve flow

## Hypothesis

Auditing the experience will reveal specific friction points we can fix.

## Results

### 3-Second Test: Homepage

**What I see:**
- Headline: "A language for the world's most powerful runtime"
- Sub-headline: "MDZ is a superset of markdown designed to leverage SOTA LLMs' ability to evaluate programs..."

**Assessment: FAILS 3-SECOND TEST**

Problems:
1. "Most powerful runtime" - What runtime? Requires inference.
2. "SOTA LLMs' ability to evaluate programs" - Too many concepts stacked (SOTA, LLMs, evaluate, programs)
3. The code example is visible but not explained
4. No immediate "what does this DO for me?"

**What works:**
- Clean visual design
- CTAs visible (Get Started, Try Playground)
- Code example shows something concrete

**Recommendations:**
1. Lead with benefit: "Validate your agent skills before runtime"
2. Immediate concrete: "Like TypeScript for prompts"
3. One-line before details: "MDZ adds types, references, and validation to markdown"

### 30-Second Test: Skimming the Page

**Flow:** Homepage → Features section → Syntax cards

**What I learn by scanning:**
- "Write in Structured Language"
- "LLM Executes Directly" 
- "Tooling Catches Errors"
- "Compose Complex Systems"

**Assessment: PARTIAL PASS**

These feature names are better than the headline. Someone skimming gets:
- It's about structure
- LLMs are involved
- There's validation tooling
- It's about composition

**Missing:**
- Who is this for? (agent builders? prompt engineers? teams?)
- What's the alternative? (vs raw markdown, vs langchain)
- Why would I switch?

**Syntax cards (Types, Variables, References, etc.):**
- Good: Show actual syntax with examples
- Problem: Six cards is a lot. Cognitive load.
- Problem: No hierarchy. What's most important?

**Recommendations:**
1. Add "Who is this for?" line below headline
2. Reduce syntax cards to 3: Types, References, Control Flow (the differentiators)
3. Move composition details to docs

### 30-Minute Test: Getting Started

**Simulated journey:**

**Minute 0-2: Arrive → Click "Get Started"**

- Page loads quickly
- Clear "Installation" section with `npm install zenmarkdown`
- ✅ Know how to install

**Minute 2-5: First skill**

```markdown
---
name: greeting
description: When you need to greet someone
---

## Types

$Greeting = a friendly greeting message
$Name = person's name
...
```

**Problem:** This is a toy example. "Greet someone" doesn't match why I came here (building agents).

**After quick start: "What now?"**

The guide ends with links to:
- Syntax Reference
- Type System
- Control Flow
- Examples

**Assessment:** No bridge. I made a greeting skill. How do I use this with my agent?

**Minute 5-10: Try playground**

- ✅ Playground loads
- ✅ Pre-loaded example works
- ✅ Validation shows in diagnostics panel
- ✅ Dependency graph visualizes

**This is the best part of the experience.** The playground demonstrates value immediately.

**Problem:** Playground is a dead end. Can't export. Can't save. Can't deploy.

**Minute 10-20: Examples page**

- The Scientist, Debugger, Skill Composer
- All meta/tooling examples
- None feel like "I could use this today"

**Assessment:** Examples are impressive but don't connect to daily work.

**Minute 20-30: Documentation**

- Concepts page is good. Explains "LLM is the runtime" clearly.
- Control flow documentation is thorough.
- BUT: Still no "now use it in your project" guidance.

**The journey stalls at: "OK I understand MDZ... but how do I use it?"**

### Friction Point Summary

**Critical (blocks adoption):**

1. **3-second value prop unclear** - Headline requires too much inference
2. **No "use in your project" guide** - Getting started ends with toy example
3. **No real-world example** - All examples are meta/tooling

**High (frustrates users):**

4. **Playground is a dead end** - Can't save, export, or continue
5. **Too many concepts upfront** - 6 syntax cards, complex feature names
6. **No "who is this for"** - Audience unclear

**Medium (polish items):**

7. **Homepage CLI example wrong** - Shows `mdz build` but command is `mdz compile`
8. **"zen" vs "MDZ" inconsistency** - Examples page title says "zen"
9. **No copy-to-clipboard on code blocks** - Small UX friction

### Recommended Journey Redesign

**3-second version:**

> MDZ: Type-safe markdown for LLM agents. Validate skills before runtime.

**30-second version:**

> You're building agent systems. Your prompts have types, dependencies, and control flow—but no tooling catches errors before your LLM runs confused. MDZ adds validation to markdown. `mdz check` finds broken references. `mdz graph` shows dependencies. What you write is what the LLM executes.

**30-minute path:**

1. **Install** - Same as now, works
2. **First skill: Code Review** - Not greeting, something real
3. **Validate it** - `mdz check` shows it works
4. **Use with OpenCode** - Show how to load the skill (even if simple)
5. **Add a second skill** - Show composition
6. **See the graph** - `mdz graph --mermaid` visualization

### Quick Wins

1. **Rewrite homepage headline** (1 hour)
   - "Validate your LLM agent skills before runtime"
   
2. **Add "who is this for"** (10 min)
   - "For developers building LLM-powered tools and multi-agent systems"

3. **Replace greeting example with code-review** (1 hour)
   - Make first experience connect to real work

4. **Add playground export** (2 hours)
   - Download as .mdz file
   - Copy full source

5. **Fix homepage CLI command** (5 min)
   - Change `mdz build` to `mdz compile`

6. **Reduce syntax cards from 6 to 3** (30 min)
   - Types, References, Control Flow

## Evaluation

### Current State Assessment

**3-second test: FAIL**
- Headline too abstract
- Benefit unclear

**30-second test: PARTIAL**
- Features section decent
- Too many concepts

**30-minute test: INCOMPLETE**
- Getting started works but ends early
- No path to actual use

### Top 3 Improvements

1. **Rewrite opening copy** - Lead with concrete benefit, not poetic abstraction
2. **Add real-world example** - Code review or similar, not greeting
3. **Add "Using MDZ in your project" guide** - Bridge from toy example to real use

### The Core Gap

MDZ documentation explains what it IS well. It does not explain what to DO with it.

Users understand:
- ✅ What MDZ syntax looks like
- ✅ What validation catches
- ✅ How the playground works

Users don't know:
- ❌ How to use MDZ with their agent framework
- ❌ What a real MDZ workflow looks like
- ❌ Why they should switch from raw prompts

### Success Metric

A user should be able to:
1. Understand the proposition in 3 seconds
2. Understand the tech in 30 seconds
3. Have a validated skill for a real use case in 30 minutes
4. Know how to use it in their next project

Currently: Steps 1-2 are weak, step 3 uses toy examples, step 4 is missing.
