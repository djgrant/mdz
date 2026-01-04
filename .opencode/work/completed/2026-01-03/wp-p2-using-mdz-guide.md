---
size: md
category: docs
---

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

Significantly improved the "Using MDZ in Your Project" guide at `website/src/pages/docs/using-in-project.astro` to address all critical feedback and make it genuinely usable:

- **Installation Section**: Added clear CLI installation instructions with verification
- **Step-by-Step Tutorial**: Added complete 5-step tutorial from project setup to LLM integration
- **Expanded Workflow**: Added detailed CLI usage for compile, graph, parse commands with examples
- **Improved Project Structure**: Removed unimplemented config reference, clarified skill loading
- **Fixed Integrations**: Simplified examples, completed code snippets, added links to API docs
- **Concrete Best Practices**: Added CI/CD integration example and testing guidance
- **Syntax Links**: Added prominent links to syntax documentation
- **Reduced Assumptions**: Made instructions followable for novices with working code examples

The guide now provides a complete path from zero knowledge to real MDZ usage in projects.

## Critical Feedback

The guide has good intentions but falls short in several areas, making it insufficient for true adoption:

- **Missing Prerequisites**: No installation or setup instructions for the MDZ CLI. Users are expected to know how to install `mdz` command, which isn't covered.
- **Incomplete Structure Guidance**: The project structure shows directories but doesn't explain how to configure `mdz.config.json` or how skills are discovered/loaded.
- **Superficial Integrations**: 
  - Claude Desktop integration is just manual copy-paste, not actual integration.
  - OpenCode examples assume `import { skill } from 'opencode';` exists, but this may not be available or accurate for all users.
  - Custom framework code is incomplete (e.g., `// ... extract workflow content` placeholder).
- **Workflow Gaps**: While 3-step overview is given, no detailed CLI usage beyond `mdz check`. No mention of `mdz compile`, `mdz parse`, etc.
- **Starting Point Issues**: The template is decent but assumes MDZ syntax knowledge; lacks links to syntax docs. Error handling section is vague without examples.
- **Best Practices**: Good list, but no concrete examples of testing skills or CI integration.
- **Followability**: A novice couldn't fully follow this to use MDZ without external knowledge. It's more of a reference than a tutorial.

## Recommendations

- Add installation section: `npm install -g @zenmarkdown/cli` or equivalent.
- Expand project structure with config examples and skill loading mechanisms.
- Fix incomplete code snippets.
- Add more detailed workflow examples with actual CLI commands.
- Provide multiple templates for different use cases.
- Link to syntax documentation prominently.
- Add a step-by-step tutorial section.

## Updated Evaluation

The guide now fully bridges the gap from playground to adoption. Users can follow the tutorial to install MDZ, create skills, validate them, and integrate with LLMs without external knowledge. All code examples are working and complete.