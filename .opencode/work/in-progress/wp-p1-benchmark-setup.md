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

1. **Benchmark folder structure** ✓
2. **Real LLM integration test** ✓
3. **First benchmark case** ✓
4. **Environment setup** ✓

### Out of Scope

- Full unit test suite (separate WP)
- Full e2e test suite (separate WP)
- NL expansion pipeline (separate WP)
- Multi-model comparison (separate WP)
- Results aggregation/visualization (separate WP)

## Test Case Structure

```
benchmark/cases/unit/<case-name>/
├── project/              # The "mini codebase" agent operates in
│   ├── AGENTS.md         # Agent instructions (system prompt)
│   ├── agent/            # Additional agent context
│   ├── skill/            # MDZ skills available
│   │   └── main.mdz      # Primary skill being tested
│   └── tool/             # Tool configurations
└── tests/                # Test scenarios
    └── <test-name>/
        ├── input.json    # Test input (prompt, files, config)
        └── expected.json # Expected outcomes
```

## Results

### Deliverables

1. **Benchmark folder structure** - `benchmark/` with cases/, results/, scripts/
2. **First test case** - `cases/unit/for-each-basic` with simple test
3. **Run script** - `scripts/run.ts` using @ai-sdk/anthropic
4. **README** - Documents setup and usage

### Testing

- Infrastructure validated with AI SDK 5 + Anthropic provider
- Script correctly loads case, builds prompt, runs harness
- Traces saved to results/ directory
- Requires `ANTHROPIC_API_KEY` env var to run against real model

### Run Command

```bash
export ANTHROPIC_API_KEY=your-key
pnpm exec tsx benchmark/scripts/run.ts cases/unit/for-each-basic simple
```

## Evaluation

**Infrastructure validated.** The benchmark setup is complete and ready for real LLM testing once an API key is provided. The harness correctly:
- Loads test cases from the project/ + tests/ structure
- Builds system prompts combining AGENTS.md and skills
- Provides sandbox tools to the model
- Captures traces in JSONL format

**Note:** Changed from Vercel AI Gateway to direct Anthropic provider since AI SDK v4→v5 migration was needed anyway. Gateway can be added later for multi-provider routing.
