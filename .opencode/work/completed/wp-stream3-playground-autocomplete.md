# Stream 3: Playground Autocomplete

## Goal/Problem

The playground has Monaco editor with zen syntax highlighting, but autocomplete is limited. Users should get intelligent suggestions based on document context.

## Scope

- `/website/src/pages/playground.astro` - Monaco configuration
- `/website/src/zen-worker-entry.ts` - Worker handling LSP-like features
- `/src/lsp/server.ts` - Reference for LSP implementation (may have reusable logic)

## Desired Autocomplete Behavior

### After `$` character
Suggest:
- Defined types from current document (e.g., `$Task`, `$Hypothesis`)
- Defined variables from current document (e.g., `$result`, `$count`)
- Built-in types (if any)

### After `[[` characters
Suggest:
- Skills from `uses:` declarations in frontmatter
- Should show the skill names defined in the YAML array

### After `[[#` characters
Suggest:
- Sections from current document (h2 headers)
- Format: `[[#section-name]]`

## Current Implementation

The playground uses Monaco with:
- Custom zen language definition
- Monarch tokenizer for syntax highlighting
- WebWorker for validation

The worker (`zen-worker-entry.ts`) communicates with the main thread for validation but may not have completion logic.

## Approach

### 1. Analyze Current Monaco Setup

Review:
- How Monaco completion providers are configured
- What the zen worker currently does
- How to register custom completion providers

### 2. Implement Completion Provider

Add Monaco completion provider that:
1. Detects trigger characters (`$`, `[`)
2. Parses current document to extract:
   - Type definitions (`$Type = ...`)
   - Variable definitions (`$var: $Type` or `$var = ...`)
   - Uses declarations from frontmatter
   - Section headers (## headings)
3. Returns appropriate suggestions based on context

### 3. Handle Document Parsing

Either:
- Parse in the main thread (simple regex)
- Use the worker to parse and send back symbols
- Extend worker protocol for completion requests

## Implementation Notes

Monaco completion provider registration:
```javascript
monaco.languages.registerCompletionItemProvider('zen', {
  triggerCharacters: ['$', '['],
  provideCompletionItems: (model, position) => {
    // Return suggestions
  }
});
```

## Hypothesis

Context-aware autocomplete will:
1. Reduce typing errors (typos in type/variable names)
2. Help users discover available skills and sections
3. Make the playground feel more like a real IDE

## Results

_To be filled by implementing agent_

## Evaluation

_To be filled upon completion_
