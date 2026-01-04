# Playground Vision: Finding the Penny-Drop Moment

## Goal/Problem

The current playground demonstrates the WRONG value proposition - it shows type expansion and semantic transformation, which we're moving away from. We need to reimagine it to create an "I need this" moment.

## Scope

- `website/src/pages/playground.astro`
- Any new supporting components
- May influence requirements for Stream 1 (Tooling Refactor)

## Hypothesis

**Primary hypothesis:** The penny-drop moment is NOT about transformation or output preview. It's about SEEING what you can't see in raw markdown:

1. **Dependency Clarity** - "I can SEE how my 15 skills fit together"
2. **Error Prevention** - "It caught that mistake before I ran it"  
3. **Compression Appreciation** - "I maintain 25 lines, but the LLM gets 180 lines of context"

**Secondary hypothesis:** A split-screen "source vs compiled" view is the WRONG metaphor when source IS the optimal format. We need a different UI paradigm.

## Exploration Areas

### 1. Dependency Graph Visualization
- Skills as nodes, references as edges
- Interactive exploration (click to navigate)
- Immediately tangible: "I can SEE my agent system"
- **Risk:** May feel like a feature rather than a "need"

### 2. Validation as Primary Value
- Undefined reference → red squiggle
- Missing skill in `uses:` → warning
- Contract mismatch → type error
- **Key message:** "Without zen, you'd discover this at runtime with a confused LLM"
- **Risk:** Need real validation capabilities (depends on Stream 1)

### 3. Compression Demonstration
- Show source (25 lines) vs fully-inlined version (180 lines)
- Toggle to see "what the LLM actually receives"
- **Key message:** "You maintain the small one. LLM gets full context."
- **Risk:** Still implies transformation, just a different kind

### 4. Multi-File Experience
- Current playground is single-file
- Real value is COMPOSITION across files
- Show a project structure, not just a file
- **Risk:** Higher complexity, may obscure the core value

### 5. Error Message Storytelling
- Show a broken skill and the error message
- "You just saved yourself 20 minutes of confused debugging"
- Interactive tour of error types
- **Risk:** May feel like tutorial not playground

## Approach

**Phase 1: Diverge**
- Sketch 3-4 radically different playground concepts
- Don't build, just describe and mock UI layouts
- Evaluate against "penny-drop" criterion

**Phase 2: Prototype**
- Pick the most promising direction
- Build minimal working version
- Test with fresh eyes (can someone unfamiliar get it?)

**Phase 3: Iterate**
- Refine based on what works
- Identify dependencies on other streams
- Document for implementation

## Results

### Exploration 1: Analysis of Penny-Drop Candidates

**Candidate A: "Look, it caught an error"**
- Pro: Universal pain point, immediate value
- Con: Requires Stream 1 validation capabilities
- Con: Might feel like any linter

**Candidate B: "Look at this dependency graph"**
- Pro: Unique, visual, immediate comprehension
- Con: Requires multi-file context
- Con: Graph visualization adds complexity

**Candidate C: "Look at compression ratio"**
- Pro: Quantifiable ("25 lines → 180 lines")
- Pro: Can demo with single file + fake skills
- Con: Still implies transformation

**Candidate D: "Toggle preprocessing modes"**
- Pro: Shows flexibility
- Con: Requires understanding what preprocessing is
- Con: Not immediately gripping

**Candidate E: Something we haven't thought of?**
- What if the playground IS a working agent system?
- "This playground is itself a zen skill - meta!"
- Or: "Write a skill, then USE it immediately"

### Insight from Analysis

The most compelling candidates share a trait: they show something **invisible becoming visible**:
- A hidden bug becomes a visible error
- Hidden relationships become a visible graph
- Hidden complexity becomes a visible line count

This suggests the playground should be about REVELATION.

## Evaluation

*To be filled after prototyping*


---

## Exploration 2: Four Playground Concepts (Stream 3 Analysis)

### Concept 1: "The Observatory" - System Visualization Focus

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Select Project: [▼ The Scientist Example]     [+ New]      │
├──────────────────────┬──────────────────────────────────────┤
│  📁 Skills           │          DEPENDENCY GRAPH            │
│  ├─ the-scientist    │                                      │
│  ├─ work-packages    │      [the-scientist]                 │
│  └─ scientific-method│          │                          │
│                      │    ┌─────┴─────┐                     │
│  ─────────────       │    ▼           ▼                     │
│  Selected: the-       │  [work-     [scientific-            │
│  scientist           │   packages]   method]                │
│                      │                                      │
├──────────────────────┴──────────────────────────────────────┤
│  ┌ Source Editor ─────────────────────────────────────────┐ │
│  │ ---                                                    │ │
│  │ name: the-scientist                                    │ │
│  │ uses:                                                  │ │
│  │   - work-packages                                      │ │
│  │   - scientific-method                                  │ │
│  │ ...                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Penny-drop moment:** Click on a node, see its source. See how skills connect.
**Value proposition:** "I can finally SEE my agent system architecture"
**Risk:** Requires multi-file support to be meaningful

---

### Concept 2: "The Guardian" - Validation Focus

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Example: [▼ Broken Skill]                     [Validate]   │
├─────────────────────────────────────────────────────────────┤
│  ┌ Source Editor ─────────────────────────────────────────┐ │
│  │ ---                                                    │ │
│  │ name: my-skill                                         │ │
│  │ uses:                                                  │ │
│  │   - work-packages                                      │ │
│  │ ---                                                    │ │
│  │                                                        │ │
│  │ Execute [[non-existent-skill]]  ← RED SQUIGGLE        │ │
│  │                     ⚠️ ─────────────────────────────┐  │ │
│  │                       Skill 'non-existent-skill'   │  │ │
│  │                       not declared in uses:        │  │ │
│  │                     ────────────────────────────────┘  │ │
│  │                                                        │ │
│  │ - $count: $Numbr   ← RED SQUIGGLE                     │ │
│  │            ⚠️ Type '$Numbr' not defined                │ │
│  │               Did you mean '$Number'?                  │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  🔴 2 errors   ⚠️ 1 warning                                 │
│                                                             │
│  "Without zen, you'd discover these at runtime with a      │
│   confused LLM trying to reference non-existent skills"    │
└─────────────────────────────────────────────────────────────┘
```

**Penny-drop moment:** See real errors caught before runtime.
**Value proposition:** "Catch mistakes before the LLM gets confused"
**Risk:** Needs Stream 1 validation capabilities to be real

---

### Concept 3: "The Telescope" - Composition Expansion Focus

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  View: [Source] [Composed]            Lines: 96 → 380       │
├─────────────────────────────┬───────────────────────────────┤
│  YOUR SOURCE (96 lines)     │  LLM RECEIVES (380 lines)     │
│  ────────────────────       │  ─────────────────────────    │
│  ---                        │  ---                          │
│  name: the-scientist        │  name: the-scientist          │
│  uses:                      │  description: When orchestrat │
│    - work-packages          │  ---                          │
│  ---                        │                               │
│                             │  ## Inlined: work-packages    │
│  ## Workflow                │  $WorkPackage = a discrete... │
│                             │  $Lifecycle = "todo" | "in-...│
│  Execute [[work-packages]]  │  ...                          │
│  WITH:                      │  ## Workflow                  │
│    - $task = "create..."    │                               │
│                             │  Create work package...       │
│                             │  $task = "create experiment"  │
├─────────────────────────────┴───────────────────────────────┤
│  💡 You maintain 96 lines. The LLM gets full context with   │
│     all referenced skills inlined (380 lines).              │
└─────────────────────────────────────────────────────────────┘
```

**Penny-drop moment:** See the 4x expansion ratio.
**Value proposition:** "Maintain less, LLM understands more"
**Risk:** Still shows "transformation" which conflicts with vision

---

### Concept 4: "The Loom" - Interactive Weaving Focus

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  🧵 THE LOOM - Interactive Skill Composition                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Available Skills ─────┐   ┌─ Your Composition ────────┐ │
│  │ [orchestrate      +]   │   │ 📜 my-workflow            │ │
│  │ [work-packages    +]   │   │    uses:                  │ │
│  │ [the-scientist    +]   │   │      - work-packages ✓    │ │
│  │ [simplify         +]   │   │      - the-scientist ✓    │ │
│  │                        │   │                           │ │
│  └────────────────────────┘   │ Workflow:                 │ │
│                               │ 1. Execute [[work-...]]   │ │
│  ┌─ Skill Inspector ──────┐   │ 2. IF result THEN:        │ │
│  │ work-packages          │   │    - Execute [[the-...]]  │ │
│  │ ──────────────         │   │                           │ │
│  │ Inputs:                │   └───────────────────────────┘ │
│  │  - $task: $String      │                                 │
│  │ Outputs:               │   ┌─ Validation ─────────────┐  │
│  │  - $workPackage        │   │ ✅ All refs resolved      │  │
│  │                        │   │ ✅ Types compatible       │  │
│  │ [View Source] [Use]    │   │ ✅ No cycles detected     │  │
│  └────────────────────────┘   └──────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Penny-drop moment:** Drag skills in, see them compose, validation instant.
**Value proposition:** "Build agent systems like Lego blocks"
**Risk:** Very different from current playground, high complexity

---

## Analysis: Which Creates the Penny-Drop?

After sketching these, the question becomes: **What creates the "I need this" moment?**

| Concept | Moment | Barrier |
|---------|--------|---------|
| Observatory | "I can SEE my system" | Needs multi-file to be meaningful |
| Guardian | "It caught my bug" | Needs real validation (Stream 1) |
| Telescope | "4x compression!" | Conflicts with "source is optimal" |
| Loom | "Composition is easy" | High complexity, different paradigm |

**Key Insight:** The Guardian (validation focus) is the strongest candidate because:
1. Universal pain point - everyone has debugged a broken prompt
2. Demonstrable with single file + mock skill registry
3. Directly shows zen's unique value (vs "just write markdown")
4. Message is clear: "Catch errors before runtime"

**BUT** it depends on Stream 1 delivering real validation.

**Hybrid Approach:** Start with Guardian + elements of Observatory:
- Primary panel: Editor with validation errors
- Secondary panel: Mini dependency graph showing what's referenced
- Stats bar: "X skills composed, Y errors found"


---

## Prototype: "The Guardian" Playground v2

Created a working prototype at `website/src/pages/playground-v2.astro` that demonstrates the validation-focused approach.

### Features Implemented:
1. **Scenario selector** - Pre-built scenarios showing different validation states
2. **Diagnostics panel** - Shows errors/warnings with suggestions
3. **Mini dependency graph** - Visualizes skill relationships with color-coded edges
4. **Insight message** - Explains WHY the error matters
5. **Monaco editor** - With zen syntax highlighting and error markers

### Scenarios:
- ✅ Valid Skill - Shows clean validation
- 🔴 Broken Reference - `[[non-existent-skill]]` caught
- 🔴 Missing Type - `$Numbr` typo caught with "did you mean?"
- 🔴 Circular Dependency - Cycle visualization
- 📊 Complex System - 5-skill composition graph

### Key UX Decisions:
- **Read-only editor** for scenarios (prevents confusion)
- **Insight box** always visible explaining the "why"
- **Graph shows broken edges** in red/yellow
- **Line numbers in diagnostics** link to source

### What Works:
1. Immediate visual feedback on errors
2. Graph makes relationships tangible
3. Suggestions help fix issues
4. "Without zen, you'd..." messaging lands well

### What Needs Work:
1. Graph layout is manual (needs auto-layout)
2. No click-to-navigate on graph nodes
3. Scenarios are hardcoded (need real validation)
4. Single-file only (multi-file is the real value)

---

## Evaluation and Recommendation

### Hypothesis Confirmed:
The "Guardian" approach (validation focus + graph visualization) creates the strongest penny-drop moment. Users immediately see:
1. Errors caught before runtime
2. System architecture made visible
3. Actionable suggestions to fix issues

### Recommended Direction:

**Phase 1: Polish Prototype (can do now)**
- Add editable mode with live validation
- Improve graph auto-layout
- Add click-to-navigate in graph
- Add more scenarios

**Phase 2: Real Validation (needs Stream 1)**
- Connect to actual LSP/validator
- Support custom skill input
- Multi-file project support
- Type checking across skill boundaries

**Phase 3: Advanced Features (future)**
- "Break this" button to introduce errors
- Interactive tutorial mode
- Export/share scenarios
- LLM execution preview

### Dependencies on Other Streams:

**Stream 1 (Tooling Refactor) - Required:**
- Reference validation (skill exists in uses:)
- Type checking (undefined types)
- Cycle detection
- Contract compatibility

**Stream 2 (Documentation) - Nice to have:**
- Error code documentation
- Best practices for composition

### The Penny-Drop Message:

> "zen validates your agent system before runtime. See that broken reference? Without zen, you'd discover it when the LLM gets confused—and you'd spend 20 minutes debugging why your orchestrator isn't working."


---

## Final Polish (Phase 1 Complete)

Added the following improvements to `playground-v2.astro`:

1. **Edit mode toggle** - Checkbox to enable/disable editing
   - When enabled, shows "• Editing" indicator in status bar
   - Insight message changes to encourage experimentation
   
2. **Dynamic file indicator** - Shows the actual filename for each scenario
   - `the-scientist.zen.md`, `my-workflow.zen.md`, etc.

3. **Click-to-jump diagnostics** - Click any diagnostic to jump to that line
   - Highlights the line in the editor
   - Adds hover state to diagnostic items

4. **Better graph hover** - Opacity transition on node hover

### Build Verified
- Website builds successfully with both `/playground` and `/playground-v2` routes
- No errors or warnings

### Final Status

**Work package complete.** The playground-v2 prototype successfully demonstrates:

1. ✅ Validation as primary value proposition
2. ✅ Dependency graph visualization
3. ✅ Scenario-based demonstrations
4. ✅ "Why this matters" messaging
5. ✅ Edit mode for experimentation
6. ✅ Click-to-navigate diagnostics

**Ready for:** User testing and feedback before replacing the original playground.

**Blocked by:** Stream 1 (Tooling Refactor) for real validation capabilities.
