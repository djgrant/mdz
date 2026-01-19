/**
 * MDZ Lexer
 * 
 * Tokenizes MDZ source into a stream of tokens.
 * v0.2: Added BREAK, CONTINUE keywords
 * v0.9: Added RETURN, ASYNC, AWAIT keywords; PUSH operator; removed PARALLEL
 */

import { Position, Span, createSpan } from './ast';

// ============================================================================
// Token Types
// ============================================================================

export type TokenType =
  | 'FRONTMATTER_START' | 'FRONTMATTER_END' | 'HEADING'
  | 'HORIZONTAL_RULE' | 'NEWLINE' | 'EOF'
  // Control flow keywords
  | 'FOR' | 'IN' | 'WHILE' | 'DO' | 'IF' | 'THEN' | 'ELSE' | 'END'
  | 'AND' | 'OR' | 'NOT' | 'WITH'
  | 'BREAK'     // v0.2
  | 'CONTINUE'  // v0.2
  | 'DELEGATE'  // v0.3
  | 'TO'        // v0.3
  | 'RETURN'    // v0.9
  | 'ASYNC'     // v0.9
  | 'AWAIT'     // v0.9
  | 'USE'       // v0.8
  | 'EXECUTE'   // v0.8
  | 'GOTO'      // v0.8
  // Literals
  | 'STRING' | 'NUMBER' | 'TRUE' | 'FALSE'
  | 'TEMPLATE_START' | 'TEMPLATE_PART' | 'TEMPLATE_END'
  // Identifiers
  | 'UPPER_IDENT' | 'LOWER_IDENT' | 'DOLLAR_IDENT' | 'TYPE_IDENT'
  // Operators
  | 'ASSIGN' | 'COLON' | 'ARROW' | 'PIPE' | 'DOT' | 'COMMA' | 'SEMICOLON'
  | 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE'
  | 'PUSH'      // v0.9: << operator
  // Brackets
  | 'LPAREN' | 'RPAREN' | 'LBRACKET' | 'RBRACKET' | 'LBRACE' | 'RBRACE'
  // v0.8: Link-based references (replaces sigil-based refs)
  | 'LINK'         // ~/path/to/file or ~/path/to/file#anchor
  | 'ANCHOR'       // #section (same-file reference)
  // Special - inferred variables (v0.5)
  | 'INFERRED_VAR'      // $/name/
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
  private lineStartColumn: number = -1; // Track column where MDZ content starts on each line
  private inCodeBlock: boolean = false; // Track if inside fenced code block
  private inFrontmatter: boolean = false; // Track if inside frontmatter
  private isCurrentLineMdz: boolean = false; // Track if current line started as MDZ statement
  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken();
    }
    
    this.addToken('EOF', '');
    return this.tokens;
  }

  private scanToken(): void {
    // Start of line - handle special constructs
    if (this.column === 0) {
      this.lineStartColumn = -1; // Reset for new line
      // Frontmatter start
      if (this.line === 1 && this.lookAhead('---\n')) {
        this.consumeChars(3);
        this.addToken('FRONTMATTER_START', '---');
        this.consumeNewline();
        this.inFrontmatter = true;
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

      // Code Block
      if (this.lookAhead('```')) {
        this.scanCodeBlock();
        return;
      }

      // Blockquote
      if (this.peek() === '>') {
        this.scanBlockquote();
        return;
      }
    }

    // Track line start: skip leading whitespace, then mark where content starts
    if (this.lineStartColumn === -1) {
      if (this.peek() === ' ' || this.peek() === '\t') {
        this.advance();
        return; // Keep consuming leading whitespace
      } else {
        this.lineStartColumn = this.column; // Mark start of content after indentation
      }
    }

    const char = this.peek();

    // Whitespace (not at line start)
    if (char === ' ' || char === '\t') {
      this.advance();
      return;
    }

    // Newline
    if (char === '\n') {
      this.lineStartColumn = -1; // Reset for next line
      this.isCurrentLineMdz = false; // Reset for next line
      this.consumeNewline();
      return;
    }

    if (char === '\r') {
      this.advance();
      return;
    }

    // Heading (only when followed by space after hashes)
    if (this.column === 0 && char === '#') {
      let offset = 0;
      while (this.peekAt(offset) === '#') {
        offset += 1;
      }
      if (this.peekAt(offset) === ' ') {
        this.scanHeading();
        return;
      }
    }

    // Numbered list handled by scanNumber or fallback to TEXT
    
    // Multi-character operators
    if (this.lookAhead('->') || this.lookAhead('=>')) {
      const op = this.lookAhead('->') ? '->' : '=>';
      this.consumeChars(2);
      this.addToken('ARROW', op);
      return;
    }
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

    // Push operator (v0.9) - must come before single '<'
    if (this.lookAhead('<<')) {
      this.consumeChars(2);
      this.addToken('PUSH', '<<');
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

    // Link reference: ~/path
    if (this.lookAhead('~/')) {
      if (this.scanLink()) return;
    }

    // Anchor reference: #section
    if (char === '#') {
      if (this.scanAnchor()) return;
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

  // Indentation is cosmetic in v0.10; no INDENT/DEDENT tokens.

  private scanFrontmatter(): void {
    while (!this.isAtEnd()) {
      // Check for frontmatter end
      if (this.column === 0 && this.lookAhead('---')) {
        this.consumeChars(3);
        this.addToken('FRONTMATTER_END', '---');
        this.inFrontmatter = false;
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
    this.inCodeBlock = true;
    if (!this.isAtEnd()) this.consumeNewlineRaw();

    let content = '';
    while (!this.isAtEnd()) {
      if (this.column === 0 && this.lookAhead('```')) {
        if (content) this.addToken('CODE_BLOCK_CONTENT', content);
        this.consumeChars(3);
        this.addToken('CODE_BLOCK_END', '```');
        this.inCodeBlock = false;
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

  /**
   * v0.8: Tries to scan a link reference: ~/path/to/file or ~/path/to/file#anchor
   * Assumes current position is at '~' and next char is '/'.
   * Returns true if a link was found and tokenized.
   * 
   * Token value is a JSON object: { path: string[], anchor: string | null }
   */
  private scanLink(): boolean {
    const startPos = this.pos;
    const startColumn = this.column;
    const startLine = this.line;

    this.consumeChars(2); // ~/
    
    const path: string[] = [];
    
    // First segment is required
    let segment = this.scanLinkSegment();
    if (!segment) {
      // No valid path segment - rewind and return false
      this.pos = startPos;
      this.column = startColumn;
      this.line = startLine;
      return false;
    }
    path.push(segment);

    // Additional segments
    while (this.peek() === '/' && this.peekAt(1) !== '\0') {
      // Peek ahead to see if this is another segment or end of link
      const nextChar = this.peekAt(1);
      if (!this.isAlpha(nextChar) && nextChar !== '_') {
        break;
      }
      this.advance(); // /
      segment = this.scanLinkSegment();
      if (!segment) break;
      path.push(segment);
    }

    // Optional anchor: #identifier
    let anchor: string | null = null;
    if (this.peek() === '#') {
      this.advance(); // #
      anchor = this.scanLinkSegment();
      if (!anchor) {
        // Hash without valid identifier - rewind entirely
        this.pos = startPos;
        this.column = startColumn;
        this.line = startLine;
        return false;
      }
    }

    // Build token value as JSON
    const value = JSON.stringify({ path, anchor });
    const rawLength = this.pos - startPos;
    this.addToken('LINK', value, rawLength);
    return true;
  }

  private scanAnchor(): boolean {
    const startPos = this.pos;
    const startColumn = this.column;
    const startLine = this.line;

    this.advance(); // #
    
    const name = this.scanLinkSegment();
    if (!name) {
      // Not a valid anchor identifier - rewind
      this.pos = startPos;
      this.column = startColumn;
      this.line = startLine;
      return false;
    }

    this.addToken('ANCHOR', name, this.pos - startPos);
    return true;
  }

  /**
   * Scans a link segment (kebab-case identifier).
   * Returns the segment or empty string if not valid.
   */
  private scanLinkSegment(): string {
    let segment = '';
    // Must start with alpha or underscore
    if (!this.isAlpha(this.peek()) && this.peek() !== '_') {
      return '';
    }
    while (this.isAlphaNumeric(this.peek()) || this.peek() === '-' || this.peek() === '_') {
      segment += this.advance();
    }
    return segment;
  }

  private scanDollarIdent(): void {
    const isAtLineStart = (this.column) === this.lineStartColumn;
    if (isAtLineStart && !this.inCodeBlock && !this.inFrontmatter) {
      this.isCurrentLineMdz = true;
    }
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
      if (this.lookAhead('\\`')) {
        part += '`';
        this.consumeChars(2);
      } else if (this.lookAhead('\\${')) {
        part += '${';
        this.consumeChars(3);
      } else if (this.lookAhead('${')) {
        if (part) { this.addToken('TEMPLATE_PART', part); part = ''; }
        this.consumeChars(2);
        
        let ident = '';
        while (this.isAlphaNumeric(this.peek()) || this.peek() === '-') {
          ident += this.advance();
        }
        
        if (ident && this.peek() === '}') {
          this.advance();
          this.addToken('DOLLAR_IDENT', '$' + ident);
        } else {
          this.addToken('ERROR', '${' + ident);
        }
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

    // v0.2: Added BREAK, CONTINUE
    // v0.3: Added DO for WHILE...DO syntax, DELEGATE and TO for agent delegation
    // v0.9: Added RETURN, ASYNC, AWAIT; removed PARALLEL
    const keywords: Record<string, TokenType> = {
      'FOR': 'FOR', 'IN': 'IN', 'WHILE': 'WHILE',
      'DO': 'DO',
      'IF': 'IF', 'THEN': 'THEN', 'ELSE': 'ELSE', 'END': 'END',
      'AND': 'AND', 'OR': 'OR', 'NOT': 'NOT', 'WITH': 'WITH',
      'BREAK': 'BREAK',
      'CONTINUE': 'CONTINUE',
      'DELEGATE': 'DELEGATE',
      'TO': 'TO',
      'RETURN': 'RETURN',
      'ASYNC': 'ASYNC',
      'AWAIT': 'AWAIT',
      'USE': 'USE',
      'EXECUTE': 'EXECUTE',
      'GOTO': 'GOTO',
      'true': 'TRUE', 'false': 'FALSE',
    };

    const keywordType = keywords[ident];

    // Phase A: Control-flow statement openers require line start
    // Secondary keywords (IN, THEN, WITH, TO) can appear mid-statement
    const isControlFlowKeyword = ['FOR', 'WHILE', 'DO', 'IF', 'ELSE', 'END', 'BREAK', 'CONTINUE', 'RETURN', 'DELEGATE', 'USE', 'EXECUTE', 'GOTO', 'ASYNC', 'AWAIT'].includes(ident);
    const isSecondaryKeyword = ['IN', 'THEN', 'WITH', 'TO', 'AND', 'OR', 'NOT', 'true', 'false', 'IF', 'DELEGATE', 'DO', 'ELSE'].includes(ident);

    const isAtLineStart = (this.column - ident.length) === this.lineStartColumn;
    const isMdzStatementLine = isAtLineStart && !this.inCodeBlock && !this.inFrontmatter;

    if (keywordType) {
      if (isMdzStatementLine || (this.isCurrentLineMdz && isSecondaryKeyword)) {
        if (isControlFlowKeyword && isMdzStatementLine) {
          this.isCurrentLineMdz = true;
        }
        this.addToken(keywordType, ident);
      } else if (ident[0] >= 'A' && ident[0] <= 'Z') {
        this.addToken('UPPER_IDENT', ident);
      } else {
        this.addToken('LOWER_IDENT', ident);
      }
    } else if (ident[0] >= 'A' && ident[0] <= 'Z') {
      this.addToken('UPPER_IDENT', ident);
    } else {
      this.addToken('LOWER_IDENT', ident);
    }
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
      this.lineStartColumn = -1; // Reset line tracking
      this.isCurrentLineMdz = false; // Reset line tracking
    }
  }
  private isDigit(c: string): boolean { return c >= '0' && c <= '9'; }
  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }
  private isAlphaNumeric(c: string): boolean { return this.isAlpha(c) || this.isDigit(c); }
  
  private addToken(type: TokenType, value: string, length: number = value.length): void {
    const len = length;
    this.tokens.push({
      type, value,
      span: createSpan(this.line, this.column - len, this.pos - len, this.line, this.column, this.pos),
    });
  }
}

export function tokenize(source: string): Token[] {
  return new Lexer(source).tokenize();
}
