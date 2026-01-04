# Observability/Replay Tool - Scoping

## Goal/Problem

We want a demo on the website where users can replay the test suite execution without costing LLM tokens. This means:
- Capturing execution traces
- Replaying them visually
- Showing how LLM interpreted the MDZ program

**This is a SCOPING exercise, not implementation.**

## Scope

- Research only
- Output: Requirements doc and recommended approach

## Approach

1. What data do we need to capture during execution?
   - Input MDZ source
   - LLM prompts sent
   - LLM responses received
   - Control flow decisions made
   - Variables/state at each step

2. What's the replay experience?
   - Step-through debugger style?
   - Timeline visualization?
   - Diff view (expected vs actual)?

3. How do we integrate with existing test suite?
   - Hook into evalite/vitest?
   - Custom test runner with capture?

4. Website integration
   - Pre-recorded traces shipped as JSON?
   - Interactive player component?

## Hypothesis

A replay tool would be compelling for demonstrating MDZ's value without live LLM costs, and could double as a debugging tool.

## Results

### 1. Execution Trace Data Model

**Trace Structure:**
```typescript
interface ExecutionTrace {
  id: string;
  skill: string;                    // Skill name from frontmatter
  source: string;                   // Original MDZ source
  startTime: number;
  endTime: number;
  input: Record<string, any>;       // Input parameters
  output: any;                      // Final result
  steps: TraceStep[];               // Sequence of execution steps
}

interface TraceStep {
  id: number;
  timestamp: number;
  type: 'section' | 'statement' | 'llm-call' | 'skill-call' | 'control-flow';
  location: { line: number; column: number };
  description: string;              // Human-readable step description
  
  // State at this point
  variables: Record<string, any>;
  
  // Type-specific data
  data: 
    | { kind: 'section'; name: string; }
    | { kind: 'statement'; content: string; }
    | { kind: 'llm-call'; prompt: string; response: string; tokens: number; }
    | { kind: 'skill-call'; skill: string; params: Record<string, any>; result: any; }
    | { kind: 'control-flow'; construct: 'FOR_EACH' | 'WHILE' | 'IF'; 
        condition?: string; branch?: 'then' | 'else'; iteration?: number; };
}
```

**Storage Size Estimates:**
- Simple skill (~50 steps): ~50-100KB JSON
- Complex skill (~500 steps): ~500KB-1MB JSON
- 10 demo traces: ~1-5MB total (acceptable for website)

### 2. Capture Approaches

**Option A: Runtime Instrumentation**
- Wrap LLM runtime with tracing middleware
- Pros: Accurate, real execution data
- Cons: Requires running skills with real LLM (cost)
- Best for: Generating golden traces

**Option B: Parser-Based Simulation**
- Use compiler to analyze skill structure
- Simulate execution without LLM
- Pros: Zero cost, deterministic
- Cons: Can't capture actual LLM behavior
- Best for: Demonstrating structure/flow

**Option C: Hybrid (Recommended)**
- Capture real traces during test runs (Option A)
- Save as golden traces
- Replay uses saved traces (no LLM cost)
- Best of both worlds

### 3. Replay UI Designs

**Design A: Step-Through Debugger**
```
┌─────────────────────────────────────────────────────────┐
│ [Source]                    │ [State]                   │
│                             │                           │
│ ## Workflow                 │ Variables:                │
│                             │   $items: ["a", "b", "c"] │
│ FOR EACH $item IN $items:   │   $item: "a"              │
│ > - Process $item      ◀──  │   $result: null           │
│   - Update status           │                           │
│                             │ ─────────────────         │
│                             │ LLM Response:             │
│                             │ "Processing item a..."    │
├─────────────────────────────┴───────────────────────────┤
│ [◀] [▶] [⏵ Play] Step 3/12          [Timeline ▓▓▓░░░░░] │
└─────────────────────────────────────────────────────────┘
```

**Design B: Timeline View**
```
┌─────────────────────────────────────────────────────────┐
│ Timeline                                                 │
│ ─────────────────────────────────────────────────────── │
│ ●───●───●───●───●───●───●───●───●                       │
│ Setup  Loop1 LLM  Loop2 LLM  Loop3 LLM  Report          │
│              ▲                                          │
│              └── Viewing this step                      │
├─────────────────────────────────────────────────────────┤
│ Step: LLM Call                                          │
│ Prompt: "Process item b with strategy X"                │
│ Response: "Processed b: applied transformation..."      │
│ Duration: 1.2s | Tokens: 245                            │
└─────────────────────────────────────────────────────────┘
```

**Design C: Diff View (For Testing)**
```
┌───────────────────────┬─────────────────────────────────┐
│ Expected              │ Actual                          │
│ (Golden Trace)        │ (Current Run)                   │
├───────────────────────┼─────────────────────────────────┤
│ Step 3: Process item  │ Step 3: Process item            │
│ Response: "Processed" │ Response: "Processed" ✓         │
│                       │                                 │
│ Step 4: Validate      │ Step 4: Validate                │
│ Result: "valid"       │ Result: "invalid" ✗ MISMATCH    │
└───────────────────────┴─────────────────────────────────┘
```

**Recommendation:** Start with Design A (debugger) for demos, add Design C later for testing.

### 4. Integration with Existing Tools

**evalite Integration:**
- evalite already captures traces for debugging
- Hook into `traces` output
- Export to our format

```typescript
// evalite trace hook
evalite("My Skill", {
  data: [...],
  task: async (input) => runSkillWithTracing(skill, input),
  // evalite traces can be extracted
});
```

**Test Runner Integration:**
```typescript
// Generate trace during test
test('my-skill execution', async () => {
  const trace = await runWithTracing(mySkill, { input: 'test' });
  
  // Save golden trace
  await saveGoldenTrace('my-skill', trace);
  
  // Or compare with golden
  expect(trace).toMatchGoldenTrace('my-skill');
});
```

### 5. Website Integration

**Approach: Pre-recorded Traces**

1. **Trace Generation (CI/Build time)**
   - Run test suite with tracing enabled
   - Export traces as JSON files
   - Commit to `website/public/traces/`

2. **Trace Player Component**
   ```typescript
   // Astro/React component
   <TracePlayer 
     trace="/traces/scientific-method.json"
     autoplay={false}
     speed={1}
   />
   ```

3. **Interactive Features**
   - Step forward/backward
   - Click on source to jump to step
   - Expand/collapse LLM responses
   - Speed control (0.5x, 1x, 2x)

**Implementation Estimate:**
- Trace capture middleware: 2-3 days
- Basic player component: 3-4 days
- Website integration: 1-2 days
- Golden trace comparison: 2-3 days
- **Total: ~10-12 days**

### 6. Debugging Use Case

Beyond demos, the trace player serves as a debugger:

**Features for Debugging:**
- Breakpoints (pause at specific steps)
- Variable inspection at each step
- Search within trace
- Export trace for sharing

**Integration with IDE:**
- LSP could support "Debug Skill" command
- Opens trace player in browser
- Requires runtime with tracing enabled

### 7. MVP Scope

**Phase 1: Demo Player (MVP)**
- Simple step-through UI
- Pre-recorded traces only
- No live execution
- 3-5 demo traces

**Phase 2: Test Integration**
- Trace capture during tests
- Golden trace comparison
- evalite integration

**Phase 3: Live Debugging**
- Real-time tracing
- Breakpoints
- Variable watch

### 8. Technical Considerations

**Performance:**
- Traces should lazy-load (fetch steps on demand for large traces)
- Virtualized list for 500+ step traces
- Compressed JSON (gzip) for storage

**Security:**
- Traces may contain sensitive data
- Sanitize before publishing demo traces
- Option to redact specific fields

**Compatibility:**
- Trace format versioning
- Forward compatibility for older traces

## Evaluation

**Key Insights:**
1. A hybrid approach (real traces, replayed later) gives best results
2. evalite already provides tracing infrastructure - can extend rather than rebuild
3. Step-through debugger UI is the most intuitive for demos
4. MVP can be simple: just JSON traces + a player component
5. ~10-12 days for full implementation

**Recommendation:**
1. Start with MVP: pre-recorded traces + simple player
2. Use evalite's trace output as foundation
3. Build reusable TracePlayer component for website
4. Later extend for live debugging

**Feasibility: HIGH**
- Clear technical path
- Reasonable scope
- High value for marketing (demos) and development (debugging)

**Dependencies:**
- Need MDZ runtime that can be traced (doesn't exist yet)
- evalite integration assumes evalite is used for testing
- Website integration straightforward (Astro + React component)
