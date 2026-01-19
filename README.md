# MDZ

[![Experimental](https://img.shields.io/badge/status-experimental-orange.svg)](https://github.com/djgrant/mdz)

MDZ is a superset of markdown designed to exploit LLM's inherent ability to evaluate programs.

## Vision

This project aims to:
1. Provide an LLM-human interface for writing programs not possible with traditional programming languages
2. Find and codify LLM's emergent capabilities to evaluate such programs

## Explorations

There are few different ways MDZ could be deployed:

### 1. LLM runs program, tracking state internally

LLMs are capable of holding state both internally and in context between turns. In some quick benchmarks I found MDZ outperformed prose, and used fewer tokens. However, LLMs can forget things and they do get distracted.

### 2. LLM runs program, tracking state externally

In this model, the LLM still runs the program, but uses a tool to update and store its internal pointer and program state. 

A pre-processing step could annotate the program with statement addresses for the LLM to reference.

### 3. LLM requests programs from a REPL

Similar to the ideas in [recursive language models](https://arxiv.org/abs/2512.24601) (RLMs), the LLM would call out to a REPL to request a module, or part of the program. The evaluation of the program could itself be a recursive call to prevent context rot.

### 4. LLM rewrites program in tail recursive loop

At the end of each turn the LLM could call itself with an updated version of the program containing its remaining steps and the program's internal state. This is most likely a bad idea, because one mistake corrupts the program, but it will be fun to explore.

## Current Status

The current version of MDZ extends markdown with constructs for expressing agent behaviors, composition, and orchestration patterns. 

The language is designed to be:

- **Readable** as natural prose
- **Parseable** by deterministic tools
- **Interpretable** by LLMs as executable instructions
- **Composable** through references to sub-agents and skills

## Contributions

Contributions from the community are warmly welcomed. 

While the language spec is being discovered, the most valuable contribution is sharing data about your experience using MDZ. 

If there is a feature you think should belong in MDZ, I recommend forking the repo, adding it to your fork, and reporting back your findings.

## License

MIT License - Copyright (c) 2026 [Daniel Grant](https://danielgrant.co/)
