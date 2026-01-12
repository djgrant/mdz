/**
 * MDZ Lexer
 * 
 * Tokenizes MDZ source into a stream of tokens.
 * v0.2: Added PARALLEL, BREAK, CONTINUE keywords
 */

import { Position, Span, createSpan } from './ast';

// ============================================================================
// Token Types
// ============================================================================

export type TokenType =
  | 'FRONTMATTER_START' | 'FRONTMATTER_END' | 'HEADING' | 'LIST_MARKER'
  | 'HORIZONTAL_RULE' | 'NEWLINE' | 'INDENT' | 'DEDENT' | 'EOF'
  // Control flow keywords
  | 'FOR' | 'EACH' | 'IN' | 'WHILE' | 'DO' | 'IF' | 'THEN' | 'ELSE'
  | 'AND' | 'OR' | 'NOT' | 'WITH'
  | 'PARALLEL'  // v0.2
  | 'BREAK'     // v0.2
  | 'CONTINUE'  // v0.2
  // Literals
  | 'STRING' | 'NUMBER' | 'TRUE' | 'FALSE'
  | 'TEMPLATE_START' | 'TEMPLATE_PART' | 'TEMPLATE_END'
  // Identifiers
  | 'UPPER_IDENT' | 'LOWER_IDENT' | 'DOLLAR_IDENT' | 'TYPE_IDENT'
  // Operators
  | 'ASSIGN' | 'COLON' | 'ARROW' | 'PIPE' | 'DOT' | 'COMMA' | 'SEMICOLON'
  | 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  // Brackets
  | 'LPAREN' | 'RPAREN' | 'LBRACKET' | 'RBRACKET' | 'LBRACE' | 'RBRACE'
  | 'DOUBLE_LBRACKET' | 'DOUBLE_RBRACKET'
  // Special - semantic markers (v0.4: new /content/ syntax)
  | 'SEMANTIC_MARKER'   // /content with spaces/
  | 'INFERRED_VAR'      // $/name/
  // Legacy semantic markers (deprecated, kept for backward compatibility)
  | 'SEMANTIC_OPEN' | 'SEMANTIC_CLOSE' | 'SEMANTIC_CONTENT'
  | 'TEXT' | 'CODE_BLOCK_START' | 'CODE_BLOCK_CONTENT' | 'CODE_BLOCK_END'
  | 'BLOCKQUOTE' | 'ERROR';

export interface Token {
  type: TokenType;
  value: string;
  span: Span;
}

// ============================================================================
// Lexer
// ============================================================================

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 0;
  private tokens: Token[] = [];
  private indentStack: number[] = [0];

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.addToken('DEDENT', '');
    }
    
    this.addToken('EOF', '');
    return this.tokens;
  }

  private scanToken(): void {
    // Start of line - handle special constructs
    if (this.column === 0) {
      // Frontmatter start
      if (this.line === 1 && this.lookAhead('---\n')) {
        this.consumeChars(3);
        this.addToken('FRONTMATTER_START', '---');
        this.consumeNewline();
        this.scanFrontmatter();
        return;
      }

      // Horizontal rule
      if (this.lookAhead('---\n') || (this.lookAhead('---') && this.pos + 3 >= this.source.length)) {
        this.consumeChars(3);
        this.addToken('HORIZONTAL_RULE', '---');
        if (!this.isAtEnd()) this.consumeNewline();
        return;
      }

      // Handle indentation
      this.handleIndent();
    }

    const char = this.peek();

    // Whitespace (not at line start)
    if (char === ' ' || char === '\t') {
      this.advance();
      return;
    }

    // Newline
    if (char === '\n') {
      this.consumeNewline();
      return;
    }

    if (char === '\r') {
      this.advance();
      return;
    }

    // Heading
    if (this.column === 0 && char === '#') {
      this.scanHeading();
      return;
    }

    // List marker
    if (char === '-' && this.peekAt(1) === ' ') {
      this.advance();
      this.advance();
      this.addToken('LIST_MARKER', '- ');
      return;
    }

    // Numbered list
    if (this.isDigit(char) && this.peekAt(1) === '.' && this.peekAt(2) === ' ') {
      const num = this.advance();
      this.advance();
      this.advance();
      this.addToken('LIST_MARKER', num + '. ');
      return;
    }

    // Code block
    if (this.column === 0 && this.lookAhead('```')) {
      this.scanCodeBlock();
      return;
    }

    // Blockquote
    if (this.column === 0 && char === '>') {
      this.scanBlockquote();
      return;
    }

    // Legacy semantic marker (deprecated)
    if (this.lookAhead('{~~')) {
      this.consumeChars(3);
      this.addToken('SEMANTIC_OPEN', '{~~');
      this.scanSemanticContent();
      return;
    }

    // New semantic marker: /content with spaces/
    // Disambiguation: if content contains spaces, it's a semantic marker
    // Otherwise it's likely a path (e.g., /path/to/file) - not tokenized as semantic
    if (char === '/') {
      const result = this.tryScanSemanticMarker();
      if (result) return;
      // Not a semantic marker - fall through to emit as TEXT
    }

    // Double brackets
    if (this.lookAhead('[[')) {
      this.consumeChars(2);
      this.addToken('DOUBLE_LBRACKET', '[[');
      return;
    }
    if (this.lookAhead(']]')) {
      this.consumeChars(2);
      this.addToken('DOUBLE_RBRACKET', ']]');
      return;
    }

    // Arrow
    if (this.lookAhead('=>')) {
      this.consumeChars(2);
      this.addToken('ARROW', '=>');
      return;
    }

    // Comparison operators
    if (this.lookAhead('!=')) {
      this.consumeChars(2);
      this.addToken('NEQ', '!=');
      return;
    }
    if (this.lookAhead('<=')) {
      this.consumeChars(2);
      this.addToken('LTE', '<=');
      return;
    }
    if (this.lookAhead('>=')) {
      this.consumeChars(2);
      this.addToken('GTE', '>=');
      return;
    }

    // Single character operators
    const singleOps: Record<string, TokenType> = {
      '=': 'ASSIGN', ':': 'COLON', '|': 'PIPE', '.': 'DOT',
      ',': 'COMMA', ';': 'SEMICOLON', '<': 'LT', '>': 'GT',
      '(': 'LPAREN', ')': 'RPAREN', '[': 'LBRACKET', ']': 'RBRACKET',
      '{': 'LBRACE', '}': 'RBRACE',
    };
    
    if (singleOps[char]) {
      this.advance();
      this.addToken(singleOps[char], char);
      return;
    }

    // Dollar identifier
    if (char === '$') {
      this.scanDollarIdent();
      return;
    }

    // Hash (section ref start)
    if (char === '#') {
      this.scanHashIdent();
      return;
    }

    // String literal
    if (char === '"') {
      this.scanString();
      return;
    }

    // Template literal
    if (char === '`') {
      this.scanTemplate();
      return;
    }

    // Number
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peekAt(1)))) {
      this.scanNumber();
      return;
    }

    // Keywords and identifiers
    if (this.isAlpha(char)) {
      this.scanIdentOrKeyword();
      return;
    }

    // Unknown - emit as text and advance
    this.advance();
    this.addToken('TEXT', char);
  }

  private handleIndent(): void {
    let indent = 0;
    while (this.peek() === ' ') {
      indent++;
      this.advance();
    }
    while (this.peek() === '\t') {
      indent += 2;
      this.advance();
    }

    // Empty line - don't change indent
    if (this.peek() === '\n' || this.isAtEnd()) {
      return;
    }

    const current = this.indentStack[this.indentStack.length - 1];
    if (indent > current) {
      this.indentStack.push(indent);
      this.addToken('INDENT', ' '.repeat(indent - current));
    } else if (indent < current) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop();
        this.addToken('DEDENT', '');
      }
    }
  }

  private scanFrontmatter(): void {
    while (!this.isAtEnd()) {
      // Check for frontmatter end
      if (this.column === 0 && this.lookAhead('---')) {
        this.consumeChars(3);
        this.addToken('FRONTMATTER_END', '---');
        if (!this.isAtEnd() && this.peek() === '\n') {
          this.consumeNewline();
        }
        return;
      }

      // Scan line as text
      let text = '';
      while (!this.isAtEnd() && this.peek() !== '\n') {
        text += this.advance();
      }
      if (text) {
        this.addToken('TEXT', text);
      }
      if (!this.isAtEnd()) {
        this.consumeNewline();
      }
    }
  }

  private scanHeading(): void {
    let level = 0;
    while (this.peek() === '#') {
      level++;
      this.advance();
    }
    if (this.peek() === ' ') this.advance();

    let title = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      title += this.advance();
    }
    
    this.addToken('HEADING', '#'.repeat(level) + ' ' + title);
    if (!this.isAtEnd()) this.consumeNewline();
  }

  private scanCodeBlock(): void {
    this.consumeChars(3);
    let lang = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      lang += this.advance();
    }
    this.addToken('CODE_BLOCK_START', '```' + lang);
    if (!this.isAtEnd()) this.consumeNewlineRaw();

    let content = '';
    while (!this.isAtEnd()) {
      if (this.column === 0 && this.lookAhead('```')) {
        if (content) this.addToken('CODE_BLOCK_CONTENT', content);
        this.consumeChars(3);
        this.addToken('CODE_BLOCK_END', '```');
        if (!this.isAtEnd() && this.peek() === '\n') this.consumeNewlineRaw();
        return;
      }
      if (this.peek() === '\n') {
        content += '\n';
        this.consumeNewlineRaw();
      } else {
        content += this.advance();
      }
    }
    if (content) this.addToken('CODE_BLOCK_CONTENT', content);
  }

  private scanBlockquote(): void {
    this.advance(); // >
    let content = '';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      content += this.advance();
    }
    this.addToken('BLOCKQUOTE', '>' + content);
    if (!this.isAtEnd()) this.consumeNewline();
  }

  private scanSemanticContent(): void {
    let content = '';
    while (!this.isAtEnd() && this.peek() !== '}' && this.peek() !== '\n') {
      content += this.advance();
    }
    if (content) this.addToken('SEMANTIC_CONTENT', content);
    if (this.peek() === '}') {
      this.advance();
      this.addToken('SEMANTIC_CLOSE', '}');
    }
  }

  /**
   * Peeks ahead to check if current position starts a semantic marker.
   * Assumes current position is at '/'.
   * 
   * Disambiguation heuristic:
   * - If content between slashes contains a space, it's a semantic marker
   * - Otherwise it's likely a path (e.g., /path/to/file) and we don't tokenize it
   * 
   * @param stopChar - Additional character to stop lookahead at (for templates, use '`')
   */
  private tryPeekSemanticMarker(stopChar?: string): boolean {
    let lookahead = 1;
    let hasSpace = false;
    
    while (this.pos + lookahead < this.source.length) {
      const c = this.source[this.pos + lookahead];
      if (c === '/') {
        // Found closing slash - it's semantic only if has space
        return hasSpace;
      }
      if (c === '\n' || (stopChar && c === stopChar)) {
        // No closing slash on this line - not a semantic marker
        return false;
      }
      if (c === ' ') {
        hasSpace = true;
      }
      lookahead++;
    }
    
    // Reached end of file without finding closing slash
    return false;
  }

  /**
   * Scans and tokenizes a semantic marker: /content with spaces/
   * Assumes current position is at '/' and that tryPeekSemanticMarker returned true.
   */
  private scanSemanticMarkerContent(): void {
    this.advance(); // opening /
    let content = '';
    while (!this.isAtEnd() && this.peek() !== '/') {
      content += this.advance();
    }
    if (this.peek() === '/') {
      this.advance(); // closing /
    }
    this.addToken('SEMANTIC_MARKER', '/' + content + '/');
  }

  /**
   * Tries to scan a semantic marker: /content with spaces/
   * Returns true if a semantic marker was found and tokenized.
   */
  private tryScanSemanticMarker(): boolean {
    if (this.tryPeekSemanticMarker()) {
      this.scanSemanticMarkerContent();
      return true;
    }
    return false;
  }

  private scanDollarIdent(): void {
    this.advance(); // $
    
    // Check for inferred variable: $/name/
    if (this.peek() === '/') {
      this.advance(); // /
      let content = '';
      while (!this.isAtEnd() && this.peek() !== '/' && this.peek() !== '\n') {
        content += this.advance();
      }
      if (this.peek() === '/') {
        this.advance(); // closing /
        this.addToken('INFERRED_VAR', '$/' + content + '/');
        return;
      }
      // No closing slash - emit as error
      this.addToken('ERROR', '$/' + content);
      return;
    }
    
    // Standard dollar identifier: $name or $Type
    let ident = '';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-') {
      ident += this.advance();
    }
    if (!ident) {
      this.addToken('ERROR', '$');
      return;
    }
    const type = ident[0] >= 'A' && ident[0] <= 'Z' ? 'TYPE_IDENT' : 'DOLLAR_IDENT';
    this.addToken(type, '$' + ident);
  }

  private scanHashIdent(): void {
    this.advance(); // #
    let ident = '';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-') {
      ident += this.advance();
    }
    this.addToken('LOWER_IDENT', '#' + ident);
  }

  private scanString(): void {
    this.advance(); // "
    let value = '';
    while (!this.isAtEnd() && this.peek() !== '"' && this.peek() !== '\n') {
      if (this.peek() === '\\') {
        this.advance();
        const c = this.advance();
        switch (c) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '"': value += '"'; break;
          case '\\': value += '\\'; break;
          default: value += c;
        }
      } else {
        value += this.advance();
      }
    }
    if (this.peek() === '"') {
      this.advance();
      this.addToken('STRING', value);
    } else {
      this.addToken('ERROR', '"' + value);
    }
  }

  private scanTemplate(): void {
    this.advance(); // `
    this.addToken('TEMPLATE_START', '`');
    
    let part = '';
    while (!this.isAtEnd() && this.peek() !== '`') {
      if (this.lookAhead('${')) {
        if (part) { this.addToken('TEMPLATE_PART', part); part = ''; }
        this.consumeChars(2);
        let expr = '';
        let depth = 1;
        while (!this.isAtEnd() && depth > 0) {
          if (this.peek() === '{') depth++;
          if (this.peek() === '}') depth--;
          if (depth > 0) expr += this.advance();
        }
        if (this.peek() === '}') this.advance();
        this.addToken('DOLLAR_IDENT', expr);
      } else if (this.lookAhead('$/')) {
        // Inferred variable in template: $/name/
        if (part) { this.addToken('TEMPLATE_PART', part); part = ''; }
        this.advance(); // $
        this.advance(); // /
        let content = '';
        while (!this.isAtEnd() && this.peek() !== '/' && this.peek() !== '\n' && this.peek() !== '`') {
          content += this.advance();
        }
        if (this.peek() === '/') {
          this.advance();
          this.addToken('INFERRED_VAR', '$/' + content + '/');
        } else {
          this.addToken('ERROR', '$/' + content);
        }
      } else if (this.lookAhead('{~~')) {
        // Legacy semantic marker in template
        if (part) { this.addToken('TEMPLATE_PART', part); part = ''; }
        this.consumeChars(3);
        this.addToken('SEMANTIC_OPEN', '{~~');
        this.scanSemanticContent();
      } else if (this.peek() === '/' && this.tryPeekSemanticMarker('`')) {
        // New semantic marker in template: /content with spaces/
        if (part) { this.addToken('TEMPLATE_PART', part); part = ''; }
        this.scanSemanticMarkerContent();
      } else {
        part += this.advance();
      }
    }
    if (part) this.addToken('TEMPLATE_PART', part);
    if (this.peek() === '`') {
      this.advance();
      this.addToken('TEMPLATE_END', '`');
    }
  }

  private scanNumber(): void {
    let num = '';
    if (this.peek() === '-') num += this.advance();
    while (this.isDigit(this.peek())) num += this.advance();
    if (this.peek() === '.' && this.isDigit(this.peekAt(1))) {
      num += this.advance();
      while (this.isDigit(this.peek())) num += this.advance();
    }
    this.addToken('NUMBER', num);
  }

  private scanIdentOrKeyword(): void {
    let ident = '';
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-') {
      ident += this.advance();
    }

    // v0.2: Added PARALLEL, BREAK, CONTINUE
    // v0.3: Added DO for WHILE...DO syntax
    const keywords: Record<string, TokenType> = {
      'FOR': 'FOR', 'EACH': 'EACH', 'IN': 'IN', 'WHILE': 'WHILE',
      'DO': 'DO',
      'IF': 'IF', 'THEN': 'THEN', 'ELSE': 'ELSE',
      'AND': 'AND', 'OR': 'OR', 'NOT': 'NOT', 'WITH': 'WITH',
      'PARALLEL': 'PARALLEL',
      'BREAK': 'BREAK',
      'CONTINUE': 'CONTINUE',
      'true': 'TRUE', 'false': 'FALSE',
    };

    const type = keywords[ident] || 
      (ident[0] >= 'A' && ident[0] <= 'Z' ? 'UPPER_IDENT' : 'LOWER_IDENT');
    this.addToken(type, ident);
  }

  // Helpers
  private isAtEnd(): boolean { return this.pos >= this.source.length; }
  private peek(): string { return this.isAtEnd() ? '\0' : this.source[this.pos]; }
  private peekAt(offset: number): string {
    return this.pos + offset >= this.source.length ? '\0' : this.source[this.pos + offset];
  }
  private advance(): string {
    const char = this.source[this.pos++];
    this.column++;
    return char;
  }
  private lookAhead(s: string): boolean {
    return this.source.slice(this.pos, this.pos + s.length) === s;
  }
  private consumeChars(n: number): void {
    for (let i = 0; i < n; i++) this.advance();
  }
  private consumeNewline(): void {
    if (this.peek() === '\n') {
      this.pos++;
      this.line++;
      this.column = 0;
      this.addToken('NEWLINE', '\n');
    }
  }
  private consumeNewlineRaw(): void {
    if (this.peek() === '\n') {
      this.pos++;
      this.line++;
      this.column = 0;
    }
  }
  private isDigit(c: string): boolean { return c >= '0' && c <= '9'; }
  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }
  private isAlphaNumeric(c: string): boolean { return this.isAlpha(c) || this.isDigit(c); }
  
  private addToken(type: TokenType, value: string): void {
    const len = value.length;
    this.tokens.push({
      type, value,
      span: createSpan(this.line, this.column - len, this.pos - len, this.line, this.column, this.pos),
    });
  }
}

export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize();
}
