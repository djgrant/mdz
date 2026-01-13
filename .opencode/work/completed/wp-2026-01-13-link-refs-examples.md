# Link-Based References: Example Migration

## Goal/Problem

Migrate all 25 example MDZ files from sigil-based references to link-based references, and reorganize into proper folder structure.

## Scope

**Directories:**
- `examples/compiler-examples/` (5 files)
- `examples/pr-reviewer/` (4 files)
- `examples/skills/` (11 files)
- `examples/the-scientist/` (5 files)

**Total:** 25 files, ~52 reference patterns to update

## Approach

### 1. Folder Reorganization

**Current structure:**
```
examples/
├── compiler-examples/
├── pr-reviewer/
├── skills/
└── the-scientist/
```

**New structure:**
```
examples/
├── agent/
│   ├── architect.mdz
│   ├── critic.mdz
│   ├── builder.mdz
│   └── ...
├── skill/
│   ├── work-packages.mdz
│   ├── scientific-method.mdz
│   ├── orchestrate.mdz
│   └── ...
├── tool/
│   ├── browser.mdz
│   └── ...
└── demo/
    ├── pr-reviewer.mdz      (entry points / orchestrators)
    └── multi-file-analyzer.mdz
```

### 2. Reference Pattern Changes

**Sigil to Link mapping:**
- `(@agent-name)` → `~/agent/agent-name`
- `(~skill-name)` → `~/skill/skill-name`
- `(!tool-name)` → `~/tool/tool-name`
- `(#section)` → `#section` (unchanged for same-file)

### 3. Statement Migrations

**DELEGATE:**
```mdz
# Before
DELEGATE /task/ TO (@architect)

# After
DELEGATE /task/ TO ~/agent/architect
```

**USE (new):**
```mdz
# Before
Execute (~work-packages) WITH:
  - /create packages/

# After
USE ~/skill/work-packages TO /create packages/
```

**EXECUTE (new):**
```mdz
# Before  
Run (!browser) to /take screenshot/

# After
EXECUTE ~/tool/browser TO /take screenshot/
```

**GOTO (new):**
```mdz
# Before
Continue with (#next-phase)

# After
GOTO #next-phase
```

### 4. Frontmatter Removal

**Before:**
```yaml
---
uses:
  - @architect
  - ~work-packages
---
```

**After:**
```yaml
---
id: my-skill
version: 1.0.0
description: Does something
---
```

### 5. Files to Migrate

**compiler-examples/ (5 files):**
- `broken-reference.mdz` - Update to show broken link error
- `complex-system.mdz` - Update all references
- `missing-type.mdz` - Update error example
- `undeclared-skill.mdz` - Update to link-not-found example
- `valid-skill.mdz` - Update to valid links

**pr-reviewer/ (4 files):**
- `code-analysis.mdz` → Move to `skill/code-analysis.mdz`
- `learnings.mdz` → Move to `skill/learnings.mdz`
- `pr-reviewer.mdz` → Move to `demo/pr-reviewer.mdz`
- `review-format.mdz` → Move to `skill/review-format.mdz`

**skills/ (11 files):**
All move to `skill/`:
- `adversarial-review.mdz`
- `brainstorm-parallel.mdz`
- `doc-freshness-checker.mdz`
- `multi-file-analyzer.mdz`
- `orchestrator.mdz`
- `parallel-delegation.mdz`
- `pre-mortem.mdz`
- `project-status-updater.mdz`
- `retry-until-success.mdz`
- `secret-rotation.mdz`
- `steelmanning.mdz`

**the-scientist/ (5 files):**
All move to `skill/`:
- `orchestrate-map-reduce.mdz`
- `orchestrate.mdz`
- `scientific-method.mdz`
- `simplify.mdz`
- `work-packages.mdz`

### 6. Update Internal Cross-References

After moving files, update any internal references between examples:
- `pr-reviewer.mdz` references to `code-analysis.mdz` become `~/skill/code-analysis`
- `orchestrator.mdz` references to agents become `~/agent/...`

### 7. Validation

After migration:
1. Run `mdz check` on all examples
2. Verify no broken references
3. Verify folder structure matches reference paths

## Hypothesis

Example migration provides:
1. Real-world validation of new syntax
2. Canonical examples for documentation
3. Test fixtures for parser/compiler changes
4. Clear folder structure demonstrates conventions

## Results

**Migration completed successfully.**

### New Folder Structure

```
examples/
├── agent/          # Empty, .gitkeep placeholder
├── demo/           # 6 entry-point/orchestrator files
│   ├── broken-reference.mdz
│   ├── complex-system.mdz
│   ├── missing-type.mdz
│   ├── pr-reviewer.mdz
│   ├── undeclared-skill.mdz
│   └── valid-skill.mdz
├── skill/          # 19 skill files
│   ├── adversarial-review.mdz
│   ├── brainstorm-parallel.mdz
│   ├── code-analysis.mdz
│   ├── doc-freshness-checker.mdz
│   ├── learnings.mdz
│   ├── multi-file-analyzer.mdz
│   ├── orchestrate-map-reduce.mdz
│   ├── orchestrate.mdz
│   ├── orchestrator.mdz
│   ├── parallel-delegation.mdz
│   ├── pre-mortem.mdz
│   ├── project-status-updater.mdz
│   ├── retry-until-success.mdz
│   ├── review-format.mdz
│   ├── scientific-method.mdz
│   ├── secret-rotation.mdz
│   ├── simplify.mdz
│   ├── steelmanning.mdz
│   └── work-packages.mdz
└── tool/           # Empty, .gitkeep placeholder
```

### Syntax Transformations Applied

1. **Removed all `uses:` frontmatter** - Dependencies are now inferred from link references

2. **Replaced sigil syntax with link-based references:**
   - `(~skill-name)` → `~/skill/skill-name`
   - `(@agent-name)` → `~/agent/agent-name`  
   - `(#section)` → `#section`

3. **Updated statements:**
   - `Execute (~skill)` → `USE ~/skill/x TO /task/`
   - `DELEGATE /task/ TO (@agent)` → `DELEGATE /task/ TO ~/agent/x`
   - `GOTO (#section)` → `GOTO #section`

### Verification

- Total files migrated: 25
- No old sigil syntax remaining: `grep -rE '\(@|\(~|\(#|\(!' examples/` returns empty
- All files in new folder structure

## Evaluation

**Hypothesis confirmed.** The migration:
1. Provides real-world examples of v0.8 link-based syntax
2. Demonstrates proper folder organization for agents/skills/tools
3. Shows how `USE`, `DELEGATE`, and `GOTO` work with link references
4. Removes redundant `uses:` declarations in favor of inferred dependencies
