# Link-Based References: Lexer Updates

## Goal/Problem

Update the lexer to recognize link-based reference tokens (`~/path`) instead of sigil-based references (`(@`, `(~`, `(#`, `(!`).

## Scope

**File:** `packages/core/src/parser/lexer.ts`

**Lines to modify:**
- Lines 36-39: Token type definitions
- Lines 179-186: Sigil reference detection logic
- Lines 456-514: `tryScanSigilReference()` function

## Approach

### 1. Update Token Types (lines 36-39)

**Remove:**
```typescript
AGENT_REF = 'AGENT_REF',       // (@identifier)
SKILL_REF = 'SKILL_REF',       // (~identifier)  
SECTION_REF = 'SECTION_REF',   // (#identifier)
TOOL_REF = 'TOOL_REF',         // (!identifier)
```

**Add:**
```typescript
LINK = 'LINK',                 // ~/path/to/file or ~/path/to/file#anchor
ANCHOR = 'ANCHOR',             // #section (same-file reference)
```

### 2. Remove Sigil Detection (lines 179-186)

Remove the `(` + sigil lookahead logic that triggered `tryScanSigilReference()`.

### 3. Replace tryScanSigilReference() (lines 456-514)

**Remove:** Entire `tryScanSigilReference()` function

**Add:** `tryScanLink()` function:
```typescript
tryScanLink(): Token | null {
  // Check for ~/ prefix
  if (this.peek() !== '~' || this.peek(1) !== '/') {
    return null;
  }
  
  const start = this.position;
  this.advance(); // consume ~
  this.advance(); // consume /
  
  // Scan path segments: identifier(/identifier)*
  const path = this.scanPath();
  
  // Optional anchor: #identifier
  let anchor: string | null = null;
  if (this.peek() === '#') {
    this.advance();
    anchor = this.scanIdentifier();
  }
  
  return this.makeToken(TokenType.LINK, { path, anchor });
}
```

**Add:** `tryScanAnchor()` function:
```typescript
tryScanAnchor(): Token | null {
  // Check for # followed by identifier start
  if (this.peek() !== '#' || !isIdentifierStart(this.peek(1))) {
    return null;
  }
  
  const start = this.position;
  this.advance(); // consume #
  const name = this.scanIdentifier();
  
  return this.makeToken(TokenType.ANCHOR, name);
}
```

### 4. Update Main Scan Loop

Add calls to `tryScanLink()` and `tryScanAnchor()` in appropriate positions in the main scanning logic.

### 5. Token Value Structure

**LINK token value:**
```typescript
{
  path: string[],     // ['agent', 'architect']
  anchor: string | null // 'section' or null
}
```

**ANCHOR token value:**
```typescript
string  // 'section-name'
```

## Hypothesis

The lexer changes are isolated and straightforward:
1. Simpler token structure (2 tokens vs 4)
2. Path-based detection is unambiguous (`~/`)
3. No special handling for parentheses needed
4. Token carries structured path data for parser

## Results

Implementation complete. Changes made to `packages/core/src/parser/lexer.ts`:

### Token Types (lines 35-37)
- Removed: `AGENT_REF`, `SKILL_REF`, `SECTION_REF`, `TOOL_REF`
- Added: `LINK`, `ANCHOR`

### Detection Logic (lines 177-188)
- Removed: `(` + sigil lookahead for `(@`, `(~`, `(#`, `(!`
- Added: `~` + `/` lookahead for LINK tokens
- Added: `#` + identifier lookahead for ANCHOR tokens (when column > 0)

### Scanning Functions (lines 446-564)
- Removed: `tryScanSigilReference()` function
- Added: `tryScanLink()` - scans `~/path/segments#optional-anchor`
- Added: `scanLinkSegment()` - helper for kebab-case path segments
- Added: `tryScanAnchor()` - scans `#section-name`

### Other Changes
- Removed: `scanHashIdent()` function (was producing `LOWER_IDENT` with `#` prefix)

### Token Value Formats
- LINK: JSON string `{"path":["agent","architect"],"anchor":null}` or `{"path":["skill","work-packages"],"anchor":"apply"}`
- ANCHOR: Plain string `section-name`

### Test Results
```
~/agent/architect -> LINK {"path":["agent","architect"],"anchor":null}
~/skill/work-packages#apply -> LINK {"path":["skill","work-packages"],"anchor":"apply"}
~/single -> LINK {"path":["single"],"anchor":null}
#section (inline) -> ANCHOR "section"
#my-section -> ANCHOR "my-section"
(@agent) -> NOT recognized as AGENT_REF (produces LPAREN, TEXT, LOWER_IDENT, RPAREN)
(~skill) -> NOT recognized as SKILL_REF
~notapath -> NOT recognized as LINK (no slash after tilde)
# at column 0 -> HEADING (not ANCHOR)
```

## Evaluation

The lexer changes are complete and working correctly:
- Link tokens correctly parse path segments and optional anchors
- Anchor tokens work for same-file references
- Old sigil syntax is no longer recognized
- Headings still work correctly (# at column 0)
- The lexer.ts file compiles without errors

Parser errors are expected and will be addressed in a separate work package (parser needs to be updated to handle LINK/ANCHOR tokens instead of the removed sigil-based token types).
