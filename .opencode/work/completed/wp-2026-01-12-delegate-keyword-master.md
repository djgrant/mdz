# DELEGATE Keyword Feature - Master Work Package

## Goal/Problem

Introduce a `DELEGATE` keyword to MDZ for explicitly delegating tasks to subagents. This is distinct from the existing "Execute/Use" delegation patterns which reference skills. DELEGATE is specifically for spawning and delegating to subagents.

Key requirements:
1. Subagents should be declared in frontmatter (similar to skills/tools)
2. Fix existing issue where compiler looks for "uses" but we've moved to "skills/tools"
3. Add DELEGATE as a new keyword for subagent delegation
4. Update all relevant specs, compiler, examples, and documentation

## Scope

Files/packages affected:
- `spec/grammar.md` - Formal grammar specification
- `spec/language-spec.md` - Language specification
- `packages/core/src/parser/ast.ts` - AST type definitions
- `packages/core/src/parser/lexer.ts` - Lexer for DELEGATE keyword
- `packages/core/src/parser/parser.ts` - Parser for DELEGATE statements
- `packages/core/src/compiler/compiler.ts` - Compiler validation
- `tests/` - Test files for the new feature
- `examples/` - Example MDZ files

## Approach

Break into parallel work packages:
1. **Specification WP** - Update grammar.md and language-spec.md
2. **AST/Types WP** - Add DelegateStatement AST node and related types
3. **Lexer/Parser WP** - Add DELEGATE token and parsing logic
4. **Compiler WP** - Add validation for agents frontmatter and DELEGATE usage
5. **Tests WP** - Create comprehensive tests
6. **Examples WP** - Create example MDZ skills using DELEGATE

## Design Decisions

### Frontmatter Structure

Current (to fix):
```yaml
uses:
  - skill-a
```

Proposed:
```yaml
skills:        # Skills this document depends on (was 'uses')
  - skill-a
agents:        # Subagents this document can delegate to
  - general
  - explore
  - architect
```

### DELEGATE Syntax

```mdz
DELEGATE TO $agent:
  - $task: $Task           <!-- Required: the task to perform -->
  - $context = "..."       <!-- Optional: additional context -->

# Or inline for simple cases:
DELEGATE $task TO $agent
```

### Distinction from Execute/Use

- `Execute [[skill]]` - Run a skill reference (composition)
- `DELEGATE TO $agent` - Spawn a subagent with a task (orchestration)

## Hypothesis

By adding explicit DELEGATE syntax:
1. Skills become clearer about their orchestration intentions
2. Tooling can validate agent declarations
3. The distinction between skill composition and agent delegation becomes explicit
4. This aligns with the multi-agent architecture patterns

## Results

_To be filled out as work packages complete_

## Evaluation

_To be filled out upon completion_
