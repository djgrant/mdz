# Full Documentation Review

## Goal/Problem

Audit how well documentation explains concepts.

**Reference:** ROADMAP.md - Documentation Ideas

## Scope

- All docs pages
- Getting started flow
- API reference

## Approach

1. Read through as a newcomer
2. Note confusion points
3. Check accuracy against implementation
4. Identify missing topics
5. Recommend restructuring if needed

## Hypothesis

Fresh eyes audit will reveal gaps invisible to maintainers.

## Results

### As a Newcomer Reading Experience

Reading the docs as a complete newcomer reveals a solid foundation but several gaps and inconsistencies that hinder understanding.

### Confusion Points

1. **Package Naming Inconsistency**: The project uses "MDZ (Zen Markdown)" in branding but "zenmarkdown" as npm package name. This creates confusion about the project's identity.

2. **Macros and Preprocessing Undefined**: Getting-started mentions "macros ({{IF}} constructs)" and "build-time decisions" but these concepts are never explained. What are macros? How do they differ from runtime control flow?

3. **Runtime Integration Missing**: No guidance on how to actually use MDZ skills with an LLM. How do you pass the validated MDZ to a model? What agent frameworks support MDZ?

4. **LSP Status Misleading**: IDE docs claim LSP is "planned" but the LSP server actually exists and is implemented.

5. **CLI Examples Inconsistent**: Some docs show `mdz build` (non-existent command) instead of `mdz compile`. Graph command documented incorrectly.

6. **API Documentation Errors**: References `validate()` and `build()` functions that don't exist; actual functions are `parse()` and `compile()`.

### Accuracy Check Against Implementation

- **Package Structure**: Installation instructions match actual packages (@zenmarkdown/core, @zenmarkdown/cli, root zenmarkdown).
- **CLI Commands**: Mostly accurate (check, compile, parse, graph) but examples have typos.
- **API**: compile() function behavior matches documentation.
- **Syntax**: Examples in docs match parser implementation.
- **Examples**: Real example files (debugger.mdz, skill-composer.mdz, the-scientist.mdz) demonstrate complex patterns well.

### Missing Topics

1. **Macro System**: No explanation of build-time macros vs runtime control flow (though not yet implemented).
2. **Runtime Integration**: How to use MDZ in practice with LLMs/agent frameworks.
3. **Persistent State**: No documentation of state persistence interface (in design phase).
4. **Troubleshooting**: No guide for common validation errors or debugging skills.
5. **Advanced Patterns**: Limited coverage of real-world composition patterns beyond examples.

### Recommended Restructuring

1. **Consolidate Branding**: Standardize on "MDZ" as primary name, clarify "Zen Markdown" as subtitle.
2. **Add "How It Works" Section**: Before deep syntax dives, explain the validator-first architecture, source=output principle.
3. **Expand Getting Started**: Include basic runtime integration example (e.g., "Here's how you'd use this with OpenAI API").
4. **Create "Using MDZ" Section**: Practical guides for common workflows.
5. **Fix All Inaccuracies**: Update CLI examples, API docs, LSP status.

## Evaluation

Top 5 improvements needed:

1. **Clarify Branding and Naming**: Resolve MDZ vs zenmarkdown vs Zen Markdown inconsistency for clearer project identity.
2. **Explain Macros and Preprocessing**: Add dedicated section explaining build-time macros, even if not yet implemented, to remove confusion from getting-started.
3. **Add Runtime Integration Guide**: Essential missing piece - how newcomers actually use validated MDZ skills with LLMs.
4. **Fix All Documentation Inaccuracies**: Correct CLI command examples, API function names, and LSP status to match implementation.
5. **Create Troubleshooting Guide**: Help users understand and fix common validation errors and integration issues.
