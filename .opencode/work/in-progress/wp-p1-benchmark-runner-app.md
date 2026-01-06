---
size: md
category: tooling
priority: p1
depends: wp-p1-benchmark-setup
---

# Benchmark Runner - Package & Web UI

## Goal/Problem

Make the benchmark runner a proper standalone package with a web UI for running benchmarks, viewing progress, and seeing results including LLM costs.

## Scope

### In Scope

1. **Package setup** (`packages/benchmark/` or dedicated location)
   - Proper package.json with dependencies
   - Uses Bun (no tsx needed)
   - Self-contained with own deps

2. **Cost reporting**
   - Track token usage per call
   - Calculate costs based on model pricing
   - Include in trace and final report

3. **Web UI wrapper**
   - Simple browser interface
   - Select and run benchmark cases
   - Show progress during execution
   - Display results: tool calls, tokens, costs, trace

### Out of Scope

- Complex dashboard/visualization
- Historical result comparison
- CI integration

## Approach

1. Create packages/benchmark with proper structure
2. Add cost calculation based on model/tokens
3. Build minimal web server (Bun + Hono or similar)
4. Create simple HTML/JS UI for running benchmarks

## Results

{To be filled out upon completion}

## Evaluation

{Can we run benchmarks from browser and see costs?}
