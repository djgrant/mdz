# Document MDZ Design Patterns

## Goal

Capture the emerging design patterns and idioms for authoring MDZ skills, based on the conventions observed in `examples/`. These patterns should inform the language spec, documentation, and future skill authors.

## Scope

- `examples/` directory
- `spec/language-spec.md`
- `website/` documentation (if patterns warrant public docs)

## Patterns to Document

### Syntax Conventions

- [ ] **DELEGATE WITH syntax**: `DELEGATE /task/ TO ~/agent/x WITH:` (colon after WITH)
- [ ] **Semantic type definitions**: `$Type: /natural language description/` using slashes
- [ ] **Template strings**: backticks with `{expression}` interpolation (e.g., `.opencode/{slug($name)}.md`)
- [ ] **Code block outputs**: Wrap expected output formats in fenced code blocks

### Structural Patterns

- [ ] **Comment-style phase markers**: Use `<!-- Phase Name -->` instead of bold headers within workflows
- [ ] **Consolidated conditionals**: `IF /a/ OR /b/ THEN:` over separate IF blocks
- [ ] **Flat control flow**: Avoid numbered lists wrapping control structures
- [ ] **Consistent indentation**: 2-space indent per nesting level

### Workflow Idioms

- [ ] **PARALLEL FOR EACH**: Fan-out pattern for independent work
- [ ] **Collect results**: `Collect results into $variable` after parallel blocks
- [ ] **Gate patterns**: Named sections with `GOTO #section` for validation loops
- [ ] **Read-then-assess**: `Read $path and assess:` for file-based synthesis

### Anti-Patterns (to avoid)

- [ ] Excessive abstraction in examples (orchestrator-of-orchestrators)
- [ ] Overly generic skills that don't demonstrate concrete behavior
- [ ] Prose descriptions where structured output would be clearer

## Approach

1. Review current examples for consistent patterns
2. Extract patterns into a reference document
3. Update language spec if patterns reveal missing grammar
4. Add examples to website playground

## Status

Draft - patterns being collected as examples evolve

## Notes

This emerged from reviewing changes to `examples/` that:
- Removed 10 complex orchestration skills
- Standardized syntax across remaining skills
- Simplified control flow and output formatting
