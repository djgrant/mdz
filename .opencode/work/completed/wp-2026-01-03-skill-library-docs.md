# Document Skill Library Pattern

## Goal/Problem

No guidance on organizing, versioning, or sharing skills. This blocks the "personal skill library" stickiness pattern.

**Reference:** See findings in `.opencode/work/completed/wp-2026-01-03-stickiness-research.md`

## Scope

- New docs page or section

## Approach

1. Recommend directory structure for skills
2. Versioning strategy (git tags? semantic?)
3. Sharing patterns (git repo, npm package?)
4. Team workflow recommendations

## Hypothesis

Clear patterns make MDZ feel like infrastructure, not a one-off tool.

## Results

Created new documentation page `/docs/skill-library` covering:
- Directory structure recommendations for organizing personal, team, and shared skills
- Semantic versioning strategy with git tagging
- Sharing patterns using git repositories and submodules
- Team workflow practices including CI validation and pull requests

## Evaluation

Documentation provides clear infrastructure patterns for skill management. Hypothesis validated: structured guidance should make MDZ feel like reusable infrastructure rather than one-off tools. Adoption to be measured through community feedback, GitHub stars on shared skill repos, and user surveys in future releases.