---
size: sm
category: tooling
parent: wp-p1-language-coherence-master
---

# Playground Squiggle Persistence Bug

## Goal/Problem

In the web playground, error squiggles persist after reverting a change that caused them.

## Steps to Reproduce

1. Open playground with valid MDZ
2. Make an edit that triggers an error (squiggle appears)
3. Revert the change (undo or manually fix)
4. Squiggle remains even though code is valid

## Expected Behavior

Squiggle should disappear when the error is fixed.

## Scope

- `website/src/pages/playground.astro`
- `website/public/zen-worker.js` (or zen-worker.min.js)
- Monaco editor integration

## Hypothesis

The validation/diagnostic update isn't being triggered on every change, or stale diagnostics aren't being cleared before new ones are set.

## Approach

1. Review how Monaco diagnostics are set/cleared
2. Check if validation runs on every keystroke or debounced
3. Ensure diagnostics are cleared before revalidation
4. Test fix in playground

## Results

**Root Cause Identified:** The `renderDiagnostics()` function in `playground.astro` only set Monaco markers when there WERE diagnostics. When the code was valid (0 diagnostics), the function would:
1. Update the HTML container to show "No issues found"
2. Update the count badge to "0 issues"
3. Return early WITHOUT clearing Monaco markers

This meant the editor squiggles from a previous validation persisted even after the errors were fixed.

**Fix Applied:** Added `monaco.editor.setModelMarkers(editor.getModel(), "zen", [])` to clear markers when diagnostics array is empty (line ~437 in `renderDiagnostics()`).

**File Changed:** `website/src/pages/playground.astro`

**Validation mechanism is correct:**
- Validation runs on every content change (debounced 300ms)
- Worker communication works properly
- The only issue was not clearing markers when validation passes

## Evaluation

The fix ensures Monaco markers are cleared when there are no diagnostics, making the playground responsive and accurate. The squiggle will now disappear immediately when errors are fixed.
