# zen

> A markdown extension language for multi-agent systems

Zen extends markdown with constructs for expressing agent behaviors, composition, and orchestration patterns. It's designed to be:

- **Readable** as natural prose
- **Parseable** by deterministic tools  
- **Interpretable** by LLMs as executable instructions
- **Composable** through skill references and delegation

## Quick Start

```bash
# Install
npm install zen-lang

# Compile a skill
zen compile skill.zen.md -o skill.out.md

# Validate syntax
zen check skill.zen.md

# Export AST
zen parse skill.zen.md > ast.json
```

## Syntax Overview

Zen skills are markdown files with a `.zen.md` extension:

```markdown
---
name: my-skill
description: When you need to accomplish something specific
uses:
  - helper-skill
---

## Types

$Task = any executable instruction
$Strategy = "fast" | "thorough"

## Input

- $task: $Task
- $strategy: $Strategy = "fast"

## Workflow

1. Analyze $task to determine {~~best approach}

2. FOR EACH $step IN $task.steps:
   - Execute $step
   - IF $step.failed THEN:
     - Retry with [[helper-skill]]

3. Report results at {~~appropriate location}
```

### Key Constructs

**Types** - Semantic hints for values:
```markdown
$TypeName = natural language description
$Enum = "option1" | "option2" | "option3"
```

**Variables** - Named values with optional types:
```markdown
- $name: $Type = value
- $path = $n => `output-{$n}.md`
```

**References** - Links to skills and sections:
```markdown
[[skill-name]]           # Reference another skill
[[skill-name#section]]   # Reference a section in another skill
[[#section-name]]        # Reference a section in current skill
```

**Semantic Markers** - LLM-interpreted content:
```markdown
{~~appropriate location for this output}
{~~determine best strategy for $task}
```

**Control Flow** - CAPS keywords for visibility:
```markdown
FOR EACH $item IN $collection:
  - Process $item

WHILE (condition AND $count < 5):
  - Iterate

IF $result = "success" THEN:
  - Continue
ELSE:
  - Handle failure
```

## CLI Reference

```bash
zen compile <file> [options]
  Compile a skill to LLM-ready format
  
  Options:
    -o, --output <file>    Write output to file
    -V, --verbose          Show compilation statistics
    --source-map           Generate source map
    --no-expand-types      Don't expand type definitions
    --no-resolve-refs      Don't resolve references
    --no-transform-sem     Don't transform semantic markers
    --no-header            Don't include header comment

zen check <file>
  Validate syntax without compiling

zen parse <file>
  Output the AST as JSON

zen --version
  Show version number

zen --help
  Show help message
```

## API Usage

```typescript
import { parse, compile, AST } from 'zen-lang';

// Parse a document
const source = fs.readFileSync('skill.zen.md', 'utf-8');
const ast = parse(source);

// Access parsed structure
console.log(ast.frontmatter?.name);
for (const section of ast.sections) {
  console.log(section.title, section.anchor);
}

// Compile to LLM-ready format
const result = compile(source, {
  expandTypes: true,
  resolveReferences: true,
  transformSemantics: true,
});

console.log(result.output);
console.log(result.stats);
```

## IDE Support

### VS Code

Install the `zen-lang` extension for:

- Syntax highlighting for `.zen.md` files
- Control flow keywords (FOR EACH, WHILE, IF/THEN/ELSE)
- Variable and type highlighting
- Skill references ([[links]])
- Semantic markers ({~~content})

The extension is located in `editors/vscode/`. To install locally:

```bash
cd editors/vscode
npm install
npm run compile
# Then copy to ~/.vscode/extensions/
```

### TextMate Grammar

A standalone TextMate grammar is available at `editors/zen.tmLanguage.json` for use with other editors.

## Language Specification

For the complete language specification, see:

- [`spec/language-spec.md`](spec/language-spec.md) - Full language specification
- [`spec/grammar.md`](spec/grammar.md) - Formal EBNF grammar

## Examples

See the `examples/` directory for real-world skills:

- [`the-scientist.zen.md`](examples/the-scientist.zen.md) - Hypothesis-driven iteration
- [`debugger.zen.md`](examples/debugger.zen.md) - Skill execution tracing
- [`skill-composer.zen.md`](examples/skill-composer.zen.md) - Multi-skill orchestration

## Two-Layer Model

Zen uses a two-layer architecture:

**Source Format** - Human-authored, uses compact syntax:
```markdown
Execute [[skill]] with $validator: $Task
```

**Compiled Format** - Optimized for LLM consumption:
```markdown
Execute [skill] with validator (any executable instruction)
```

The compiler transforms:
- `$Type` → `Type (description)`
- `[[reference]]` → `[reference]` or resolved content
- `{~~semantic}` → `(determine: semantic)`

## Design Philosophy

1. **Markdown First** - Valid markdown, extended not replaced
2. **Prose Friendly** - Read like natural language instructions
3. **CAPS Keywords** - Visually distinct control flow
4. **Semantic Types** - Hints for LLMs, not enforcement
5. **Tool Friendly** - Easy to parse, highlight, complete

## Roadmap

### v0.2 (Planned)
- PARALLEL FOR EACH - Concurrent iteration
- Import system - Explicit skill loading
- Typed parameters - Type annotations in WITH clauses
- BREAK/CONTINUE - Loop control

### v0.3 (Considered)
- Inline conditionals
- Multi-line lambdas

See [`experiments/e5-enhancements.md`](experiments/e5-enhancements.md) for detailed proposals.

## Contributing

This project is experimental. Contributions welcome!

```bash
# Clone
git clone https://github.com/djgrant/zen

# Install
npm install

# Build
npm run build

# Test
npm test
```

## License

MIT
