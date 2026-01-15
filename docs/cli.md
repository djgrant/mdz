# Command Line Interface

Use the MDZ CLI to validate, compile, and inspect skills.

## Installation

```bash
npm install -g zenmarkdown
```

## Commands

### check

Validate a skill for errors--the primary command:

```bash
mdz check <file>
```

This validates syntax, references, type contracts, and dependencies. Errors are caught here--before the LLM ever sees the skill.

#### What It Checks

- **Syntax** -- Valid MDZ constructs
- **Links** -- `~/skill/name` and `~/agent/name` targets exist
- **Anchors** -- `#section` targets exist
- **Types** -- Contracts match across boundaries
- **Dependencies** -- No circular references
- **Scope** -- Variables defined before use

#### Example

```bash
mdz check my-skill.mdz

OK: my-skill.mdz is valid
  Types: 3
  Variables: 5
  Dependencies: 2
```

### compile

Validate and output a skill (source unchanged):

```bash
mdz compile <file> [options]
```

#### Options

- `-o, --output <file>` -- Write output to file
- `-V, --verbose` -- Show validation summary
- `--source-map` -- Generate source map
- `--metadata` -- Generate metadata JSON

The compiler validates the skill and outputs the source unchanged. MDZ is validator-first: the LLM sees exactly what you wrote.

#### Example

```bash
# Validate and write to output file
mdz compile skill.mdz -o skill.out.mdz

# Show validation summary
mdz compile skill.mdz -V
```

### parse

Output the AST as JSON (useful for tooling integration):

```bash
mdz parse <file>
```

### graph

Output the dependency graph for a skill:

```bash
mdz graph <file> [options]
```

#### Options

- `--mermaid` -- Output Mermaid format
- `--dot` -- Output GraphViz DOT format
- (default is JSON)

Shows which files are linked from your skill.

## Exit Codes

- `0` -- Success (validation passed)
- `1` -- Error (validation failed, file not found, etc.)

## Integration with CI/CD

Run `mdz check` in your pipeline to catch errors before deployment:

```yaml
# GitHub Actions example
- name: Validate skills
  run: mdz check ./skills/**/*.mdz
```
