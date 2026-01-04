---
size: sm
category: docs
---

# Real-World Example

## Goal/Problem

We need a compelling example that shows MDZ solving a real problem. Current examples are illustrative but not "I need this" compelling.

## Scope

- New example in `examples/`
- Potentially featured on website

## Approach

1. Brainstorm candidates:
   - Code review agent
   - Documentation generator
   - Test writer
   - PR summarizer
   - Bug triage assistant
   - Refactoring assistant

2. Criteria for selection:
   - Relatable problem developers face
   - Shows MDZ advantages (composition, validation, control flow)
   - Not too complex to understand quickly
   - Actually useful, not contrived

3. Implement the chosen example
4. Write supporting documentation

## Hypothesis

A real-world example is the "penny drop" moment for potential users.

## Results

### Selection: PR Reviewer

**Why PR Reviewer won:**

1. **Universally relatable** - Every developer does code reviews
2. **Demonstrates MDZ strengths:**
   - `$PRType` enum shows type definitions
   - `FOR EACH ($filename, $diff) IN $files:` shows control flow
   - `{~~file contains logic changes}` shows semantic markers
   - Nested `IF THEN ELSE` shows conditional logic
   - `[[work-packages]]` shows skill composition
3. **Readable as prose** - Non-technical stakeholders can understand the review philosophy
4. **Actually useful** - Developers would genuinely want to use this
5. **Right complexity** - ~100 lines, understandable in 2 minutes

### Implementation: `examples/pr-reviewer.mdz`

Key features demonstrated:
- **Type definitions**: `$PRType`, `$ReviewOutcome`, `$Severity`, `$Finding`
- **Tuple types**: `($String, $String)[]` for files, `($Finding, $Severity)[]` for findings
- **Control flow**: `FOR EACH`, `IF THEN ELSE`, nested conditions
- **Semantic markers**: 
  - `{~~the nature of the changes}`
  - `{~~file contains logic changes}`
  - `{~~documentation missing or outdated}`
  - `{~~encouraging tone appropriate to the review outcome}`
- **Skill reference**: `[[work-packages]]`
- **Markdown structure**: Sections, numbered steps, nested lists
- **Philosophy section**: Shows how prose and structure work together

### What It Demonstrates to Visitors

1. **"I can read this"** - The workflow reads like English
2. **"This is structured"** - Types and sections provide organization
3. **"The LLM fills in the gaps"** - Semantic markers show where judgment happens
4. **"This could work"** - The logic is complete and realistic

## Evaluation

The PR Reviewer example successfully:
- Shows a real problem developers face daily
- Demonstrates all major MDZ features
- Remains readable and understandable
- Could actually be used (with appropriate tooling)

Recommended to feature prominently on the website examples page.
