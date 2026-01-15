# Composition

Skills in MDZ compose through links and delegation, enabling complex behaviors from simple, validated components.

## Links

Links reference other files using path syntax:

<!-- mdz-snippet: docs/snippets/composition/link-examples.mdz -->

In prose:

<!-- mdz-snippet: docs/snippets/composition/link-in-prose.mdz -->

Tooling validates that linked files exist. You won't discover a missing dependency at runtime.

## Anchor References

### Within Current Skill

Use `#` to reference a section in the current document:

<!-- mdz-snippet: docs/snippets/composition/anchor-current.mdz -->

### In Another Skill

Combine links and anchors:

<!-- mdz-snippet: docs/snippets/composition/anchor-external.mdz -->

### Section Names

Section names are derived from headings by:

1. Converting to lowercase
2. Replacing spaces with hyphens
3. Removing special characters

<!-- mdz-snippet: docs/snippets/composition/section-anchors.mdz -->

## Skill Invocation with USE

Invoke a skill to perform a task using the **USE** keyword:

<!-- mdz-snippet: docs/snippets/composition/use.mdz -->

Tooling validates that the linked skill exists.

### Passing Templates with WITH

Pass a section template when invoking a skill:

<!-- mdz-snippet: docs/snippets/composition/with-clause.mdz -->

The WITH clause passes an anchor to the invoked skill as a template parameter.

## Folder Conventions

MDZ uses folder conventions to determine reference types:

- `agent/` -- Agents for delegation (autonomous subagents)
- `skill/` -- Reusable skill modules
- `tool/` -- External tool integrations

This replaces the old sigil-based syntax. The type is now inferred from the path.

### Benefits

- Dependency graph visualization
- Circular dependency detection
- IDE autocomplete for available files
- Clear file organization

## Agent Delegation with DELEGATE

For orchestrating autonomous subagents, use the **DELEGATE** keyword with an agent link:

<!-- mdz-snippet: docs/snippets/composition/delegate.mdz -->

## Tool Execution with EXECUTE

For executing external tools, use the **EXECUTE** keyword:

<!-- mdz-snippet: docs/snippets/composition/execute.mdz -->

## GOTO for Section Navigation

Jump to a section anchor using **GOTO**:

<!-- mdz-snippet: docs/snippets/composition/goto.mdz -->

## Keyword Summary

- **USE** -- Invoke skills for reusable workflows
- **EXECUTE** -- Run tools for external actions
- **DELEGATE** -- Spawn autonomous agents
- **GOTO** -- Jump to section anchors
- **WITH** -- Pass template sections

## Patterns

### Sub-Agent Delegation

<!-- mdz-snippet: docs/snippets/composition/pattern-delegate.mdz -->

### Conditional Execution

<!-- mdz-snippet: docs/snippets/composition/pattern-conditional.mdz -->

### Iterative Composition

<!-- mdz-snippet: docs/snippets/composition/pattern-iterative.mdz -->

## Link Handling

By default, links stay as-is--the LLM interprets `~/skill/name` syntax directly. With optional preprocessing:

- **Inlining** -- Referenced skill content embedded inline
- **Section extraction** -- Only the referenced section included

Both approaches are valid. Inlining reduces LLM load-time; leaving links keeps the prompt concise. Experiment to find what works best for your use case.

## Best Practices

- Use consistent folder organization (`agent/`, `skill/`, `tool/`)
- Create reusable prompt sections within skills
- Use descriptive section names
- Keep skills focused and composable
- Document expected parameters in Input sections
