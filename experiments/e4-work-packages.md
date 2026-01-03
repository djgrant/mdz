---
name: work-packages
description: When you need to track work across agent sessions, use this skill to create and manage work packages.
---

## Types

$WorkPackage = a markdown document that tracks a unit of work
$Status = "todo" | "in-progress" | "completed" | "blocked"
$Priority = "low" | "medium" | "high" | "critical"

## Input

- $title: $String
- $goal: $String
- $scope: $String
- $approach: $String

## Work Package Structure

A work package follows this structure:

```markdown
# {$title}

## Status: $Status

## Goal/Problem
{$goal}

## Scope
{$scope}

## Approach
{$approach}

## Hypothesis
{~~what you expect to happen and why}

## Results
{~~to be filled upon completion}

## Evaluation
{~~what was learned from results}
```

## Workflow

### Create Work Package

1. Determine path: {~~appropriate location based on context}
2. Generate content using [[#work-package-structure]]
3. Write to path
4. Return path to caller

### Update Work Package

1. Read current work package from $path
2. IF $status changed THEN:
   - Update Status section
3. IF $results provided THEN:
   - Append to Results section
4. Write updated content

### Complete Work Package

1. Read work package from $path
2. Set Status to "completed"
3. Fill in Results if not already done
4. Write Evaluation: {~~what was learned from this work}
5. Move to completed directory

---

## Path Resolution

Work packages are stored in a consistent location:

- In-progress: `.opencode/work/in-progress/`
- Completed: `.opencode/work/completed/`
- Todo: `.opencode/work/todo/`

The filename follows the pattern: `wp-{date}-{slug}.md`

Where:
- $date = current date in YYYY-MM-DD format
- $slug = {~~a short kebab-case identifier for the work}
