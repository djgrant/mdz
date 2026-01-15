# v0.10 Block Syntax + Context-Aware Highlighting — Master Work Package

## Summary

This initiative combines two related changes:

1. END-delimited block syntax (replacing indentation-based blocks)
2. Two-tier syntax highlighting (TextMate best-effort + LSP semantic tokens)

## Decisions Locked In

- Blocks open at line start with CAPS keywords.
- Blocks must close with matching `END`.
- No colons (`THEN:` → `THEN`, `DO:` → `DO`).
- `FOR EACH` becomes `FOR $x IN $y`.
- Indentation is cosmetic only.
- Optional `DO` after `FOR`/`WHILE`.
- Optional `THEN` after `IF`/`ELSE IF`.
- `DO` supports single-line and multi-line forms.
- TextMate grammar is best-effort; LSP semantic tokens are authoritative.
- Single-line `DO` is only valid at top-level indentation (outside code fences) so the parser can treat it as MDX syntax.

## Examples

Single-line `DO` in prose (top-level only):
```md
DO /summarize findings into a report/
```

Multi-line `DO` block:
```md
DO
  /summarize findings/
  /return a report/
END
```

IF/ELSE blocks with explicit `THEN` and `DO` delimiters:
```md
IF $ready THEN
  /prepare the workspace/
  FOR $item IN $items DO
    /process $item/
  END
ELSE IF $fallback THEN
  /use fallback/
ELSE
  /abort/
END
```

IF/ELSE blocks without `THEN` and `DO` delimiters:
```md
IF $ready
  /prepare the workspace/
  FOR $item IN $items
    /process $item/
  END
ELSE IF $fallback
  /use fallback/
ELSE
  /abort/
END
```

WHILE block with `DO` delimiter:
```md
WHILE $iterations < 5 DO
  /run another iteration/
END
```

WHILE block without `DO` delimiter:
```md
WHILE $iterations < 5
  /run another iteration/
END
```

FOR block with `DO` delimiter:
```md
FOR $task IN $tasks DO
  /execute $task/
END
```

FOR block without `DO` delimiter:
```md
FOR $task IN $tasks
  /execute $task/
END
```

## Invalid Examples

Missing `END`:
```md
IF $ready
  /prepare the workspace/
```

Mismatched block closure:
```md
IF $ready
  /prepare the workspace/
END IF
```

Colon delimiters are invalid:
```md
IF $ready THEN:
  /prepare the workspace/
END
```

Single-line `DO` inside a fence is invalid:

```md
IF $ready
  DO /summarize findings into a report/
END
```

### Highlighting Intent

```md
USE ~/skill/review TO /review $file/
DELEGATE /analyze $file/ TO ~/agent/analyzer WITH
  file: $file
END
```

Expected semantic tokens (LSP source of truth):
- Keywords: `USE`, `TO`, `DELEGATE`, `WITH`, `END`
- Links: `~/skill/review`, `~/agent/analyzer`
- Variables: `$file`
- Semantic markers: `/review $file/`, `/analyze $file/`

## Strategy

- Implement syntax changes in core lexer/parser first.
- Update specs/tests/examples immediately after syntax stabilizes.
- Update TextMate grammar for baseline highlighting.
- Deliver semantic tokens via LSP and wire them into editors.

## Work Packages

- `wp-v0.10-block-syntax.md` — core lexer/parser changes
- `wp-v0.10-tests-examples-spec.md` — specs, tests, and examples
- `wp-v0.10-textmate-grammar.md` — TextMate grammar update
- `wp-v0.10-lsp-semantic-tokens.md` — LSP semantic tokens
- `wp-v0.10-vscode-client.md` — VS Code client integration
- `wp-v0.10-zed-monaco.md` — Zed and Monaco integration
- `wp-v0.10-docs.md` — documentation updates

## Checklist

- [x] Spec documents updated
- [x] Landing page updated
- [x] Documentation updated
- [x] Examples are updated
- [x] TextMate grammar scopes blocks correctly
- [x] LSP provides semantic tokens
- [x] VS Code shows context-aware highlighting
- [x] Zed shows context-aware highlighting
- [x] Playground shows context-aware highlighting
- [x] All tests pass with new syntax


## Migration

This is a breaking syntax change. Since the language hasn't shipped:
- No migration tooling needed
- Update all examples and tests directly
- Bump to v0.10

## Progress Log

### 2026-01-14

- Split master work package into scoped sub-packages
- Completed block syntax, specs/tests/examples, TextMate, LSP, editor integrations, and docs updates
- LSP build and full test suite pass
