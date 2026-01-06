---
size: xl
category: tooling
priority: p1
---

# Benchmark Suite - Master Work Package

## Goal/Problem

Create a comprehensive benchmark suite that demonstrates MDZ's effect on model performance across different LLMs. Results will be summarized on the landing page to validate MDZ's core claims.

## Core Claims to Validate

1. **"Less prompt is better"** - Compact MDZ syntax performs as well or better than verbose natural language
2. **"LLM as runtime"** - LLMs reliably interpret and execute MDZ control flow constructs
3. **Cross-model validity** - MDZ works across frontier, mid-tier, and open-source models

## Architecture

### Observation Model

Pure observation - we don't instrument skills, we watch what happens:

- **Observable**: Tool calls (sequence, arguments, frequency), skill loads, file operations, final artifacts
- **Not observable**: Internal reasoning, "understanding" vs "luck", why a branch was taken

We make no demands on the model beyond "execute this skill."

### Test Categories

**Unit Tests** (synthetic, isolated constructs):
- Test specific MDZ constructs in isolation
- Observe execution path via tool calls
- Purpose: Discover WHERE failures happen

**E2E Tests** (realistic skills):
- Run complete skills from simple to complex
- Observe final state/artifacts only
- Purpose: Real-world performance benchmarking

### Comparison Methodology

**Head-to-head MDZ vs Natural Language:**
1. Take MDZ skill
2. Use frontier model to expand to "equivalent" natural language
3. Run both through same test harness
4. Compare: accuracy, token usage, tool call patterns

Same measurements for both - just compare performance.

### Models to Test

- **Frontier**: Current SOTA from Anthropic, OpenAI, Google
- **Mid-tier**: Smaller/faster variants (Haiku-class, mini-class)
- **Open-source**: Llama, Mistral, Qwen (latest capable versions)

### Metrics (Separate Dimensions)

1. **Task Accuracy**: Did it complete the task correctly?
2. **Control Flow Fidelity**: Did it follow FOR EACH/WHILE/IF exactly?
3. **Token Efficiency**: Input/output tokens used
4. **Semantic Interpretation**: Did it reasonably interpret `/markers/`?

### Test Skill Complexity Range

- **Simple**: Single loop, single conditional, single skill reference
- **Medium**: Nested control flow, multiple skill references, WITH clauses
- **Complex**: Full skills like `the-scientist.mdz`, `skill-composer.mdz`

## Scope

### Dependencies

- **wp-p1-benchmark-observability** (must complete first)

### Sub-Work Packages (to be created after observability)

1. Unit Test Suite
2. E2E Test Suite
3. NL Expansion Pipeline
4. Benchmark Runner
5. Results Aggregation
6. Landing Page Integration

## Hypothesis

MDZ will demonstrate:
- Equal or better accuracy than natural language equivalents
- 2-3x token efficiency
- Consistent control flow execution (>90%) on frontier models
- Graceful degradation on smaller models (identify capability threshold)

## Future Considerations (Not in Scope)

- Temperature variation testing
- Prompt-to-MDZ conversion benchmarks
- Real-time/live benchmarking

## Results

{To be filled out as sub-packages complete}

## Evaluation

{Final assessment when suite is complete}
