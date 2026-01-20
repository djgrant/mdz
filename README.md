# MDZ

MDZ is a superset of markdown designed to exploit LLM's inherent ability to evaluate programs.

## Vision

This project aims to:
1. Provide an LLM-human interface for writing programs not possible with traditional programming languages
2. Find and codify LLM's emergent capabilities to evaluate such programs

## Goals

The current version of MDZ extends markdown with constructs for expressing agent behaviors, composition, and orchestration patterns. 

The language is designed to be:

- **Readable** as natural prose
- **Parseable** by deterministic tools
- **Interpretable** by LLMs as executable instructions
- **Composable** through references to sub-agents and skills

## Language Design

MDZ is an amalgam of two grammars: markdown and proz. 

Proz is the grammar that adds LLM-interpretable programmatic constructs to a host grammar (e.g. markdown, plain text etc). The focus is on extending Markdown, but architecturally any text document can be host language.

The proz parser segments the document into a block stream containing either:
- unparsed blocks belonging to the host grammar e.g. raw markdown strings
- blocks of proz AST nodes

Proz kicks in when a delimiter like `FOR` or `DELEGATE` is detected. This means MDZ defaults to being prose first. You opt-in to programmatic control flow.

In the case of MDZ, you end up with a block stream that looks like this:

```json
[
  { "type": "host", "text": "---\nname: example-doc\n---" },
  {
    "type": "for",
    "target": "item",
    "iterable": "items",
    "blocks": [
      { "type": "host", "text": "prose inside for loop\n" },
      { "type": "stmt", "keyword": "CONTINUE" }
    ]
  }
]
```

## Explorations

There are a few different ways MDZ could be deployed:

### 1. LLM runs program, tracking state internally

LLMs are capable of holding state both internally and in context between turns. In some quick benchmarks I found MDZ outperformed prose, and used fewer tokens. However, LLMs can forget things and they do get distracted.

### 2. LLM runs program, tracking state externally

In this model, the LLM still runs the program, but uses a tool to update and store its internal pointer and program state. 

A pre-processing step could annotate the program with statement addresses for the LLM to reference.

### 3. LLM requests programs from a REPL

Similar to the ideas in [recursive language models](https://arxiv.org/abs/2512.24601) (RLMs), the LLM would call out to a REPL to request a module, or part of the program. The evaluation of the program could itself be a recursive call to prevent context rot.

### 4. LLM rewrites program in tail recursive loop

At the end of each turn the LLM could call itself with an updated version of the program containing its remaining steps and the program's internal state. This is most likely a bad idea, because one mistake corrupts the program, but it will be fun to explore.

## Contributions

Contributions from the community are warmly welcomed. 

While the language spec is being discovered, the most valuable contribution is sharing data from your experiences using MDZ. 

If there is a feature you think should belong in MDZ, it is recommended that you fork the repo, add the feature to your fork, and share your findings in an issue. The evolution of the language will be driven by data on what works in production.

## License

MIT License - Copyright (c) 2026 [Daniel Grant](https://danielgrant.co/)
