# MDZ Benchmark Suite

Benchmark runner with web UI for testing MDZ skill execution via Vercel AI Gateway.

## Setup

```bash
cd benchmark
bun install

# Set Vercel AI Gateway API key
export AI_GATEWAY_API_KEY=your-key-here
```

## Running

### Web UI

```bash
bun dev
# Open http://localhost:4321
```

### CLI

```bash
bun run scripts/run.ts cases/unit/for-each-basic simple
```

## Models

Uses Vercel AI Gateway with format `provider/model-name`:
- `anthropic/claude-sonnet-4-20250514` (default)
- `openai/gpt-4o`
- `google/gemini-2.0-flash`

## Test Case Structure

```
cases/unit/<case-name>/
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
  "model": "anthropic/claude-sonnet-4-20250514",
  "maxSteps": 15
}
```

## Output

Results are saved to `results/` as JSON files including:
- Tool calls with arguments and results
- Token usage (input, output, total)
- Cost (if available from gateway)
- Duration
- Final response
