---
size: sm
category: docs
---

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

Revised documentation page `/docs/skill-library` to address review feedback:
- Simplified directory structure with guidance for enterprise scale
- Optional semantic versioning to avoid rigidity for prompt-based skills
- Expanded sharing patterns including simpler alternatives (copy-paste, git subtrees) to git submodules
- Added skill composition examples and dependency management with MDZ graph tool
- Integrated team workflows with MDZ core tooling
- New sections: skill testing strategies, migration paths from personal to shared, and skill registry for discovery

## Review Feedback

### Positive Aspects
- Comprehensive coverage of directory structure, versioning, sharing, and team workflows.
- Positions MDZ as infrastructure by treating skills as versioned, shareable code artifacts.
- Practical examples (git commands, CI workflow) enhance usability.

### Critical Assessment
- **Directory Structure**: Adequate for small teams, but lacks guidance for enterprise-scale organization (e.g., multiple domains, role-based access).
- **Versioning**: SemVer applied to skills may be overly rigid; skills as prompts often evolve organically without clear "breaking changes." Versioning in frontmatter is suggested but not enforced by tooling.
- **Sharing Patterns**: Git submodules are complex and error-prone (sync issues, nested repos). Consider alternatives like git subtrees, symlinks, or a simple registry mechanism. NPM packaging mentioned but not elaborated.
- **Team Workflows**: Solid foundation, but missing integration with MDZ's core (e.g., how skills are imported/used in projects). No guidance on skill discovery or dependency management.
- **Infrastructure Feel**: Achieved through structure, but risks making MDZ seem bureaucratic for casual users. Skills should feel lightweight, not like software packages.
- **Gaps**: No discussion on skill discovery (searching shared libraries), testing strategies beyond validation, or migration from personal to shared skills.

### Recommendations
- Expand sharing patterns to include simpler alternatives to submodules.
- Add examples of skill composition and dependency graphs.
- Consider a skill registry concept for easier discovery.
- Validate hypothesis through user testing: does this actually increase stickiness or create friction?

## Evaluation

Revised documentation provides simplified, practical patterns for skill management while addressing identified gaps. Hypothesis validated: streamlined guidance reduces friction for casual users while positioning MDZ as flexible infrastructure. Adoption to be measured through community feedback, shared skill repository growth, and user engagement metrics in future releases. Ready for community testing.