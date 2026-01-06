---
size: md
category: tooling
priority: p1
depends: wp-p1-benchmark-observability
blocks: wp-p1-benchmark-suite-master
---

# Benchmark Setup - Folder Structure & Real LLM Test

## Goal/Problem

Set up the benchmark infrastructure and validate the observability harness works with real LLMs. This bridges the gap between the mock-tested harness and actual benchmark runs.

## Scope

### In Scope

1. **Benchmark folder structure**
   ```
   benchmark/
   ├── cases/
   │   ├── unit/           # Synthetic tests for MDZ constructs
   │   └── e2e/            # Full skill tests
   ├── results/            # JSONL traces and summaries
   ├── scripts/
   │   ├── run.ts          # Run benchmarks
   │   └── report.ts       # Generate reports from traces
   └── README.md           # How to run benchmarks
   ```

2. **Real LLM integration test**
   - Script that runs a simple MDZ skill against Claude
   - Validates trace capture works end-to-end
   - Proves the harness works beyond mocks

3. **First benchmark case**
   - Simple unit test: FOR EACH with tool calls
   - Expected behavior documented
   - Baseline trace captured

4. **Environment setup**
   - Document required env vars (ANTHROPIC_API_KEY, etc.)
   - Add to .env.example if needed

### Out of Scope

- Full unit test suite (separate WP)
- Full e2e test suite (separate WP)
- NL expansion pipeline (separate WP)
- Multi-model comparison (separate WP)
- Results aggregation/visualization (separate WP)

## Approach

1. Create folder structure
2. Write a minimal `run.ts` that:
   - Loads a benchmark case (MDZ skill + expected behavior)
   - Runs via observability harness with real Claude
   - Saves trace to results/
3. Create first benchmark case testing FOR EACH
4. Run and capture baseline

## Hypothesis

The observability harness will work correctly with real LLM calls, producing traces that capture tool call sequences, timing, and token usage accurately.

## Results

{To be filled out upon completion}

## Evaluation

{Did the real LLM test succeed? Are traces capturing what we need?}
