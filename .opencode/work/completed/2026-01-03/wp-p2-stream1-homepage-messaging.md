---
size: sm
category: website
---

# Stream 1: Homepage Messaging & Syntax Highlighting

## Goal/Problem

The homepage currently says "Catch errors before the LLM sees them" - this is validator-focused messaging that undersells the vision.

The real excitement is: **zen is a NEW LANGUAGE that leverages LLMs as the world's most powerful runtime.** This positions zen as innovative and exciting, not just "error checking."

Additionally, the homepage code example renders as plain `<pre>` tags without syntax highlighting, missing an opportunity to show zen's distinctive syntax.

## Scope

- `/website/src/pages/index.astro` - Homepage content
- `/website/src/styles/global.css` - Syntax highlighting classes

## Approach

### 1. Update Hero Messaging

**Current:**
- Tagline: "Markdown for Multi-Agent Systems"  
- Headline: "Catch errors before the LLM sees them"
- Description: About tooling validation

**New direction:**
- Lead with "LLM as runtime" - the exciting part
- Frame zen as a new programming paradigm
- Validation is a benefit, not the headline

**Possible angles:**
- "The LLM is your runtime"
- "A new language for the LLM era"
- "Program in markdown. Execute with AI."
- "Write skills. LLMs run them."

### 2. Update Feature Descriptions

Make features reflect the "LLM as runtime" vision:
- "Readable as Prose" → emphasize LLM reads and executes
- "Validated by Tools" → frame as enabling confident execution
- "Executed by LLMs" → this is good, make it central
- "Composable Modules" → show how composition scales

### 3. Add Syntax Highlighting to Code Example

The code example currently uses:
```javascript
set:html={codeExample.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
```

Need to either:
- Server-side highlight with zen syntax colors
- Or use CSS classes to style the code

CSS classes already exist in global.css:
- `.zen-keyword` - purple for FOR EACH, WHILE, IF, THEN
- `.zen-type` - cyan for $Type
- `.zen-variable` - amber for $variable
- `.zen-semantic` - pink for {~~semantic}
- `.zen-reference` - blue for [[reference]]

## Hypothesis

Shifting the messaging from "catches errors" to "LLM as runtime" will:
1. Better capture the project's vision
2. Be more exciting to potential users
3. Differentiate from traditional linting/validation tools

Adding syntax highlighting will:
1. Immediately show zen's distinctive syntax
2. Make the code example more scannable
3. Demonstrate the language visually

## Results

_To be filled by implementing agent_

## Evaluation

_To be filled upon completion_
