# MDZ Benchmark Suite

Benchmark infrastructure for testing MDZ skill execution across different LLMs.

## Setup

```bash
# Install dependencies
pnpm install

# Set API key
export ANTHROPIC_API_KEY=your-key-here
```

## Running Benchmarks

```bash
# Run a specific test case
pnpm exec tsx benchmark/scripts/run.ts <case-path> <test-name>

# Example
pnpm exec tsx benchmark/scripts/run.ts cases/unit/for-each-basic simple
```

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

## Input Format

```json
{
  "prompt": "The user message to send",
  "initialFiles": {
    "/path/to/file.ts": "file contents"
  },
  "model": "claude-sonnet-4-20250514",
  "maxSteps": 15
}
```

## Expected Format

```json
{
  "description": "What this test validates",
  "toolCalls": {
    "read_file": {
      "minCount": 3,
      "expectedArgs": [{ "path": "/src/a.ts" }]
    }
  },
  "success": true
}
```

## Results

Traces are saved to `benchmark/results/` as JSONL files with timestamps.

Each trace contains:
- `session_start` / `session_end` events
- `tool_call` / `tool_result` events for each tool invocation
- `llm_request` / `llm_response` events
- Token usage and timing information
