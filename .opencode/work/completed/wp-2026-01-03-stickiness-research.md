# Stickiness Research

## Goal/Problem

What workflows make MDZ indispensable? We want users who try it to keep using it, not bounce after initial curiosity.

## Scope

- Research only
- Output: Recommendations for "sticky" use cases and workflows

## Approach

1. What makes dev tools sticky?
   - Solves daily pain point
   - Hard to go back once adopted
   - Integrates into existing workflow
   - Compounds value over time

2. Candidate sticky workflows for MDZ:
   - Agent skills that get reused across projects
   - Team shared skill libraries
   - Skills that improve with iteration (learning)
   - Integration with daily tools (editor, CI, CLI)

3. What would make someone think "I can't work without this"?

4. Anti-patterns to avoid:
   - "Cool demo but when would I use this?"
   - One-time setup, never touch again
   - Requires too much context switching

## Hypothesis

Identifying sticky workflows will inform feature prioritization and marketing messaging.

## Results

### Framework: What Makes Dev Tools Sticky

Analyzed patterns from successful dev tools (TypeScript, Prettier, dbt, Tailwind):

**Stickiness Dimensions:**

1. **Daily repetition** - Used every day, not monthly
2. **Increasing returns** - More valuable the more you use it
3. **Migration cost** - Hard to revert once adopted
4. **Team propagation** - One person adopts, team follows
5. **Workflow integration** - Lives in existing flow, not beside it

### MDZ Stickiness Analysis

**Current State (Honest Assessment):**

MDZ is currently in the "curiosity" phase, not the "dependency" phase. Users might:
- Try the playground (3 min)
- Skim the README (2 min)
- Think "interesting" and move on

**Why?** 
- No clear entry point into daily workflow
- Skills exist in isolation, not connected to how people actually work
- The value of validation isn't felt until you've experienced the pain of runtime errors

### Candidate Sticky Workflows

#### Tier 1: High Potential

**1. IDE-Integrated Skill Authoring**

*Flow:* Write .mdz files in VS Code → get real-time validation → LLM executes directly

*Why sticky:*
- Lives in the editor (daily tool)
- Immediate feedback loop (like TypeScript red squiggles)
- Compounds: more skills = more value from cross-validation

*Current state:* VS Code extension exists but needs LSP for real-time validation

*Gap:* LSP server exists in `src/lsp/server.ts` but not wired to extension

**2. Skill Library for Agentic Coding**

*Flow:* Developer builds personal library of MDZ skills → reuses across projects → skills improve over time

*Why sticky:*
- Portable knowledge (like dotfiles)
- Accumulates value
- Hard to replicate in raw prompts

*Example use cases:*
- Code review skill customized to your style
- PR summary generator for your team's conventions
- Bug triage workflow for your codebase

*Gap:* No skill registry or sharing mechanism

**3. Team Skill Repository**

*Flow:* Team maintains shared .mdz files → CI validates → skills are versioned like code

*Why sticky:*
- Team knowledge captured
- Onboarding accelerated
- Standards enforced through types

*Existing support:* `mdz check` works in CI, dependency graph catches circular refs

*Gap:* No guidance on team workflow, no lock file concept for skill versions

#### Tier 2: Moderate Potential

**4. Prompt-to-MDZ Migration**

*Flow:* Take existing messy prompts → convert to structured MDZ → validate and iterate

*Why sticky:*
- Low barrier (start with what you have)
- Immediate value (validation finds issues)
- Incremental adoption

*Gap:* No tooling for this. Could be a CLI command or playground feature.

**5. Skill Testing Framework**

*Flow:* Write tests for skills → run against mocks → CI gates on test pass

*Why sticky:*
- Standard practice for code, novel for prompts
- Prevents regressions
- Team confidence

*Current state:* Listed in ROADMAP as idea ("Unit testing framework")

*Gap:* Not implemented. Would need mock executor and assertion API.

#### Tier 3: Speculative

**6. Model Comparison Workflow**

*Flow:* Same skill → run on different models → compare outputs

*Why this could stick:*
- Models change frequently
- Teams need to evaluate options
- MDZ provides consistent input

*Gap:* Would need execution layer which is explicitly out of scope

**7. Production Observability**

*Flow:* Skills emit traces → dashboard shows execution paths → debug failures

*Why this could stick:*
- Essential for production agents
- Creates dependency on format

*Gap:* Heavy lift, may be runtime concern not MDZ concern

### Anti-Patterns Identified

**1. "Tutorial complete, now what?"**

*Problem:* Getting started guide ends with a toy example. No bridge to real work.

*Solution:* End tutorials with "Now try this with your own X" prompts, linking to real use cases.

**2. "Island tool"**

*Problem:* MDZ exists beside the workflow, not in it. User must context-switch.

*Solution:* Prioritize IDE integration. Files should just work in editor with validation.

**3. "Single skill ceiling"**

*Problem:* Value plateaus with one skill. No reason to write more.

*Solution:* Emphasize composition. Show skills calling skills. Dependency graph makes this visible.

**4. "Works locally, fails in team"**

*Problem:* No team sharing patterns. Skills don't travel well.

*Solution:* Document team workflow. Add lock file or registry concept.

### Recommendations

**Prioritized for Stickiness:**

1. **Complete LSP integration** (Tier 1, High Impact)
   - Wire `src/lsp/server.ts` to VS Code extension
   - Enable real-time validation in editor
   - This is the #1 stickiness lever

2. **Document the "skill library" pattern** (Tier 1, Low Cost)
   - Create example of personal skill library
   - Show how to organize, version, and reuse
   - Add to website as use case

3. **Build prompt-to-MDZ helper** (Tier 2, Medium Impact)
   - CLI command: `mdz convert prompt.txt`
   - Playground mode: paste prompt, get MDZ
   - Lowers barrier to migration

4. **Write three relatable example skills** (Tier 1, Medium Cost)
   - Code review (for PRs)
   - Bug triage (for issues)
   - Documentation updater (for code changes)
   These should be skills people can actually use, not meta examples.

**Messaging Implications:**

Don't lead with "language" - leads to "do I need to learn this?"
Lead with "workflow" - "Here's how to X with MDZ"

Specific workflow hooks:
- "Validate your agent skills before they run confused"
- "Build a personal library of tested, reusable skills"
- "Type-check your prompts like you type-check your code"

## Evaluation

### Key Insight

**Stickiness comes from the IDE, not the playground.**

The playground is great for discovery (3-second value prop). But stickiness requires:
- Daily presence in the editor
- Immediate feedback while authoring
- Growing library of personal/team skills

### Priority Stack for Stickiness

1. LSP-powered VS Code validation (unlocks daily use)
2. Relatable example skills (demonstrates value)
3. Skill library documentation (patterns for adoption)
4. Prompt-to-MDZ converter (lowers barrier)

### Open Questions

- Should there be a registry for sharing skills? (Community stickiness)
- How do skills version across projects? (Lock file needed?)
- What's the team onboarding flow? (Documented workflow needed)
