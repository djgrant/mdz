# Add PR Reviewer to Examples Page

## Goal/Problem

New `examples/pr-reviewer.mdz` created but not surfaced on website.

**Reference:** See `.opencode/work/completed/wp-2026-01-03-real-world-example.md`

## Scope

- `website/src/pages/examples/index.astro`
- Link to new example

## Approach

1. Add PR Reviewer to examples listing
2. Write brief description of what it demonstrates
3. Consider making it the featured example (most relatable)

## Hypothesis

A relatable example improves "I could use this" perception.

## Results

PR Reviewer example added to website/src/pages/examples/index.astro as the first example. Includes description highlighting automated PR review workflow demonstrating type definitions, FOR EACH iteration, and nested conditionals. Tagged with "workflow" and "iteration".

## Evaluation

Yes, PR Reviewer resonates more than others as it demonstrates a practical, relatable workflow that developers encounter daily in code review processes, versus more abstract examples like The Scientist.
