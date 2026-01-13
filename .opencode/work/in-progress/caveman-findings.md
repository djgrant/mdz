# Caveman Test: PR Reviewer Project

## The Test

Can I explain this system to someone with NO context about MDZ, code review tools, or the project?

---

## Question 1: Why are there 6 files?

### Attempt to explain each file in one sentence:

- `pr-reviewer.mdz` - "The main thing that reviews code" - PASS
- `storage.mdz` - "A way to save stuff to files" - PASS (barely)
- `learnings.mdz` - "Remembers what you told it last time" - PASS
- `review-config.mdz` - "Settings for how to review" - FAIL (Why separate from main?)
- `review-checklist.mdz` - "The list of things to check" - PASS
- `review-findings.mdz` - "Formats the output report" - FAIL (Why separate from checklist?)

### Verdict: 2 files fail the one-sentence test

**Problem**: A caveman would ask "Why isn't the checklist and the findings one thing? You check something, you write it down."

---

## Question 2: What is "storage.mdz" storing?

### What it claims to store:
- Review configuration
- Learnings from feedback
- PR review summaries
- Findings per PR
- Review history

### Caveman test:

**Caveman asks**: "Why do I need a file that tells me how to save files? Just save the file!"

**Answer attempt**: "Because we have different places to save things - some are per-repo, some are per-PR..."

**Caveman**: "So it's just folders. Why is this 106 lines?"

### Verdict: FAIL

**The abstraction doesn't justify itself.** Storage is just CRUD on files. The 4 operations (read, write, append, delete) don't warrant their own skill. The file structure documentation could live in `pr-reviewer.mdz` or a README.

**Simpler alternative**: Remove `storage.mdz`. Put file paths directly where they're used.

---

## Question 3: What are "learnings"?

### Current explanation (from learnings.mdz):
> "Learn and apply team review preferences through natural language feedback."

### Caveman translation attempt:
"When someone says 'Actually, we do it THIS way', the tool remembers that for next time."

### Caveman test: PASS (barely)

The concept is understandable. The implementation is overcomplicated:
- 3 action types (learn, apply, list)
- 4 scope levels (file, path, repo, org)
- 3 source types (feedback, config, guideline)

**Caveman asks**: "Why do I need to tell it if I'm learning or applying? Can't it just know?"

### Simpler alternative:
- Merge into main pr-reviewer
- Two modes: "remember this" and "what do you remember"
- Drop the scope/source taxonomy - just store natural language with file path context

---

## Question 4: Why separate "review-config" from the main reviewer?

### Current justification:
- Loads path-based instructions
- Extracts linked issues
- Has default blocked paths

### Caveman test: FAIL

**Caveman asks**: "If I'm reviewing a PR, why do I load config separately? That's just... part of reviewing."

**The real problem**: `review-config.mdz` does 3 unrelated things:
1. Load repo config (makes sense)
2. Parse PR description for issues (should be in main flow)
3. Define blocked paths (should be in config file, not code)

### Simpler alternative:
- Inline the config loading into `pr-reviewer.mdz` step 2 "Gather Context"
- Move blocked paths to actual config file
- Issue extraction is 5 lines, not a separate skill

---

## Question 5: Why separate "review-checklist" from "review-findings"?

### Current split:
- `review-checklist.mdz`: Analyze code, produce findings
- `review-findings.mdz`: Take findings, format output

### Caveman test: FAIL

**Caveman asks**: "Wait, I find problems... then I give them to someone else to write down? Why don't I just write them down myself?"

**The smell**: These two files share ALL the same types:
- `$Severity`, `$Category`, `$FindingType`, `$Finding`
- They're defined in both files!

This is a classic "premature separation" pattern. The files are coupled but pretending to be independent.

### Simpler alternative:
- Merge into one file: `review.mdz` or just inline into main
- "Analyze and Report" is one action, not two

---

## Summary: What Fails the Caveman Test

**6 files** - Too many moving parts. Simpler: 3 files max.

**storage.mdz** - Abstraction over CRUD. Simpler: Remove entirely.

**review-config.mdz** - Does 3 unrelated things. Simpler: Inline into main.

**review-findings.mdz** - Artificially split from checklist. Simpler: Merge with checklist.

**Type duplication** - Same types in 4 files. Simpler: Single type definitions.

**Learning scopes** - 4 levels (file, path, repo, org). Simpler: Just "this file" or "everywhere".

---

## Proposed Simplified Structure

```
pr-reviewer/
  pr-reviewer.mdz     # Main orchestrator (keep, simplify)
  learnings.mdz       # Memory system (keep, simplify)
  review.mdz          # Checklist + findings merged (new)
```

**3 files instead of 6.**

### What gets removed:
- `storage.mdz` - Use file operations directly
- `review-config.mdz` - Inline into main reviewer
- `review-findings.mdz` - Merge into review.mdz (with checklist)

### What gets simplified:
- Remove duplicate type definitions
- Remove learning scope taxonomy (file, path, repo, org)
- Remove storage scope taxonomy (repo, org, pr)

---

## The Core Insight

The current structure optimizes for **modularity** at the expense of **understandability**.

A caveman can understand: "Check code, find problems, write them down, remember for next time."

A caveman cannot understand: "Load config skill, which uses storage skill, to get path instructions, which go to checklist skill, which produces findings, which go to findings skill, which formats output, which gets saved via storage skill."

**The pipeline is visible, but the value isn't.**

---

## Specific Failures

### storage.mdz - REMOVE

106 lines to describe 4 file operations. This is bureaucracy masquerading as abstraction.

The "scopes" (repo, org, pr) are just folder paths. A caveman sees through this:
- repo scope = `.review/repo/`
- pr scope = `.review/prs/pr-123/`

That's not an abstraction. That's a path convention documented in 100 lines.

### review-config.mdz - INLINE

The 115 lines break down as:
- 40 lines of types and input/context (boilerplate)
- 30 lines for loading config (could be 5 lines in main)
- 25 lines for extracting issue references (could be 5 lines in main)
- 20 lines for "default blocked paths" (should be in actual config)

The entire file's job is "get settings before reviewing." That's step 1 of reviewing, not a separate skill.

### review-findings.mdz - MERGE

This file exists because someone thought "generate findings" and "format findings" are different responsibilities.

They're not. The checklist produces findings. Formatting is how you produce them.

The 182 lines could become 50 lines in a merged `review.mdz`.

---

## Recommendation

Refactor to 3 files maximum. Let the main file be 300 lines instead of 6 files of 100-180 lines. 

Complexity should be in the *content*, not the *structure*.
