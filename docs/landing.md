# Landing Page Content

A language for the world's most powerful runtime.

MDZ is a superset of markdown designed around LLMs' inherent ability to evaluate programs. Declare interfaces, control flow and composition using a structured format that tools can analyze, and LLMs can execute directly.

- [Get Started](/docs/getting-started)
- [Try Playground](/playground)

## Hero Code Example

<!-- mdz-snippet: docs/snippets/landing/hero-example.mdz -->

## Key Ideas

### Write in Structured Language

Express complex agent behaviors in a structured format that can be reasoned about, tested, and predicted.

### LLM Executes Directly

MDZ is designed to be understood, not compiled. The LLM just reads your program, understands the intent, and executes it.

### Tooling Catches Errors

Static analysis validates references, types, and dependencies before runtime - catching structural issues before the LLM sees them.

### Compose Complex Systems

Reference and invoke other skills with type-safe interfaces. Build multi-agent workflows with clear, composable modules.

## A Little Less Conversation

LLMs are powerful interpreters (albeit ones unable to produce errors). MDZ treats LLMs as the runtime they are, and provides structure for you to build sound programs.

- **You write**: Markdown with typed variables, references, and control flow
- **Tooling validates**: Static analysis catches broken refs, type errors, and cycles
- **LLM executes**: The LLM reads and runs your skill directly - no transformation

## Syntax at a Glance

MDZ extends markdown. Every construct is a signal to both an ecosystem of tools, and to the LLM.

### Types

Contracts for tooling to check.

<!-- mdz-snippet: docs/snippets/landing/types.mdz -->

### Variables

Named values with type annotations.

<!-- mdz-snippet: docs/snippets/landing/variables.mdz -->

### Links

Dependencies the tooling validates.

<!-- mdz-snippet: docs/snippets/landing/links.mdz -->

### Semantic Markers

LLM determines from context.

<!-- mdz-snippet: docs/snippets/landing/semantic-markers.mdz -->

### Control Flow

The LLM executes at runtime.

<!-- mdz-snippet: docs/snippets/landing/control-flow.mdz -->

### Composition

Skills and agent delegation.

<!-- mdz-snippet: docs/snippets/landing/composition.mdz -->

## Quick Start

```
# Install
npm install zenmarkdown

# Validate a skill
mdz check skill.mdz

# Compile (validation + output)
mdz compile skill.mdz -o ./dist
```

- [Read the docs](/docs)
- [Browse examples](/examples)
