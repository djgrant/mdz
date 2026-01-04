---
size: md
category: language
---

# V7: Prior Art Analysis

## Goal/Problem

Survey existing approaches to structured documents, DSLs, and agent definition languages.

## Results

### Category 1: Markdown Extensions

#### MDX (React Components in Markdown)

```jsx
import { Chart } from './components'

# My Document

Here's a chart:

<Chart data={salesData} type="bar" />

And some more markdown content.
```

**Key decisions:**
- JSX syntax for components
- Import statements at top
- Components can receive props
- Markdown and JSX interleave

**What Zen can learn:**
- Component concept maps to skill references
- Props map to parameters
- Interleaving works when syntax is distinct
- Imports clarify dependencies

**What to avoid:**
- JSX angle brackets may clash with markdown
- Requires JS/React knowledge

---

#### Markdoc (Stripe's Markdown)

```markdown
# Hello {% $user.name %}

{% if $user.loggedIn %}
Welcome back!
{% /if %}

{% callout type="warning" %}
Be careful with this.
{% /callout %}
```

**Key decisions:**
- `{% %}` delimiters for tags
- Variables with `$` prefix
- Tags have explicit close `{% /tag %}`
- Custom tags for components

**What Zen can learn:**
- Clear delimiter choice (not conflicting with markdown)
- $ for variables is familiar
- Explicit closing is unambiguous
- Tags for structured content

**What to avoid:**
- Verbose close tags
- Learning curve for tag library

---

#### Pandoc (Academic Extensions)

```markdown
# Introduction {#intro .unnumbered}

See [@smith2020] for details.

::: {.callout-note}
This is a note.
:::

| Column 1 | Column 2 |
|----------|----------|
| Data     | More     |
```

**Key decisions:**
- Attributes in `{}`
- Fenced divs with `:::`
- Citation syntax `[@key]`
- Many output formats

**What Zen can learn:**
- Attribute syntax is powerful and non-intrusive
- Fenced divs work for blocks
- Single source, multiple outputs

**What to avoid:**
- Complexity of full Pandoc spec
- Obscure syntax for edge cases

---

### Category 2: Literate Programming

#### Knuth's WEB/CWEB

```text
@ Here we define the main program.
@<Main program@>=
print("Hello, World!")
@

@ The greeting is defined separately.
@<Greeting@>=
"Hello, World!"
@
```

**Key decisions:**
- Named chunks with `@<name@>`
- Chunks can reference each other
- Prose and code interwoven
- "Tangle" extracts code, "weave" extracts docs

**What Zen can learn:**
- Named, referenceable chunks
- Separation of human and machine views
- Composition through references

**What to avoid:**
- Obscure @ syntax
- Toolchain complexity

---

#### Jupyter Notebooks

```json
{
  "cells": [
    {"cell_type": "markdown", "source": ["# Analysis"]},
    {"cell_type": "code", "source": ["import pandas"]}
  ]
}
```

**Key decisions:**
- Cells as units (markdown or code)
- Sequential execution
- Rich output display
- JSON structure underneath

**What Zen can learn:**
- Cell-based organization
- Executable sections
- Visual feedback on execution

**What to avoid:**
- JSON is not human-friendly to edit
- Linear execution model limitations

---

### Category 3: Configuration Languages

#### HCL (Terraform)

```hcl
resource "aws_instance" "web" {
  ami           = "ami-12345"
  instance_type = "t2.micro"
  
  tags = {
    Name = "WebServer"
  }
}
```

**Key decisions:**
- Block-based structure
- Key = value assignments
- Nested blocks
- Interpolation with ${}
- Type system with validation

**What Zen can learn:**
- Block structure with clear names
- Declarative over imperative
- Strong validation

**What to avoid:**
- Not markdown-compatible
- Learning a new syntax

---

#### CUE Language

```cue
#Service: {
    name:  string
    port:  int & >0 & <65536
    protocol: "tcp" | "udp"
}

myService: #Service & {
    name: "web"
    port: 8080
    protocol: "tcp"
}
```

**Key decisions:**
- Types and values unified
- Constraints inline with types
- Composition through &
- Schemas are first-class

**What Zen can learn:**
- Types with constraints
- Composition through unification
- Validation built into language

**What to avoid:**
- Complex type system
- Steep learning curve

---

### Category 4: Template Languages

#### Jinja2

```jinja
{% for item in items %}
  <li>{{ item.name }}</li>
{% endfor %}

{% if user.is_admin %}
  Admin controls here
{% endif %}
```

**Key decisions:**
- `{{ }}` for expressions
- `{% %}` for statements
- Filters: `{{ name | upper }}`
- Inheritance with blocks

**What Zen can learn:**
- Two delimiter types (expression vs statement)
- Filter/pipe syntax
- Template inheritance

**What to avoid:**
- Close to HTML, not markdown
- Verbose for simple cases

---

#### Liquid (Shopify/Jekyll)

```liquid
{% assign greeting = "Hello" %}
{{ greeting }}, {{ user.name }}!

{% for product in products %}
  {{ product.title }}
{% endfor %}
```

**Key decisions:**
- Simpler than Jinja
- Assign for variables
- Minimal logic
- Safe (no arbitrary code)

**What Zen can learn:**
- Simplicity over power
- Sandboxed execution
- Familiar to Jekyll users

**What to avoid:**
- Limited expressiveness

---

### Category 5: Agent/Workflow DSLs

#### OpenAI Function Calling

```json
{
  "name": "get_weather",
  "description": "Get the current weather",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {"type": "string"},
      "unit": {"enum": ["celsius", "fahrenheit"]}
    },
    "required": ["location"]
  }
}
```

**Key decisions:**
- JSON Schema for parameters
- Description for LLM guidance
- Strict typing
- Function as unit

**What Zen can learn:**
- Schema-based parameter definition
- Description as guidance
- Clear required vs optional

**What to avoid:**
- JSON is verbose
- No flow control

---

#### LangGraph

```python
workflow = StateGraph(AgentState)
workflow.add_node("agent", call_model)
workflow.add_node("tools", tool_node)
workflow.add_edge("agent", "tools")
workflow.add_conditional_edges("tools", should_continue)
```

**Key decisions:**
- Graph-based workflow
- Nodes and edges
- Conditional routing
- State flows through graph

**What Zen can learn:**
- Graph mental model
- State threading
- Conditional transitions

**What to avoid:**
- Requires Python
- Not declarative in markdown

---

#### DSPy

```python
class RAG(dspy.Module):
    def __init__(self, num_passages=3):
        self.retrieve = dspy.Retrieve(k=num_passages)
        self.generate = dspy.ChainOfThought(GenerateAnswer)
    
    def forward(self, question):
        context = self.retrieve(question)
        return self.generate(context=context, question=question)
```

**Key decisions:**
- Module as unit of composition
- Forward pass defines flow
- Signatures define I/O
- Optimizer tunes prompts

**What Zen can learn:**
- Module composition
- Signature-based contracts
- Optimization is separate from definition

**What to avoid:**
- Python-specific
- Complex optimization concepts

---

### Category 6: Type Systems in DSLs

#### GraphQL

```graphql
type Query {
  user(id: ID!): User
  posts(limit: Int = 10): [Post!]!
}

type User {
  id: ID!
  name: String!
  posts: [Post!]!
}
```

**Key decisions:**
- ! for non-null
- [] for arrays
- Arguments with defaults
- Type references by name

**What Zen can learn:**
- Concise type syntax
- Non-null annotation
- Input vs output types

**What to avoid:**
- Too specialized for querying

---

#### Protocol Buffers

```protobuf
message Person {
  string name = 1;
  int32 age = 2;
  repeated string emails = 3;
  optional Address address = 4;
}
```

**Key decisions:**
- Field numbers for evolution
- `repeated` for arrays
- `optional` for nullable
- Message as container

**What Zen can learn:**
- Simple type vocabulary
- Optional/required explicit
- Schema evolution consideration

**What to avoid:**
- Binary focus
- Field numbers unnecessary

---

## Synthesis

### Cross-Cutting Themes

1. **Delimiters matter**: Every system carefully chooses delimiters that don't conflict
2. **Variables need marking**: $, {{ }}, or similar to distinguish from prose
3. **Blocks need boundaries**: Whether `{% end %}`, `:::`, or indentation
4. **Types help tooling**: Even minimal types enable validation
5. **Compile step is common**: Source format ≠ execution format

### What Zen Can Borrow

- **From Markdoc**: `{% %}` tags, `$` variables
- **From Pandoc**: `{}` attributes, `:::` fenced divs
- **From Jinja**: Filter syntax, inheritance
- **From CUE**: Types with constraints
- **From GraphQL**: Concise type syntax
- **From DSPy**: Module + signature pattern

### What Zen Should Avoid

- **JSX angle brackets**: Too close to markdown/HTML
- **JSON configuration**: Not human-friendly
- **Python-specific patterns**: Not markdown-native
- **Complex template inheritance**: Overkill

---

## Evaluation

### Key Findings

1. **Zen is not novel** - Every pattern has precedent. Innovation is in synthesis.

2. **Markdown extensions work** - MDX, Markdoc, Pandoc prove markdown can be extended.

3. **Type systems can be simple** - GraphQL and Protobuf show minimal viable typing.

4. **Agent DSLs are young** - Current approaches (LangGraph, DSPy) are code-first, not document-first.

5. **Gap exists** - No prior art for LLM-interpreted markdown with typing and composition.

### Promising Borrowings

1. **Markdoc-style tags** for control flow: `{% if %}...{% /if %}`
2. **Pandoc-style attributes** for metadata: `{.type #id key=value}`
3. **GraphQL-style types**: `$Task!`, `$Task[]`, `$Strategy = "a" | "b"`
4. **Jinja-style filters**: `$content | summarize | validate`
5. **DSPy-style signatures** for skill interfaces

### Open Questions

- Can we create something simpler than existing systems?
- What's the minimum viable feature set?
- How do we handle the LLM-interpretation aspect that no prior art addresses?
