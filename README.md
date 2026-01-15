# MDZ (Zen Markdown)

[![Experimental](https://img.shields.io/badge/status-experimental-orange.svg)](https://github.com/anomalyco/ai)

> A language for the world's most powerful runtime

MDZ extends markdown with constructs for expressing agent behaviors, composition, and orchestration patterns. It's designed to be:

- **Readable** as natural prose
- **Parseable** by deterministic tools  
- **Interpretable** by LLMs as executable instructions
- **Composable** through skill references and delegation

## Why MDZ?

**Signal over noise.** Standard prompts are cluttered with verbose instructions to manage context. MDZ removes this linguistic clutter.

**Clarity of thought.** By offloading logic, variables, and structure to the syntax (the `.mdz` file), the final prompt sent to the LLM is clean and focused. The code handles complexity so the model can focus on intent.

## Quick Start

```bash
# Install
npm install zenmarkdown

# Validate a skill (primary command)
mdz check skill.mdz

# Output validated source (unchanged)
mdz compile skill.mdz -o skill.out.mdz

# View dependency graph
mdz graph skill.mdz --mermaid

# Export AST
mdz parse skill.mdz > ast.json
```

## Syntax Overview

MDZ skills are markdown files with a `.mdz` extension:

```markdown
---
name: my-skill
description: When you need to accomplish something specific
uses:
  - ~/skill/helper-skill
---

## Types

$Task = any executable instruction
$Strategy = "fast" | "thorough"

## Input

$task: $Task
$strategy: $Strategy = "fast"

## Workflow

1. Analyze $task to determine /best approach/

2. FOR $step IN $task.steps
   Execute $step
   IF $step.failed THEN
     USE ~/skill/helper-skill TO /retry $step/
   END
END

3. Report results at /appropriate location/
```

### Key Constructs

**Types** - Semantic hints for values:
```markdown
$TypeName = natural language description
$Enum = "option1" | "option2" | "option3"
```

**Built-in Primitives** - Common types that don't need definition:
```markdown
$name: $String = "value"
$count: $Number = 42
$enabled: $Boolean = true
```

**Variables** - Named values with optional types:
```markdown
$name: $Type = value
$path = $n => `output-{$n}.mdz`
```

**References** - Links to skills and sections:
```markdown
~/skill/skill-name            # Reference another skill
~/skill/skill-name#section    # Reference a section in another skill
#section-name                 # Reference a section in current skill
```

**Semantic Markers** - LLM-interpreted content:
```markdown
/appropriate location for this output/
/determine best strategy for $task/

$/inferred-variable/      # LLM-tracked variable
$var: /description/       # Semantic type annotation
```

**Control Flow** - CAPS keywords for visibility:
```markdown
FOR $item IN $collection
  Process $item
END

WHILE $condition AND $count < 5 DO
  Iterate
END

IF $result = "success" THEN
  Continue
ELSE
  Handle failure
END
```

## CLI Reference

```bash
mdz check <file>
  Validate syntax, types, and references
  Primary command for catching errors before runtime

mdz compile <file> [options]
  Validate and output skill (source unchanged)
  
  Options:
    -o, --output <file>    Write output to file
    -V, --verbose          Show validation summary
    --source-map           Generate source map
    --metadata             Generate metadata JSON

mdz graph <file> [options]
  Output dependency graph
  
  Options:
    --mermaid              Output Mermaid format
    --dot                  Output GraphViz DOT format
    (default is JSON)

mdz parse <file>
  Output the AST as JSON

mdz --version
  Show version number

mdz --help
  Show help message
```

## API Usage

```typescript
import { parse, compile } from 'zenmarkdown';

// Parse a document
const source = fs.readFileSync('skill.mdz', 'utf-8');
const ast = parse(source);

// Access parsed structure
console.log(ast.frontmatter?.name);
for (const section of ast.sections) {
  console.log(section.title, section.anchor);
}

// Validate and extract metadata
const result = compile(source);

// Source is unchanged (no transformation)
console.log(result.output);  // === source

// Access validation results
for (const diag of result.diagnostics) {
  console.log(`${diag.severity}: ${diag.message} [${diag.code}]`);
}

// Access extracted metadata
console.log(result.metadata.types);
console.log(result.metadata.variables);
console.log(result.metadata.references);

// Access dependency graph
console.log(result.dependencies.nodes);
console.log(result.dependencies.edges);
```

### Error Codes

- **E008** - Type not defined in document
- **E009** - Skill not found in registry
- **E010** - Section reference broken
- **W001** - Skill not declared in uses/imports

## IDE Support

### VS Code

Install the MDZ extension for:

- Syntax highlighting for `.mdz` files
- Control flow keywords (FOR, WHILE, IF/THEN/ELSE, END)
- Variable and type highlighting
- Skill references with sigils
- Semantic markers (/content/)

The extension is located in `editors/vscode/`. To install locally:

```bash
cd editors/vscode
npm install
npm run compile
# Then copy to ~/.vscode/extensions/
```

### TextMate Grammar

The TextMate grammar is available at `editors/vscode/syntaxes/mdz.tmLanguage.json` for use with other editors.

## Language Specification

For the complete language specification, see:

- [`spec/language-spec.md`](spec/language-spec.md) - Full language specification
- [`spec/grammar.md`](spec/grammar.md) - Formal EBNF grammar

## Examples

See the `docs/examples/` directory for real-world skills:

- [`scientific-method.mdz`](docs/examples/the-scientist/skill/scientific-method.mdz) - Hypothesis-driven iteration
- [`steelmanning.mdz`](docs/examples/standalone-skills/skill/steelmanning.mdz) - Argument analysis
- [`pr-reviewer.mdz`](docs/examples/pr-reviewer/agent/pr-reviewer.mdz) - Multi-skill orchestration

## Design Philosophy

1. **Source = Output** - The LLM sees what you write. No transformation layer.
2. **Markdown First** - Valid markdown, extended not replaced
3. **Prose Friendly** - Read like natural language instructions
4. **CAPS Keywords** - Visually distinct control flow
5. **Semantic Types** - Hints for LLMs, not enforcement
6. **Validation First** - Catch errors before runtime, like dbt for SQL

## Roadmap

### v0.3 ✓
- Validator-first architecture
- Source = Output (no transformation)
- Dependency graph extraction
- Error codes for validation diagnostics
- Built-in primitive types ($String, $Number, $Boolean)

### v0.7 (Current)
- Link-based reference syntax: `~/skill/skill-name`, `#section`
- Unified `uses:` frontmatter field with typed references
- Removal of `[[wiki-link]]` syntax

### v0.8 (Planned)
- Registry-based skill resolution
- Cross-file validation
- Cycle detection across skill graph

See [`ROADMAP.md`](ROADMAP.md) for detailed proposals.

## Contributing

This project is experimental. Contributions welcome!

```bash
# Clone
git clone https://github.com/djgrant/mdz

# Install
pnpm install

# Build
pnpm build

# Test
pnpm test
```

## License

MIT
