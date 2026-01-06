---
size: lg
category: tooling
priority: p1
blocks: wp-p1-benchmark-suite-master
---

# Observability - Sandbox & Recording

## Goal/Problem

Build a "mock claude-code/opencode" - a controllable execution environment where we can run MDZ skills, observe what the model does, and record everything. This is foundational infrastructure for:
- Benchmark suite (measuring MDZ effectiveness)
- Future observability layer
- Skill development/debugging

## Core Principle

**Pure observation** - we don't ask the model to emit anything special. We provide tools, record every tool call, and capture final state. The model just executes the skill normally.

## Mental Model

We're building a sandbox that behaves like claude-code/opencode but where:
- We control what tools are available
- Every tool call is recorded
- Tool responses can be mocked or real
- Final state is captured

## Scope

### In Scope

1. **Sandbox Environment**
   - Isolated execution context
   - Mock tools: filesystem, bash, web search, skill loader
   - No real side effects
   - Controllable tool responses

2. **Tool Call Recording**
   - Capture every tool invocation
   - Record: tool name, arguments, timestamp, result
   - Preserve call sequence
   - JSONL trace format (append-only, streamable)

3. **Artifact Capture**
   - Final filesystem state (for mock fs)
   - Files created/modified
   - Content of each file

4. **Execution Harness**
   - Uses Vercel AI SDK
   - Middleware for observation
   - Load and inject MDZ skills as system prompts
   - Provide sandbox tools to model
   - Export structured trace

### Out of Scope (this WP)

- Docker/real-world environment (follow-up WP)
- Trace replay/visualization
- Multi-model runner (AI SDK gives us this for free later)
- NL expansion pipeline
- Metrics calculation
- OpenTelemetry export (can add later)

## Technical Approach

1. **AI SDK Middleware** - wrap model to observe all calls
2. **Mock Tool Definitions** - fs, bash, web_search, skill that record + return canned/computed responses
3. **JSONL Trace Writer** - append events as they happen
4. **Harness API** - `runSkill(skillPath, options) => trace`

## Hypothesis

We can create a test harness that:
- Runs MDZ skills via an LLM
- Observes tool calls including skill loads
- Records execution trace in structured format
- Captures final artifacts
- Measures token usage

## Results

### Package Created: `@mdz/observability`

Location: `packages/observability/`

**Core Components:**

1. **`trace.ts`** - Trace event types and JSONL writer
   - Discriminated union of event types (session_start, session_end, tool_call, tool_result, llm_request, llm_response, error)
   - Zod schemas for validation
   - `TraceWriter` class with file and callback output modes
   - `parseTraceFile`/`parseTraceLines` utilities

2. **`tools.ts`** - Sandbox tools
   - `read_file`, `write_file`, `list_directory` - in-memory filesystem
   - `bash` - simulates common commands (echo, pwd, cat, ls) with custom handler support
   - `web_search` - mock search results with custom handler support
   - `skill` - loads skills from a Map
   - `onCall`/`onResult` callbacks for observation

3. **`harness.ts`** - Execution harness
   - `runSkill()` - main entry point
   - Integrates with Vercel AI SDK `generateText`
   - Wires sandbox tools to trace writer
   - Returns `ExecutionResult` with session ID, token usage, tool call count, duration, final files

**Tests:** 44 tests passing (`tests/observability.test.ts`)

**Example:** `packages/observability/examples/run-skill.ts` demonstrates full workflow

### Trace Format (JSONL)

Each line is a JSON object with:
- `timestamp`: ISO 8601
- `sequence`: monotonic counter
- `type`: event type discriminator
- Event-specific fields

Example trace output:
```jsonl
{"timestamp":"2026-01-06T16:42:32.340Z","sequence":0,"type":"session_start","sessionId":"820d...","model":"mock-reviewer-v1","systemPrompt":"---\nname: pr-reviewer\n..."}
{"timestamp":"2026-01-06T16:42:32.341Z","sequence":1,"type":"llm_request","sessionId":"820d...","messageCount":2,"toolNames":["read_file","write_file","list_directory","bash","web_search","skill"]}
{"timestamp":"2026-01-06T16:42:32.344Z","sequence":2,"type":"tool_call","sessionId":"820d...","toolCallId":"820d...-0","toolName":"list_directory","args":{"path":"/pr"}}
{"timestamp":"2026-01-06T16:42:32.344Z","sequence":3,"type":"tool_result","sessionId":"820d...","toolCallId":"820d...-0","toolName":"list_directory","result":{"entries":["description.md","diff.patch","metadata.json"]},"durationMs":0.047}
...
{"timestamp":"2026-01-06T16:42:32.346Z","sequence":12,"type":"session_end","sessionId":"820d...","durationMs":6.33,"tokenUsage":{"input":1100,"output":270,"total":1370}}
```

### API Usage

```typescript
import { runSkill, createFileOutput } from "@mdz/observability";
import { anthropic } from "@ai-sdk/anthropic";

const result = await runSkill({
  harness: {
    model: anthropic("claude-3-5-sonnet-20241022"),
    traceOutput: createFileOutput("./trace.jsonl"),
  },
  skillContent: "# My Skill\n...",
  prompt: "Do the thing",
  initialFiles: new Map([["/src/index.ts", "const x = 1;"]]),
  maxSteps: 10,
});

console.log(`Tool calls: ${result.toolCallCount}`);
console.log(`Tokens: ${result.tokenUsage.total}`);
console.log(`Files created:`, [...result.finalFiles.keys()]);
```

## Evaluation

**Hypothesis validated:** ✅

We can reliably record what the model does:
- Every tool call is captured with args and result
- Timing information is preserved
- Token usage is tracked
- Sequence ordering is maintained
- Data is structured enough for comparison (discriminated union, Zod validation)

**Ready for benchmark suite:** The harness provides all the observability needed to:
- Compare MDZ vs natural language prompts
- Measure token efficiency
- Analyze tool call patterns
- Verify control flow execution

**Future improvements (not blocking):**
- OpenTelemetry export for integration with Langfuse/Phoenix
- Docker environment for real-world tests
- Streaming observation for long-running skills
