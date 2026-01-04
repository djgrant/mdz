---
size: lg
category: tooling
---

# Execution Tracing

## Goal/Problem

Observe how LLM interpreted the program, what paths it took. Generate dump for analysis.

**Reference:** ROADMAP.md - Tooling Ideas

## Scope

- Trace capture mechanism
- Output format
- Analysis tooling

## Approach

1. Define trace schema (inputs, outputs, decisions, state)
2. Integrate with test runner (evalite/vitest)
3. Build trace viewer/analyzer
4. Consider: fork evalite or build on top?

## Hypothesis

Execution traces enable debugging and optimization of skills.

## Results

{To be filled out upon completion}

## Evaluation

{Are traces useful for debugging? Is the overhead acceptable?}
