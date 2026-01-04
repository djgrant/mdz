---
size: md
category: tooling
---

# mdq - Internal Markdown Query Tool

## Goal/Problem

We need an efficient way to track roadmap items, issues, and ideas using markdown files that humans can browse/edit directly, while still supporting structured queries (filter by priority, status, category).

This is an **internal tool** for managing MDZ project work, not a user-facing feature.

## Scope

- New directory: `tools/mdq/`
- Simple CLI script (bash or node)
- Integration with project roadmap structure

## Approach

### Directory Structure

```
roadmap/
├── exploration/
│   ├── p1-pending-macro-system.md
│   └── p2-pending-opencode-integration.md
├── issues/
│   ├── p1-pending-fix-type-syntax.md
│   └── p2-pending-zen-to-mdz-naming.md
├── tooling/
│   ├── p1-idea-prompt-to-mdz.md
│   └── p2-idea-unit-testing.md
├── docs/
│   └── p2-pending-advanced-spec.md
├── research/
│   └── p2-idea-onboarding-flow.md
└── marketing/
    └── p2-idea-hn-strategy.md
```

### Filename Convention

`{priority}-{status}-{slug}.md`

- **Priority**: p1, p2, p3, p4 (p1 = highest)
- **Status**: pending, in_progress, done, idea, blocked
- **Slug**: kebab-case description

### mdq CLI

```bash
# List all items
mdq list

# Filter by priority
mdq list --priority=1
mdq list -p1

# Filter by status
mdq list --status=pending
mdq list -s pending

# Filter by category (directory)
mdq list --category=tooling
mdq list -c tooling

# Combine filters
mdq list -p1 -s pending

# Sort options
mdq list --sort=priority  # default
mdq list --sort=status
mdq list --sort=name

# Output formats
mdq list --format=table   # default, human readable
mdq list --format=json    # for scripting
mdq list --format=paths   # just file paths

# Quick status change (renames file)
mdq status fix-type-syntax in_progress
# Renames p1-pending-fix-type-syntax.md → p1-in_progress-fix-type-syntax.md

# Quick priority change
mdq priority fix-type-syntax 1
```

### Implementation

Simple script that:
1. Globs `roadmap/**/*.md`
2. Parses filenames with regex: `/^(p\d)-(\w+)-(.+)\.md$/`
3. Filters/sorts in memory
4. Outputs formatted results

No database. No daemon. Just filesystem + string parsing.

### Performance Expectation

- Up to 200 items: instant (<50ms)
- 200-500 items: fast (<200ms)
- Beyond 500: still usable but consider if we've outgrown the tool

## Hypothesis

A simple filename-based convention with a thin query layer will:
1. Keep items human-editable in any editor
2. Enable efficient filtering without parsing file contents
3. Scale comfortably for our roadmap needs (<200 items)
4. Require minimal maintenance (no sync, no daemon, no database)

## Results

**Implemented: `tools/mdq/mdq`**

A Node.js CLI script that implements all specified features:

- **List command** with filters: `-p` (priority), `-s` (status), `-c` (category)
- **Sort options**: priority (default), status, name, category
- **Output formats**: table (default), json, paths
- **Status command**: `mdq status SLUG NEW_STATUS` - renames files
- **Priority command**: `mdq priority SLUG NEW_PRIORITY` - renames files
- **Help command**: `mdq help`

Also created:
- Roadmap directory structure: `roadmap/{exploration,issues,tooling,docs,research}/`
- Sample items following the naming convention

**Test Output:**
```
$ mdq list
P  STATUS       CATEGORY    SLUG
————————————————————————————————————————————————————————————
p1 pending      issues      fix-type-syntax
p1 in_progress  exploration macro-system
p2 idea         tooling     unit-testing
————————————————————————————————————————————————————————————
3 item(s)
```

## Evaluation

The approach worked well:
1. ✅ Files remain human-editable (plain markdown)
2. ✅ Filename convention enables fast filtering without content parsing
3. ✅ Single-file Node.js implementation - no dependencies beyond Node itself
4. ✅ Partial slug matching works for convenience (`mdq status macro in_progress`)
5. ✅ JSON output enables scripting/automation

The tool is ready for internal use. Future enhancements could include:
- Category-based commands (e.g., `mdq new tooling "unit-testing"`)
- Viewing item contents inline
- Opening items in $EDITOR
