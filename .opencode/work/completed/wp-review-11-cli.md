---
size: sm
category: quality
parent: wp-p1-example-review-master
priority: medium
---

# Review: CLI Docs (cli.astro)

## Goal/Problem

Review and fix all MDZ code examples in the CLI documentation.

## Scope

`website/src/pages/docs/cli.astro`

## Review Checklist

1. **Syntax correctness**
   - No `{~~}` syntax (should be `/content/`)
   - Proper control flow (IF...THEN:, WHILE...DO:, FOR EACH...IN:)
   - Variables declared with `$name`

2. **Semantic correctness**
   - Variables used are declared (or use `$/inferred/` syntax)
   - Types declared are used somewhere
   - `uses:` dependencies are actually referenced via `[[skill-name]]`
   - No self-referencing (skill can't use itself)

3. **Convention compliance**
   - Input parameters in `## Input` section
   - Type definitions in `## Types` section
   - Frontmatter has `name:` and `description:`

4. **Logical coherence**
   - Example makes sense and demonstrates something useful
   - Not just syntax soup

## Approach

1. Read the file and extract all code examples
2. Check each against the review checklist
3. Make fixes directly to the file
4. Document changes made

## Results

### Analysis

The CLI documentation (`website/src/pages/docs/cli.astro`) contains **no MDZ code examples**. The file focuses on CLI command usage and contains only:
- Bash code blocks (CLI commands)
- YAML code blocks (CI/CD integration example)

This is appropriate for a CLI documentation page, which demonstrates how to use the command-line tools rather than showing MDZ skill syntax.

### Changes Made

**No changes required** - the file contains no MDZ code examples to review.

## Evaluation

✅ **Complete** - CLI documentation reviewed. No MDZ code examples present, which is expected and appropriate for this page type.
