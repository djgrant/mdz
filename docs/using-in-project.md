# Using MDZ in Your Project

Bridge the gap from playground examples to real-world adoption. Learn how to structure, validate, and integrate MDZ skills into your agent workflows.

## Installation

Install the MDZ CLI globally to validate and work with skills:

```bash
npm install -g @zenmarkdown/cli
```

Verify installation:

```bash
mdz --version
# mdz 0.3.0
```

## Workflow Overview

Using MDZ in a project follows three core steps:

1. **Write Skills** - Author reusable MDZ skills for specific tasks
2. **Validate** - Check syntax, types, and references before runtime
3. **Integrate** - Use validated skills with agents and LLMs

## Step-by-Step Tutorial

Follow this tutorial to create and use your first MDZ skill in a project.

### 1. Set Up Your Project

Create a new directory for your project and initialize it:

```bash
mkdir my-agent-project
cd my-agent-project
mkdir skills
```

### 2. Create Your First Skill

Create `skills/task-processor.mdz` with this content (see [syntax reference](/docs/syntax) for details):

<!-- mdz-snippet: docs/snippets/using-in-project/task-processor.mdz -->

### 3. Validate Your Skill

Validate the skill for syntax and type errors:

```bash
mdz check skills/task-processor.mdz
# OK: skills/task-processor.mdz is valid
#
#   Types: 2
#   Variables: 3
#   Dependencies: 0
```

If there are errors, fix them and re-run the check.

### 4. Compile the Skill

Compile the skill to generate metadata and validate thoroughly:

```bash
mdz compile skills/task-processor.mdz
# Outputs the compiled skill with validation header
```

Save the compiled output for use:

```bash
mdz compile skills/task-processor.mdz -o skills/task-processor.compiled.mdz
```

### 5. Use the Skill with an LLM

Copy the workflow section and use it in your LLM prompts. For example, in Claude Desktop:

<!-- mdz-snippet: docs/snippets/using-in-project/task-processor-prompt.mdz -->

## Project Structure

Organize your skills in a dedicated directory structure for maintainability:

```text
your-project/
|-- skills/
|   |-- core/           # Fundamental skills
|   |   |-- reasoning.mdz
|   |   `-- planning.mdz
|   |-- domain/         # Domain-specific skills
|   |   |-- code-review.mdz
|   |   `-- testing.mdz
|   `-- orchestration/  # Multi-skill workflows
|       `-- project-manager.mdz
|-- agents/
|   `-- my-agent.ts     # Agent that uses skills
`-- package.json
```

Skills are loaded by referencing their file paths. For programmatic integration, you can implement your own skill discovery logic.

## Writing and Validating Skills

Create skills for common patterns in your project:

<!-- mdz-snippet: docs/snippets/using-in-project/code-review-skill.mdz -->

Validate your skills to catch issues early:

```bash
cd skills
mdz check code-review.mdz
mdz check domain/*.mdz  # Validate all domain skills
```

For more detailed validation and metadata generation, use `compile`:

```bash
mdz compile code-review.mdz --verbose  # Show validation summary
mdz compile code-review.mdz --metadata  # Generate metadata JSON
```

Analyze dependencies between skills:

```bash
mdz graph code-review.mdz --mermaid  # Output dependency graph
```

Parse skills to AST for programmatic use:

```bash
mdz parse code-review.mdz > code-review.ast.json
```

## Integration with Tools

### Claude Desktop

Use MDZ skills by copying their workflow sections into Claude prompts:

<!-- mdz-snippet: docs/snippets/using-in-project/code-review-prompt.mdz -->

### Custom Agent Frameworks

For programmatic integration, install the core library:

```bash
npm install @zenmarkdown/core
```

Use the `compile` function to validate and process skills. See [API docs](/docs/api) for complete integration guide.

## Copy-Paste Starting Point

Use this template to create your first project skill:

<!-- mdz-snippet: docs/snippets/using-in-project/template.mdz -->

## Best Practices

- **Validate Early** - Run `mdz check` in CI/CD pipelines
- **Skill Composition** - Build complex workflows from simpler skills using links
- **Type Contracts** - Define clear input/output types for reliability
- **Version Control** - Track skill evolution alongside code changes
- **Testing** - Test skills with representative inputs and edge cases

### CI/CD Integration Example

Add to your `.github/workflows/ci.yml`:

```yaml
name: Validate MDZ Skills
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install -g @zenmarkdown/cli
      - run: mdz check skills/**/*.mdz
```

### Testing Skills

Test skills by validating with the CLI and checking for errors:

```bash
# Test validation
mdz check skills/task-processor.mdz

# Test compilation with verbose output
mdz compile skills/task-processor.mdz --verbose
```

## Next Steps

- [Skill Composition](/docs/composition) - Learn to combine skills effectively
- [API Reference](/docs/api) - Programmatic skill integration
- [Examples](/examples) - Real-world skill implementations
