# Reverse Complexity Audit: pr-reviewer Project

**Date**: 2026-01-12
**Auditor**: Adversarial Critic
**Verdict**: OVER-ENGINEERED

---

## Executive Summary

The pr-reviewer project contains **6 files** with **~783 lines** of MDZ code. This audit identifies **38 abstractions** and evaluates whether each prevents a catastrophe or is a candidate for removal.

**Finding: ~60% of abstractions are CANDIDATES FOR REMOVAL.**

---

## File-Level Abstractions

### 1. `pr-reviewer.mdz` (main orchestrator)
**What it does**: Entry point that coordinates the entire review workflow
**Catastrophe prevented**: Without an entry point, there's no starting skill to invoke
**Verdict**: KEEP - necessary as the root skill

### 2. `storage.mdz` (separate file)
**What it does**: Abstracts file read/write operations to `.review/` directory
**Catastrophe it supposedly prevents**: "Inconsistent storage locations"
**Actual catastrophe**: NONE. The LLM can write files. Every invocation just calls `[[storage#read]]` or `[[storage#write]]` which is literally "read a file" or "write a file".
**Verdict**: CANDIDATE FOR REMOVAL - inline storage paths directly into the skills that use them

### 3. `learnings.mdz` (separate file)
**What it does**: Manages learning/applying team preferences
**Catastrophe it supposedly prevents**: "Lost learnings", "inconsistent preference application"
**Actual catastrophe**: NONE. This is 129 lines to say "read learnings.md and match against file paths".
**Verdict**: CANDIDATE FOR REMOVAL - inline into pr-reviewer.mdz, ~20 lines max needed

### 4. `review-config.mdz` (separate file)
**What it does**: Loads path instructions and extracts linked issues
**Catastrophe it supposedly prevents**: "Missed path-specific instructions"
**Actual catastrophe**: NONE. This is a glorified "parse PR description for issue links and read config.md".
**Verdict**: CANDIDATE FOR REMOVAL - inline into pr-reviewer.mdz

### 5. `review-checklist.mdz` (separate file)
**What it does**: Contains the actual review checklist categories
**Catastrophe it supposedly prevents**: "Inconsistent review quality"
**Actual catastrophe**: WEAK. The checklist IS valuable domain knowledge, but it doesn't need to be a separate skill.
**Verdict**: CANDIDATE FOR MERGE - could be a section in pr-reviewer.mdz

### 6. `review-findings.mdz` (separate file)
**What it does**: Formats and groups findings into final review output
**Catastrophe it supposedly prevents**: "Inconsistent review formatting"
**Actual catastrophe**: NONE. This is output formatting that could be inline.
**Verdict**: CANDIDATE FOR REMOVAL - inline into pr-reviewer.mdz

---

## Type Definition Abstractions

### In pr-reviewer.mdz

| Type | Lines | Catastrophe Prevented | Verdict |
|------|-------|----------------------|---------|
| `$PRType` | 1 | NONE - LLM knows what PR types are | REMOVE |
| `$ReviewType` | 1 | NONE - "full" vs "incremental" is self-explanatory | REMOVE |
| `$Severity` | 1 | WEAK - provides consistency | KEEP (but move to checklist) |
| `$Category` | 1 | WEAK - provides consistency | KEEP (but move to checklist) |
| `$FindingType` | 1 | NONE - "issue", "suggestion", "nitpick" is obvious | REMOVE |
| `$Finding` | 1 | NONE - described prose, not structured | REMOVE |

### In review-findings.mdz

| Type | Lines | Catastrophe Prevented | Verdict |
|------|-------|----------------------|---------|
| `$Severity` | 1 | DUPLICATE of pr-reviewer.mdz | REMOVE |
| `$Category` | 1 | DUPLICATE of pr-reviewer.mdz | REMOVE |
| `$FindingType` | 1 | DUPLICATE of pr-reviewer.mdz | REMOVE |
| `$ReviewOutcome` | 1 | NONE - "approve", "request-changes", "comment" is obvious | REMOVE |
| `$IssueStatus` | 1 | NONE - "addressed", "not-addressed", "unclear" is obvious | REMOVE |
| `$Finding` | 1 | DUPLICATE of pr-reviewer.mdz | REMOVE |
| `$GroupedFindings` | 1 | NONE - prose definition | REMOVE |

### In review-config.mdz

| Type | Lines | Catastrophe Prevented | Verdict |
|------|-------|----------------------|---------|
| `$PathInstruction` | 1 | NONE - prose definition | REMOVE |
| `$LinkedIssue` | 1 | NONE - prose definition | REMOVE |
| `$IssueStatus` | 1 | DUPLICATE | REMOVE |
| `$BlockedPath` | 1 | NONE - prose definition | REMOVE |

### In storage.mdz

| Type | Lines | Catastrophe Prevented | Verdict |
|------|-------|----------------------|---------|
| `$StorageOperation` | 1 | NONE - "read", "write", "append", "delete" is obvious | REMOVE |
| `$StorageScope` | 1 | NONE - "repo", "org", "pr" could be inline | REMOVE |
| `$StoragePath` | 1 | NONE - prose definition | REMOVE |

### In review-checklist.mdz

| Type | Lines | Catastrophe Prevented | Verdict |
|------|-------|----------------------|---------|
| `$Category` | 1 | DUPLICATE | REMOVE |
| `$Severity` | 1 | DUPLICATE | REMOVE |
| `$FindingType` | 1 | DUPLICATE | REMOVE |
| `$Finding` | 1 | DUPLICATE | REMOVE |

### In learnings.mdz

| Type | Lines | Catastrophe Prevented | Verdict |
|------|-------|----------------------|---------|
| `$Learning` | 1 | NONE - prose definition | REMOVE |
| `$LearningScope` | 1 | NONE - could be inline | REMOVE |
| `$LearningSource` | 1 | NONE - could be inline | REMOVE |

**Type Summary**: 26 type definitions across 6 files. At least 22 are CANDIDATES FOR REMOVAL (duplicates, prose definitions, or obvious enums).

---

## Skill Reference/Dependency Abstractions

### `[[storage]]` references (used by: pr-reviewer, review-config, learnings)

| Reference | Catastrophe Prevented | Verdict |
|-----------|----------------------|---------|
| `[[storage#read]]` | NONE - LLM can read files directly | REMOVE ABSTRACTION |
| `[[storage#write]]` | NONE - LLM can write files directly | REMOVE ABSTRACTION |
| `[[storage#append]]` | NONE - LLM can append to files | REMOVE ABSTRACTION |

**The storage skill adds an entire layer of indirection for basic file I/O.**

### `[[learnings]]` references (used by: pr-reviewer)

| Reference | Catastrophe Prevented | Verdict |
|-----------|----------------------|---------|
| `[[learnings#apply]]` | NONE - "read learnings.md, filter by path" is 5 lines | REMOVE ABSTRACTION |
| `[[learnings#learn]]` | NONE - "append to learnings.md" is trivial | REMOVE ABSTRACTION |

### `[[review-config]]` references (used by: pr-reviewer)

| Reference | Catastrophe Prevented | Verdict |
|-----------|----------------------|---------|
| Main invocation | NONE - "parse config, extract issues" could be inline | REMOVE ABSTRACTION |

### `[[review-checklist]]` references (used by: pr-reviewer)

| Reference | Catastrophe Prevented | Verdict |
|-----------|----------------------|---------|
| Main invocation | WEAK - checklist is reusable domain knowledge | COULD MERGE but keep content |

### `[[review-findings]]` references (used by: pr-reviewer)

| Reference | Catastrophe Prevented | Verdict |
|-----------|----------------------|---------|
| Main invocation | NONE - formatting logic could be inline | REMOVE ABSTRACTION |

---

## Section-Level Abstractions

### pr-reviewer.mdz sections (10 workflow steps)

| Section | Lines | Catastrophe Prevented | Verdict |
|---------|-------|----------------------|---------|
| Initialize | 8 | NONE - trivial setup | MERGE with Gather Context |
| Gather Context | 8 | KEEP - core function | KEEP |
| Load Configuration | 7 | NONE - single delegation | INLINE |
| Load Learnings | 7 | NONE - single delegation | INLINE |
| Analyze Changes | 11 | KEEP - core loop | KEEP |
| Assess Linked Issues | 5 | NONE - trivial loop | MERGE with Analyze |
| Note Positives | 10 | WEAK - could be inline | MERGE |
| Generate Review | 6 | NONE - single delegation | INLINE |
| Persist State | 10 | NONE - two write calls | INLINE |
| Deliver | 2 | KEEP - final action | KEEP |

### review-findings.mdz sections

| Section | Lines | Catastrophe Prevented | Verdict |
|---------|-------|----------------------|---------|
| Generate Summary | 5 | NONE - obvious task | INLINE |
| Generate Walkthrough | 6 | NONE - obvious task | INLINE |
| Determine Outcome | 15 | WEAK - decision logic | INLINE |
| Format Review | 2 | NONE - trivial | REMOVE |
| Review Structure | 40+ | WEAK - formatting rules | COULD BE TEMPLATE |

### storage.mdz sections

| Section | Lines | Catastrophe Prevented | Verdict |
|---------|-------|----------------------|---------|
| Read | 6 | NONE - "read file" | REMOVE ENTIRE FILE |
| Write | 6 | NONE - "write file" | REMOVE ENTIRE FILE |
| Append | 8 | NONE - "append to file" | REMOVE ENTIRE FILE |
| Delete | 5 | NONE - "delete file" | REMOVE ENTIRE FILE |
| File Formats | 25 | DOCUMENTATION ONLY - could be comments | INLINE AS COMMENTS |

---

## Dependency Graph Analysis

```
pr-reviewer
├── storage (UNNECESSARY LAYER)
├── learnings (UNNECESSARY - uses storage)
│   └── storage
├── review-config (UNNECESSARY - uses storage)
│   └── storage
├── review-checklist (KEEP CONTENT, MERGE FILE)
└── review-findings (UNNECESSARY - pure formatting)
```

**Depth**: 3 levels
**Should be**: 1 level (single file)

---

## Catastrophes Actually Prevented

1. **None for storage abstraction**: An LLM doesn't need a skill to read/write files
2. **None for type definitions**: Most are prose or obvious enums
3. **Weak for checklist**: The domain knowledge is valuable, but separation adds no benefit
4. **None for findings formatting**: Output formatting doesn't need its own skill

---

## Recommended Simplified Structure

### Single File: `pr-reviewer.mdz`

```
---
name: pr-reviewer
description: Review PRs with learnings and path-specific instructions
---

## Types

$Severity: "critical" | "major" | "minor" | "trivial"
$Category: "correctness" | "security" | "performance" | "maintainability" | "testing"

## Input/Context (combined, minimal)

## Workflow

### 1. Gather Context & Config
- Fetch PR, extract linked issues
- Load .review/config.md for path instructions
- Load .review/learnings.md for preferences

### 2. Review Each File
[Inline the checklist content here]

### 3. Format & Deliver
[Inline the formatting logic here]

### 4. Persist
- Write to .review/prs/pr-{number}/

## Review Checklist (was review-checklist.mdz)
[Content here]

## Output Format (was review-findings.mdz)  
[Content here]

## Learning from Feedback
[Content here, simplified]
```

**Estimated reduction**: 783 lines → ~200 lines

---

## Summary: Candidates for Removal

### Files to Remove (5 of 6)
1. `storage.mdz` - REMOVE ENTIRELY
2. `learnings.mdz` - MERGE content, delete file
3. `review-config.mdz` - MERGE content, delete file
4. `review-checklist.mdz` - MERGE content, delete file
5. `review-findings.mdz` - MERGE content, delete file

### Types to Remove (22 of 26)
All prose definitions, all duplicates, all obvious enums

### Skill References to Remove (8 of 8)
All delegations to storage, learnings, review-config, review-findings

### Sections to Merge/Inline (15+)
Most workflow steps are single delegations that add no value as separate sections

---

## The Core Problem

This project demonstrates **premature decomposition**. The author anticipated complexity that doesn't exist:

1. **Storage abstraction**: Anticipated needing multiple storage backends or complex path logic. Reality: LLMs can write files.

2. **Learnings skill**: Anticipated complex preference matching. Reality: "grep file path in learnings.md"

3. **Config skill**: Anticipated complex configuration scenarios. Reality: "read config.md and parse PR description"

4. **Findings skill**: Anticipated multiple output formats. Reality: One markdown format.

5. **Type system overuse**: Anticipated needing schema validation. Reality: MDZ's types are for validation, not runtime structure.

**The project has 6 files where 1 would suffice, with no catastrophe prevented by the decomposition.**
