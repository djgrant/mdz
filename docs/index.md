# Documentation

MDZ is a markdown extension for multi-agent systems--designed to be readable as prose, validated by tooling, and executed by LLMs.

## What is MDZ?

MDZ extends standard markdown with signals for expressing agent behaviors, skill composition, and orchestration patterns. An MDZ document (with `.mdz` extension) is both valid markdown and a format that tooling can validate.

The LLM sees what you write. There's no hidden transformation--the source format is the execution format. Tooling exists to catch errors before runtime, not to compile into something else.

## Key Features

- **Types** -- Contracts that tooling validates across module boundaries
- **Variables** -- Named values with type annotations for checking
- **References** -- Wiki-style links that tooling validates exist
- **Semantic Markers** -- Points where the LLM determines values from context
- **Control Flow** -- CAPS keywords the LLM executes at runtime
- **Composition** -- Skill delegation with validated parameters
- **Higher-Order Skills** -- Skills that orchestrate other skills for complex workflows

## The Validation Layer

Like a type checker for programming languages, MDZ tooling validates that modules fit together correctly:

- **Links exist** -- `~/skill/name` and `~/agent/name` targets must exist
- **Anchors exist** -- `#section` targets must be defined
- **Types match** -- Passing `$Number` where `$Task` is expected gets flagged
- **No cycles** -- Circular dependencies in your dependency graph are detected
- **Syntax is valid** -- Malformed control flow or markers are caught

Without this layer, you'd discover these issues at runtime--with a confused LLM that can't find the skill you referenced or doesn't understand the malformed instruction.

## The Runtime

The LLM is the runtime. It reads your skill, interprets the control flow constructs, makes tool calls, and executes what the document says. MDZ provides the authoring format and validation layer--not the execution engine.

## Getting Started

Ready to dive in? Start with the [Quick Start guide](/docs/getting-started) to install MDZ and write your first skill, or explore [examples](/examples) to see MDZ in action.
