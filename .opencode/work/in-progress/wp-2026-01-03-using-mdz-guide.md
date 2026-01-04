# "Using MDZ in Your Project" Guide

## Goal/Problem

Documentation explains what MDZ IS but not what to DO with it. No bridge from toy example to real use.

**Reference:** See findings in `.opencode/work/completed/wp-2026-01-03-onboarding-ux-audit.md`

## Scope

- New docs page: `website/src/pages/docs/using-in-project.astro`
- Or extend getting-started

## Approach

1. Define the workflow: write skill → validate → use with agent
2. Show directory structure for skill library
3. Show integration with common tools (Claude, OpenCode, etc.)
4. Provide copy-paste starting point

## Hypothesis

A practical "now use it" guide bridges the gap from playground to adoption.

## Results

Created comprehensive "Using MDZ in Your Project" guide at `website/src/pages/docs/using-in-project.astro` covering:

- **Workflow Overview**: 3-step process (write → validate → integrate)
- **Project Structure**: Recommended skills/ directory organization with core/domain/orchestration subfolders
- **Integration Examples**: 
  - Claude Desktop (copy-paste workflow sections)
  - OpenCode agents (skill loading and referencing)
  - Custom frameworks (programmatic parsing)
- **Copy-Paste Template**: Complete task-processor skill starter
- **Best Practices**: Validation, composition, testing recommendations

Updated DocsLayout.astro navigation to include the new "Using in Project" page in Getting Started section.

## Evaluation

Yes, the guide successfully bridges the gap from playground examples to real project adoption. It provides:

- Concrete directory structure and file organization
- Multiple integration patterns for different tools/platforms
- Working code examples for programmatic usage
- A complete, validated starting skill template
- Clear next steps and best practices

Users can follow the guide to set up MDZ skills in their projects and integrate them with various agent frameworks or LLM workflows.
