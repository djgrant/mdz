# v0.10 Context-Aware Highlighting - Discovery Master

## Goal

Conduct a discovery round to shake out issues and tighten scope for v0.10 context-aware syntax highlighting before implementation.

## Hypothesis

The work package wp-v0.10-context-aware-highlighting.md contains design decisions that need validation against:
1. Current parser/lexer implementation
2. Spec consistency
3. Edge cases and ambiguities
4. Feasibility in each target (core lexer, playground highlighter, editor extensions)

## Discovery Work Packages

| ID | Work Package | Agent | Status |
|----|--------------|-------|--------|
| D1 | Parser/Lexer Analysis | explore | ✓ completed |
| D2 | Spec Consistency Check | explore | ✓ completed |
| D3 | Edge Case Identification | diverge | ✓ completed |
| D4 | Feasibility Assessment | critique | ✓ completed |

## Results

### D1: Parser/Lexer Analysis

**Current State**:
- Keywords recognized globally anywhere an identifier appears (no position checking)
- Semantic markers use content-based disambiguation (contains space = semantic)
- Numbers recognized globally including in prose contexts
- Lexer tracks: pos, line, column, indentStack

**Gap Analysis**:
- Missing: isLineStart, isAfterIndent, inProgrammaticBlock, expectingSemanticMarker flags
- Architecture tension: lexer is cleanly separated from parser; context tracking blurs this

**Complexity Assessment**:
- Keyword at line start: LOW
- Semantic marker positions: MEDIUM (needs prevToken tracking)
- Numbers in expressions only: MEDIUM
- Programmatic block tracking: MEDIUM-HIGH (lexer doesn't understand structure)

**Key Insight**: Parser already has loopDepth tracking. Better to extend parser pattern than muddy the lexer.

### D2: Spec Consistency Check

**Contradictions Found**:
- None blocking; spec v0.9 already defines keyword placement rule but implementation is incomplete

**Potential Issue**: Semantic markers in general prose (spec line 379 shows `/appropriate location/` in prose context) - v0.10 would NOT recognize these outside programmatic contexts

**Spec Gaps Identified**:
1. No escape mechanism for semantic markers (backticks/quotes proposal fills this)
2. No definition of "programmatic context" vs "prose context"
3. No number context rules
4. List marker constraints missing

**Spec Updates Needed**:
- Structural Rules: add semantic marker position rule, escape sequence rule
- Semantic Markers section: list valid positions, escape mechanisms
- Grammar: add context-sensitive lexing rules

### D3: Edge Cases Identified

**HIGH Severity (5 issues)**:
1. Keywords in quoted strings and code blocks
2. Paths inside semantic markers (`/usr/local/bin/`)
3. Indented keywords in prose paragraphs
4. Slash overloading (division, paths, TCP/IP, semantic markers)
5. DELEGATE without TO creates new ambiguity

**MEDIUM Severity (8 issues)**:
- Numbers in mathematical prose
- Variable names that look like types
- Semantic markers after colons in prose
- List items with prose before keywords
- Template literals with path-like content
- Ambiguous indentation in nested control flow
- WITH in prose vs WITH clause

**Key Insight**: Fundamental tension between syntactic context (highlighter can determine) and semantic context (requires understanding intent). The `/` character is heavily overloaded.

### D4: Feasibility Assessment

**Overall Rating: 2/5 - Scope too broad, fundamental blockers**

| Target | Rating | Assessment |
|--------|--------|------------|
| Core Lexer | 3/5 | Achievable but wrong architectural layer |
| Core Parser | 4/5 | Right place for position validation |
| Playground Monaco | 4/5 | Use lexer tokens, avoid Monarch state machine |
| VS Code TextMate | 1/5 | **IMPOSSIBLE** - TextMate cannot do context-aware |
| Zed Tree-sitter | 2/5 | Requires new tree-sitter-mdz grammar (unscoped) |

**Critical Blocker**: TextMate grammars are line-scoped regex. They have NO CONCEPT of "at line start only" with MDZ indent logic, "inside control flow block", or "after specific preceding token". There is no TextMate fix for this.

**Architecture Concern**: Changing the lexer for context tracking violates clean separation of concerns. Parser is the right layer.

## Evaluation

### What We Learned

1. **VS Code/Zed scope is invalid** - TextMate cannot implement context-aware highlighting; Zed needs a tree-sitter-mdz grammar that doesn't exist
2. **Lexer is wrong layer** - Context rules belong in parser, which already tracks structure
3. **Spec gaps exist** - v0.10 proposes rules not yet in spec (escape sequences, programmatic context definition)
4. **Edge cases are significant** - Slash overloading and path-like content in semantic markers are real problems
5. **Keyword placement is already spec'd** - v0.9 spec defines this; it's just not implemented

### Scope Recommendations

**CUT from v0.10**:
- VS Code TextMate grammar changes (impossible)
- Zed grammar changes (requires unscoped tree-sitter work)
- Lexer context tracking (wrong layer)

**KEEP in v0.10**:
- Parser position-checking logic for keywords
- Parser semantic marker position validation
- Monaco highlighter using lexer tokens (not custom Monarch states)

**DEFER to future**:
- LSP semantic tokens (enables true context-aware in VS Code/Zed)
- tree-sitter-mdz grammar (enables Zed support)
- Programmatic vs prose list item distinction (medium-high complexity)

### Proposed Scope Split

| Work Package | Scope | Effort |
|--------------|-------|--------|
| v0.10a: Parser Position Rules | Parser enforces keyword positions per spec v0.9 | 2-3 days |
| v0.10b: Semantic Marker Rules | Parser validates semantic marker positions, escape sequences | 2-3 days |
| v0.10c: Spec Updates | Document context rules, escape sequences, programmatic context | 1-2 days |
| Future: LSP Semantic Tokens | Enable context-aware highlighting in VS Code/Zed via LSP | 4-5 days |
| Future: tree-sitter-mdz | Create full Tree-sitter grammar for Zed | Multi-week |

## Conclusion

The original v0.10 work package is **too broad and contains impossible targets**. The discovery round revealed:

1. VS Code/Zed editor support cannot be achieved with TextMate grammars
2. The lexer is the wrong layer for context rules
3. Significant edge cases exist around slash overloading
4. Spec updates are needed to formalize the rules

**Recommendation**: Revise v0.10 to focus on parser-level enforcement of keyword/semantic marker rules (which are already in spec v0.9 but not implemented). Defer editor extension improvements to a future LSP semantic tokens work package.

---

## Discovery Round 2: Alternative Approaches

### D5: Alternative Highlighting Approaches (diverge agent)

**Key Finding: LSP Semantic Tokens is the viable path**

Multiple approaches identified, ranked by viability:

| Approach | Effort | Coverage | Verdict |
|----------|--------|----------|---------|
| LSP Semantic Tokens | 3-4 days | VS Code, Zed, Neovim, JetBrains | ✓ RECOMMENDED |
| Monaco Semantic Tokens | 1-2 days | Playground only | ✓ RECOMMENDED for web |
| Tree-sitter Grammar | 2-3 weeks | Zed, Neovim, Helix | Defer to future |
| TextMate Improvements | N/A | VS Code | ✗ IMPOSSIBLE |
| CodeMirror/Lezer | 2-3 weeks | Web only | Not worth migration |

**How LSP Semantic Tokens Work**:
- Server returns array of tokens with position, type, modifiers
- Editor overlays semantic colors ON TOP of TextMate highlighting
- Semantic tokens take precedence - they refine/override grammar-based highlighting
- Full context awareness because server has complete AST

### D6: LSP Semantic Tokens Research (explore agent)

**Current LSP State**:
- `packages/lsp/src/server.ts` (912 lines) already provides:
  - Go-to-definition, hover, autocomplete, diagnostics, document symbols
  - Parses MDZ using @zenmarkdown/core
  - Maintains AST, types, variables, references
- **Missing**: `textDocument/semanticTokens` handler

**VS Code Extension State**:
- Has TextMate grammar
- Has `vscode-languageclient` dependency but UNUSED
- No language client initialization - doesn't connect to LSP!

**What's Needed**:
1. Add `getSemanticTokens()` method to LSP server
2. Create stdio JSON-RPC wrapper for LSP
3. Update VS Code extension with language client initialization
4. Expose semantic tokens in Monaco via existing web worker

**Coverage Confirmation**:
- VS Code: Full semantic token support
- Zed: Supports LSP semantic tokens (late 2023+)
- Monaco: Can use directly from web worker (no full LSP client needed)
- Neovim/JetBrains: Support via LSP

## Revised Recommendation

**The constraint is NOT real** - context-aware highlighting IS achievable via LSP Semantic Tokens.

### Revised Scope for v0.10

| Work Package | Scope | Effort | Targets |
|--------------|-------|--------|---------|
| v0.10a: Parser Position Rules | Parser enforces keyword positions per spec v0.9 | 2-3 days | Core |
| v0.10b: LSP Semantic Tokens | Add semantic tokens provider to LSP server | 2-3 days | LSP |
| v0.10c: VS Code Language Client | Connect extension to LSP, enable semantic tokens | 1-2 days | VS Code |
| v0.10d: Monaco Semantic Tokens | Expose via web worker, apply decorations | 1-2 days | Playground |

**Total**: 7-10 days for full context-aware highlighting in VS Code + Playground

### What This Achieves

After v0.10:
- ✓ Keywords only highlighted at valid positions (line start/indented)
- ✓ Semantic markers only in valid positions
- ✓ Full context awareness via LSP
- ✓ Works in VS Code with semantic token overlay
- ✓ Works in playground via Monaco decorations
- ✓ Extensible to Zed (just add LSP config to extension.toml)

### What This Defers

- Tree-sitter grammar (multi-week effort, nice-to-have for Zed/Neovim native)
- Programmatic vs prose list distinction (can be added to semantic tokens later)
- Number highlighting in expressions only (can be added incrementally)
