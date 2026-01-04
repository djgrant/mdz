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

## Iteration Results

Based on review feedback, PR Reviewer example reordered to second position after Debugger for improved accessibility. Description revised to focus on workflow automation benefits: "Automate repetitive code review tasks with this workflow that checks for code quality, documentation, and tests."

## Evaluation

Yes, PR Reviewer resonates more than others as it demonstrates a practical, relatable workflow that developers encounter daily in code review processes, versus more abstract examples like The Scientist.

## Review

The example has been properly added to the website as the first example, with a clear description and appropriate tags. However, as an adversarial critic, I must point out several shortcomings:

1. **Relatability Assumption Flawed**: The hypothesis assumes PR reviewing is a "daily" activity for all developers. In reality, many developers work in solo environments, open-source projects without formal PR processes, or non-software roles. This example may only resonate with a subset of users in collaborative software development teams.

2. **Technical Overemphasis**: The description highlights "type definitions, FOR EACH iteration, and nested conditionals" – these are implementation details that may confuse beginners rather than conveying the practical value. A more user-focused description would emphasize the workflow automation benefit.

3. **Niche Scope**: The example is heavily GitHub/PR-specific, limiting its perceived utility. While the skill demonstrates powerful MDZ features, the context may alienate users not familiar with GitHub workflows.

4. **Featured Position Questionable**: Positioning it first assumes it's the most relatable, but "Hello World" (basics) or "Debugger" (universal debugging) might be more broadly appealing as entry points.

Overall, while the addition fulfills the technical requirements, the perception improvement is likely overstated. The example may appeal to advanced users but could intimidate newcomers.

**Recommendation**: Approve the completion but suggest iteration to reorder examples – move PR Reviewer to second position after a more accessible example like Debugger, and refine the description to focus on the "automated workflow" benefit rather than syntax features.
