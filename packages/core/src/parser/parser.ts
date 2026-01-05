/**
 * MDZ Parser
 * 
 * Recursive descent parser for MDZ documents.
 * v0.2: Added PARALLEL FOR EACH, BREAK, CONTINUE, typed parameters
 */

import { Token, TokenType, tokenize } from './lexer';
import * as AST from './ast';

// ============================================================================
// Parser
// ============================================================================

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private errors: AST.ParseError[] = [];
  private frontmatterContent: string = '';
  private loopDepth: number = 0;  // v0.2: Track if we're inside a loop

  constructor(private source: string) {}

  parse(): AST.Document {
    this.tokens = tokenize(this.source);
    this.pos = 0;
    this.errors = [];
    this.loopDepth = 0;

    const frontmatter = this.parseFrontmatter();
    const sections = this.parseSections();

    const span = this.tokens.length > 0 
      ? AST.mergeSpans(
          this.tokens[0].span,
          this.tokens[this.tokens.length - 1].span
        )
      : AST.createSpan(1, 0, 0, 1, 0, 0);

    return {
      kind: 'Document',
      frontmatter,
      sections,
      errors: this.errors,
      span,
    };
  }

  // ==========================================================================
  // Frontmatter
  // ==========================================================================

  private parseFrontmatter(): AST.Frontmatter | null {
    if (!this.check('FRONTMATTER_START')) {
      return null;
    }

    const start = this.advance();
    let content = '';

    while (!this.check('FRONTMATTER_END') && !this.isAtEnd()) {
      const token = this.advance();
      if (token.type === 'TEXT') {
        content += token.value + '\n';
      }
    }

    if (!this.check('FRONTMATTER_END')) {
      this.error('E013', 'Unclosed frontmatter');
      return null;
    }

    const end = this.advance();
    this.frontmatterContent = content;

    const parsed = this.parseYaml(content);

    return {
      kind: 'Frontmatter',
      name: parsed.name || '',
      description: parsed.description || '',
      uses: parsed.uses || [],
      imports: this.parseImports(parsed.imports),
      raw: parsed,
      span: AST.mergeSpans(start.span, end.span),
    };
  }

  private parseYaml(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split('\n');
    let currentKey = '';
    let inArray = false;
    let inImports = false;
    let currentImport: any = null;

    for (const line of lines) {
      const kvMatch = line.match(/^(\w+):\s*(.*)$/);
      if (kvMatch) {
        currentKey = kvMatch[1];
        const value = kvMatch[2].trim();
        if (value) {
          result[currentKey] = value;
          inArray = false;
          inImports = false;
        } else {
          result[currentKey] = [];
          inArray = true;
          inImports = currentKey === 'imports';
        }
        continue;
      }

      // v0.2: Handle imports array with objects
      if (inImports) {
        const pathMatch = line.match(/^\s+-\s+path:\s*(.+)$/);
        if (pathMatch) {
          if (currentImport) {
            result[currentKey].push(currentImport);
          }
          currentImport = { path: pathMatch[1].trim().replace(/^["']|["']$/g, '') };
          continue;
        }
        
        const skillsMatch = line.match(/^\s+skills:\s*\[([^\]]*)\]$/);
        if (skillsMatch && currentImport) {
          currentImport.skills = skillsMatch[1] ? skillsMatch[1].split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, '')).filter(s => s) : [];
          continue;
        }
        
        const aliasKeyMatch = line.match(/^\s+alias:\s*$/);
        if (aliasKeyMatch && currentImport) {
          currentImport.alias = {};
          continue;
        }
        
        const aliasEntryMatch = line.match(/^\s+([a-z-]+):\s*(.+)$/);
        if (aliasEntryMatch && currentImport && currentImport.alias !== undefined) {
          currentImport.alias[aliasEntryMatch[1]] = aliasEntryMatch[2].trim();
          continue;
        }
      }

      const arrayMatch = line.match(/^\s+-\s+(.+)$/);
      if (arrayMatch && inArray && Array.isArray(result[currentKey]) && !inImports) {
        result[currentKey].push(arrayMatch[1]);
      }
    }

    // Push last import if exists
    if (inImports && currentImport) {
      result[currentKey].push(currentImport);
    }

    return result;
  }

  // v0.2: Parse import declarations from frontmatter
  private parseImports(importsData: any[]): AST.ImportDeclaration[] {
    if (!importsData || !Array.isArray(importsData)) {
      return [];
    }

    return importsData.map(imp => ({
      kind: 'ImportDeclaration' as const,
      path: imp.path || '',
      skills: imp.skills || [],
      aliases: new Map(Object.entries(imp.alias || {})),
      span: AST.createSpan(1, 0, 0, 1, 0, 0),
    }));
  }

  // ==========================================================================
  // Sections
  // ==========================================================================

  private parseSections(): AST.Section[] {
    const sections: AST.Section[] = [];

    while (!this.isAtEnd()) {
      this.skipNewlines();
      
      if (this.check('HEADING')) {
        sections.push(this.parseSection());
      } else if (!this.isAtEnd()) {
        const content = this.parseBlocks();
        if (content.length > 0) {
          const span = content[0].span;
          sections.push({
            kind: 'Section',
            level: 0,
            title: '',
            anchor: '',
            content,
            span,
          });
        }
      }
    }

    return sections;
  }

  private parseSection(): AST.Section {
    const headingToken = this.advance();
    const headingMatch = headingToken.value.match(/^(#+)\s+(.+)$/);
    
    if (!headingMatch) {
      this.error('E015', 'Invalid heading format');
      return this.createErrorSection(headingToken);
    }

    const level = headingMatch[1].length;
    const title = headingMatch[2];
    const anchor = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    this.skipNewlines();
    const content = this.parseBlocks();

    const span = content.length > 0
      ? AST.mergeSpans(headingToken.span, content[content.length - 1].span)
      : headingToken.span;

    return {
      kind: 'Section',
      level,
      title,
      anchor,
      content,
      span,
    };
  }

  private createErrorSection(token: Token): AST.Section {
    return {
      kind: 'Section',
      level: 1,
      title: 'Error',
      anchor: 'error',
      content: [],
      span: token.span,
    };
  }

  // ==========================================================================
  // Blocks
  // ==========================================================================

  private parseBlocks(): AST.Block[] {
    const blocks: AST.Block[] = [];

    while (!this.isAtEnd() && !this.check('HEADING')) {
      this.skipNewlines();
      
      if (this.isAtEnd() || this.check('HEADING')) break;

      const block = this.parseBlock();
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  private parseBlock(): AST.Block | null {
    // Type definition: $TypeName: ...
    if (this.check('TYPE_IDENT')) {
      const lookahead = this.peek(1);
      if (lookahead?.type === 'COLON') {
        // Check if it's a type definition (not a variable with type annotation)
        // Type def: $Type: semantic description OR $Type: "enum" | "values"
        // Var decl: $Type: $OtherType = ... (colon followed by TYPE_IDENT)
        const afterColon = this.peek(2);
        if (afterColon?.type !== 'TYPE_IDENT') {
          return this.parseTypeDefinition();
        }
      }
    }

    // Variable declaration
    if (this.check('LIST_MARKER')) {
      return this.parseListItem();
    }

    if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
      return this.parseVariableOrType();
    }

    // v0.2: PARALLEL FOR EACH
    if (this.check('PARALLEL')) {
      return this.parseParallelForEach();
    }

    // Control flow
    if (this.check('FOR')) {
      return this.parseForEach();
    }

    if (this.check('WHILE')) {
      return this.parseWhile();
    }

    if (this.check('IF')) {
      return this.parseIf();
    }

    // v0.2: BREAK
    if (this.check('BREAK')) {
      return this.parseBreak();
    }

    // v0.2: CONTINUE
    if (this.check('CONTINUE')) {
      return this.parseContinue();
    }

    // Code block
    if (this.check('CODE_BLOCK_START')) {
      return this.parseCodeBlock();
    }

    // Horizontal rule
    if (this.check('HORIZONTAL_RULE')) {
      return this.parseHorizontalRule();
    }

    // Blockquote
    if (this.check('BLOCKQUOTE')) {
      return this.parseBlockquote();
    }

    // Delegation
    if (this.check('LOWER_IDENT') || this.check('UPPER_IDENT')) {
      const verb = this.current().value.toLowerCase();
      if (verb === 'execute' || verb === 'call' || verb === 'run' || verb === 'invoke' || verb === 'delegate' || verb === 'use') {
        const lookahead = this.peek(1);
        if (lookahead?.type === 'DOUBLE_LBRACKET') {
          return this.parseDelegation();
        }
      }
    }

    // Default: paragraph
    if (!this.isAtEnd() && !this.check('HEADING') && !this.check('NEWLINE')) {
      return this.parseParagraph();
    }

    if (!this.isAtEnd()) {
      this.advance();
    }
    
    return null;
  }

  // ==========================================================================
  // Type Definitions
  // ==========================================================================

  private parseTypeDefinition(): AST.TypeDefinition {
    const nameToken = this.advance();
    const name = nameToken.value.slice(1);
    
    this.expect('COLON');
    
    const typeExpr = this.parseTypeExpr();

    return {
      kind: 'TypeDefinition',
      name,
      typeExpr,
      span: AST.mergeSpans(nameToken.span, typeExpr.span),
    };
  }

  private parseTypeExpr(): AST.TypeExpr {
    const start = this.current();

    if (this.check('STRING')) {
      return this.parseEnumType();
    }

    if (this.check('LPAREN')) {
      return this.parseCompoundType();
    }

    if (this.check('TYPE_IDENT')) {
      const token = this.advance();
      const typeRef: AST.TypeReference = {
        kind: 'TypeReference',
        name: token.value.slice(1),
        span: token.span,
      };

      if (this.check('LBRACKET')) {
        this.advance();
        this.expect('RBRACKET');
        return {
          kind: 'ArrayType',
          elementType: typeRef,
          span: AST.mergeSpans(token.span, this.previous().span),
        };
      }

      return typeRef;
    }

    return this.parseSemanticTypeDefinition();
  }

  private parseEnumType(): AST.EnumType {
    const values: string[] = [];
    const start = this.current();

    while (this.check('STRING')) {
      const token = this.advance();
      values.push(token.value);
      
      if (this.check('PIPE')) {
        this.advance();
      } else {
        break;
      }
    }

    return {
      kind: 'EnumType',
      values,
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  private parseCompoundType(): AST.CompoundType {
    const start = this.advance();
    const elements: AST.TypeExpr[] = [];

    while (!this.check('RPAREN') && !this.isAtEnd()) {
      elements.push(this.parseTypeExpr());
      if (this.check('COMMA')) {
        this.advance();
      }
    }

    const end = this.expect('RPAREN');

    let result: AST.CompoundType = {
      kind: 'CompoundType',
      elements,
      span: AST.mergeSpans(start.span, end?.span || this.previous().span),
    };

    if (this.check('LBRACKET')) {
      this.advance();
      this.expect('RBRACKET');
      return {
        kind: 'ArrayType',
        elementType: result,
        span: AST.mergeSpans(start.span, this.previous().span),
      } as any;
    }

    return result;
  }

  private parseSemanticTypeDefinition(): AST.SemanticType {
    let description = '';
    const start = this.current();

    while (!this.check('NEWLINE') && !this.isAtEnd()) {
      const token = this.advance();
      if (description) description += ' ';
      description += token.value;
    }

    return {
      kind: 'SemanticType',
      description: description.trim(),
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  // ==========================================================================
  // Variables
  // ==========================================================================

  private parseVariableOrType(): AST.VariableDeclaration | AST.TypeDefinition {
    if (this.check('TYPE_IDENT')) {
      const lookahead = this.peek(1);
      if (lookahead?.type === 'COLON') {
        // Check if it's a type definition (not a variable with type annotation)
        const afterColon = this.peek(2);
        if (afterColon?.type !== 'TYPE_IDENT') {
          return this.parseTypeDefinition();
        }
      }
    }

    return this.parseVariableDeclaration();
  }

  private parseVariableDeclaration(inWithClause: boolean = false): AST.VariableDeclaration {
    const nameToken = this.advance();
    const name = nameToken.value.slice(1);

    let typeAnnotation: AST.TypeReference | null = null;
    let isRequired = false;

    if (this.check('COLON')) {
      this.advance();
      if (this.check('TYPE_IDENT')) {
        const typeToken = this.advance();
        typeAnnotation = {
          kind: 'TypeReference',
          name: typeToken.value.slice(1),
          span: typeToken.span,
        };
      }
    }

    let value: AST.Expression | null = null;
    let isLambda = false;

    if (this.check('ASSIGN')) {
      this.advance();
      
      if (this.check('DOLLAR_IDENT') || this.check('LPAREN')) {
        const afterParams = this.findArrow();
        if (afterParams) {
          isLambda = true;
          value = this.parseLambdaExpression();
        } else {
          value = this.parseExpression();
        }
      } else {
        value = this.parseExpression();
      }
    } else if (inWithClause && typeAnnotation) {
      // v0.2: In WITH clause, typed param without value is required
      isRequired = true;
    }

    return {
      kind: 'VariableDeclaration',
      name,
      typeAnnotation,
      value,
      isLambda,
      isRequired,
      span: AST.mergeSpans(nameToken.span, value?.span || typeAnnotation?.span || nameToken.span),
    };
  }

  private findArrow(): boolean {
    let i = 0;
    let depth = 0;
    while (i < 10) {
      const token = this.peek(i);
      if (!token) return false;
      if (token.type === 'LPAREN') depth++;
      if (token.type === 'RPAREN') depth--;
      if (token.type === 'ARROW' && depth === 0) return true;
      if (token.type === 'NEWLINE') return false;
      i++;
    }
    return false;
  }

  private parseListItem(): AST.Block {
    this.advance();  // consume LIST_MARKER

    // Variable declaration
    if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
      return this.parseVariableDeclaration();
    }

    // v0.2: Control flow inside list items
    if (this.check('PARALLEL')) {
      return this.parseParallelForEach();
    }

    if (this.check('FOR')) {
      return this.parseForEach();
    }

    if (this.check('WHILE')) {
      return this.parseWhile();
    }

    if (this.check('IF')) {
      return this.parseIf();
    }

    if (this.check('BREAK')) {
      return this.parseBreak();
    }

    if (this.check('CONTINUE')) {
      return this.parseContinue();
    }

    return this.parseParagraph();
  }

  // ==========================================================================
  // Expressions
  // ==========================================================================

  private parseExpression(): AST.Expression {
    return this.parseOr();
  }

  private parseOr(): AST.Expression {
    let left = this.parseAnd();

    while (this.check('OR')) {
      this.advance();
      const right = this.parseAnd();
      left = {
        kind: 'BinaryExpression',
        operator: 'OR',
        left,
        right,
        span: AST.mergeSpans(left.span, right.span),
      };
    }

    return left;
  }

  private parseAnd(): AST.Expression {
    let left = this.parseComparison();

    while (this.check('AND')) {
      this.advance();
      const right = this.parseComparison();
      left = {
        kind: 'BinaryExpression',
        operator: 'AND',
        left,
        right,
        span: AST.mergeSpans(left.span, right.span),
      };
    }

    return left;
  }

  private parseComparison(): AST.Expression {
    let left = this.parsePrimary();

    const compOps: TokenType[] = ['ASSIGN', 'NEQ', 'LT', 'GT', 'LTE', 'GTE'];
    while (compOps.some(op => this.check(op))) {
      const opToken = this.advance();
      const op = this.tokenToOperator(opToken.type);
      const right = this.parsePrimary();
      left = {
        kind: 'BinaryExpression',
        operator: op,
        left,
        right,
        span: AST.mergeSpans(left.span, right.span),
      };
    }

    return left;
  }

  private tokenToOperator(type: TokenType): AST.BinaryOperator {
    switch (type) {
      case 'ASSIGN': return '=';
      case 'NEQ': return '!=';
      case 'LT': return '<';
      case 'GT': return '>';
      case 'LTE': return '<=';
      case 'GTE': return '>=';
      default: return '=';
    }
  }

  private parsePrimary(): AST.Expression {
    const token = this.current();

    if ((this.check('DOLLAR_IDENT') || this.check('LPAREN')) && this.findArrow()) {
      return this.parseLambdaExpression();
    }

    if (this.check('NOT')) {
      const notToken = this.advance();
      const operand = this.parsePrimary();
      return {
        kind: 'UnaryExpression',
        operator: 'NOT',
        operand,
        span: AST.mergeSpans(notToken.span, operand.span),
      };
    }

    if (this.check('LPAREN')) {
      this.advance();
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }

    if (this.check('STRING')) {
      const stringToken = this.advance();
      return { kind: 'StringLiteral', value: stringToken.value, span: stringToken.span };
    }

    if (this.check('NUMBER')) {
      const numToken = this.advance();
      return { kind: 'NumberLiteral', value: parseFloat(numToken.value), span: numToken.span };
    }

    if (this.check('TRUE')) {
      const boolToken = this.advance();
      return { kind: 'BooleanLiteral', value: true, span: boolToken.span };
    }
    if (this.check('FALSE')) {
      const boolToken = this.advance();
      return { kind: 'BooleanLiteral', value: false, span: boolToken.span };
    }

    if (this.check('LBRACKET')) {
      return this.parseArrayLiteral();
    }

    if (this.check('TEMPLATE_START')) {
      return this.parseTemplateLiteral();
    }

    if (this.check('DOUBLE_LBRACKET')) {
      return this.parseReference();
    }

    if (this.check('SEMANTIC_OPEN')) {
      return this.parseSemanticMarker();
    }

    if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
      return this.parseVariableReference();
    }

    if (this.check('LOWER_IDENT') || this.check('UPPER_IDENT') || this.check('TEXT')) {
      return this.parseInlineText();
    }

    if (!this.isAtEnd()) {
      const errorToken = this.advance();
      this.error('E001', `Unexpected token: ${errorToken.type}`);
      return { kind: 'InlineText', text: errorToken.value, span: errorToken.span };
    }

    return { kind: 'InlineText', text: '', span: token?.span || AST.createSpan(1, 0, 0, 1, 0, 0) };
  }

  private parseLambdaExpression(): AST.LambdaExpression {
    const start = this.current();
    const params: string[] = [];

    if (this.check('LPAREN')) {
      this.advance();
      while (!this.check('RPAREN') && !this.isAtEnd()) {
        if (this.check('DOLLAR_IDENT')) {
          params.push(this.advance().value.slice(1));
        }
        if (this.check('COMMA')) {
          this.advance();
        }
      }
      this.expect('RPAREN');
    } else if (this.check('DOLLAR_IDENT')) {
      params.push(this.advance().value.slice(1));
    }

    this.expect('ARROW');

    const body = this.parseExpression();

    return {
      kind: 'LambdaExpression',
      params,
      body,
      span: AST.mergeSpans(start.span, body.span),
    };
  }

  private parseArrayLiteral(): AST.ArrayLiteral {
    const start = this.advance();
    const elements: AST.Expression[] = [];

    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      elements.push(this.parseExpression());
      if (this.check('COMMA')) {
        this.advance();
      }
    }

    const end = this.expect('RBRACKET');

    return {
      kind: 'ArrayLiteral',
      elements,
      span: AST.mergeSpans(start.span, end?.span || this.previous().span),
    };
  }

  private parseTemplateLiteral(): AST.TemplateLiteral {
    const start = this.advance();
    const parts: (string | AST.Expression)[] = [];

    while (!this.check('TEMPLATE_END') && !this.isAtEnd()) {
      if (this.check('TEMPLATE_PART')) {
        parts.push(this.advance().value);
      } else if (this.check('DOLLAR_IDENT')) {
        const varToken = this.advance();
        parts.push({
          kind: 'VariableReference',
          name: varToken.value.slice(1),
          span: varToken.span,
        });
      } else if (this.check('SEMANTIC_OPEN')) {
        parts.push(this.parseSemanticMarker());
      } else {
        this.advance();
      }
    }

    const end = this.expect('TEMPLATE_END');

    return {
      kind: 'TemplateLiteral',
      parts,
      span: AST.mergeSpans(start.span, end?.span || this.previous().span),
    };
  }

  private parseReference(): AST.SkillReference | AST.SectionReference {
    const start = this.advance();

    let skill: string | null = null;
    let section: string | null = null;

    if (this.check('LOWER_IDENT')) {
      const ident = this.advance().value;
      if (ident.startsWith('#')) {
        section = ident.slice(1);
      } else {
        skill = ident;
      }
    }

    if (skill && this.check('LOWER_IDENT')) {
      const ident = this.advance().value;
      if (ident.startsWith('#')) {
        section = ident.slice(1);
      }
    }

    const end = this.expect('DOUBLE_RBRACKET');
    const span = AST.mergeSpans(start.span, end?.span || this.previous().span);

    if (section !== null) {
      return { kind: 'SectionReference', skill, section, span };
    }

    return { kind: 'SkillReference', skill: skill || '', span };
  }

  private parseSemanticMarker(): AST.SemanticMarker {
    const start = this.advance();
    let content = '';
    const interpolations: AST.VariableReference[] = [];

    while (!this.check('SEMANTIC_CLOSE') && !this.isAtEnd()) {
      if (this.check('SEMANTIC_CONTENT')) {
        content += this.advance().value;
      } else if (this.check('DOLLAR_IDENT')) {
        const varToken = this.advance();
        content += varToken.value;
        interpolations.push({
          kind: 'VariableReference',
          name: varToken.value.slice(1),
          span: varToken.span,
        });
      } else {
        content += this.advance().value;
      }
    }

    const end = this.expect('SEMANTIC_CLOSE');

    return {
      kind: 'SemanticMarker',
      content,
      interpolations,
      span: AST.mergeSpans(start.span, end?.span || this.previous().span),
    };
  }

  private parseVariableReference(): AST.Expression {
    const varToken = this.advance();
    const name = varToken.value.slice(1);

    let expr: AST.Expression = {
      kind: 'VariableReference',
      name,
      span: varToken.span,
    };

    while (this.check('DOT')) {
      this.advance();
      if (this.check('LOWER_IDENT') || this.check('UPPER_IDENT')) {
        const propToken = this.advance();
        expr = {
          kind: 'MemberAccess',
          object: expr,
          property: propToken.value,
          span: AST.mergeSpans(varToken.span, propToken.span),
        };
      }
    }

    if (this.check('LPAREN')) {
      this.advance();
      const args: AST.Expression[] = [];
      while (!this.check('RPAREN') && !this.isAtEnd()) {
        args.push(this.parseExpression());
        if (this.check('COMMA')) {
          this.advance();
        }
      }
      const end = this.expect('RPAREN');
      expr = {
        kind: 'FunctionCall',
        callee: expr,
        args,
        span: AST.mergeSpans(varToken.span, end?.span || this.previous().span),
      };
    }

    return expr;
  }

  private parseInlineText(): AST.InlineText {
    let text = '';
    const start = this.current();

    while (
      !this.isAtEnd() &&
      !this.check('NEWLINE') &&
      !this.check('DOUBLE_LBRACKET') &&
      !this.check('SEMANTIC_OPEN') &&
      !this.check('DOLLAR_IDENT') &&
      !this.check('TYPE_IDENT')
    ) {
      if (text) text += ' ';
      text += this.advance().value;
    }

    return {
      kind: 'InlineText',
      text: text.trim(),
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  // ==========================================================================
  // Control Flow
  // ==========================================================================

  private parseForEach(): AST.ForEachStatement {
    const start = this.advance();
    this.expect('EACH');
    
    const pattern = this.parsePattern();
    this.expect('IN');
    const collection = this.parseExpression();
    this.expect('COLON');
    this.skipNewlines();

    this.loopDepth++;
    const body = this.parseIndentedBlocks();
    this.loopDepth--;

    return {
      kind: 'ForEachStatement',
      pattern,
      collection,
      body,
      span: AST.mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : collection.span),
    };
  }

  // v0.2: PARALLEL FOR EACH
  private parseParallelForEach(): AST.ParallelForEachStatement {
    const start = this.advance();  // PARALLEL
    this.expect('FOR');
    this.expect('EACH');
    
    const pattern = this.parsePattern();
    this.expect('IN');
    const collection = this.parseExpression();
    this.expect('COLON');
    this.skipNewlines();

    this.loopDepth++;
    const body = this.parseIndentedBlocks();
    this.loopDepth--;

    return {
      kind: 'ParallelForEachStatement',
      pattern,
      collection,
      body,
      mergeStrategy: 'collect',  // Default strategy
      span: AST.mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : collection.span),
    };
  }

  private parseWhile(): AST.WhileStatement {
    const start = this.advance();
    this.expect('LPAREN');
    const condition = this.parseCondition();
    this.expect('RPAREN');
    this.expect('COLON');
    this.skipNewlines();

    this.loopDepth++;
    const body = this.parseIndentedBlocks();
    this.loopDepth--;

    return {
      kind: 'WhileStatement',
      condition,
      body,
      span: AST.mergeSpans(start.span, body.length > 0 ? body[body.length - 1].span : condition.span),
    };
  }

  private parseIf(): AST.IfStatement {
    const start = this.advance();
    const condition = this.parseCondition();
    this.expect('THEN');
    this.expect('COLON');
    this.skipNewlines();

    const thenBody = this.parseIndentedBlocks();

    let elseBody: AST.Block[] | null = null;
    if (this.check('ELSE')) {
      this.advance();
      this.expect('COLON');
      this.skipNewlines();
      elseBody = this.parseIndentedBlocks();
    }

    return {
      kind: 'IfStatement',
      condition,
      thenBody,
      elseBody,
      span: AST.mergeSpans(
        start.span, 
        elseBody?.length ? elseBody[elseBody.length - 1].span : 
        thenBody.length ? thenBody[thenBody.length - 1].span : 
        condition.span
      ),
    };
  }

  // v0.2: BREAK statement
  private parseBreak(): AST.BreakStatement {
    const token = this.advance();
    
    if (this.loopDepth === 0) {
      this.error('E016', 'BREAK can only be used inside a loop');
    }

    return {
      kind: 'BreakStatement',
      span: token.span,
    };
  }

  // v0.2: CONTINUE statement
  private parseContinue(): AST.ContinueStatement {
    const token = this.advance();
    
    if (this.loopDepth === 0) {
      this.error('E017', 'CONTINUE can only be used inside a loop');
    }

    return {
      kind: 'ContinueStatement',
      span: token.span,
    };
  }

  private parsePattern(): AST.Pattern {
    if (this.check('LPAREN')) {
      const start = this.advance();
      const names: string[] = [];
      
      while (!this.check('RPAREN') && !this.isAtEnd()) {
        if (this.check('DOLLAR_IDENT')) {
          names.push(this.advance().value.slice(1));
        }
        if (this.check('COMMA')) {
          this.advance();
        }
      }
      
      const end = this.expect('RPAREN');
      
      return {
        kind: 'DestructuringPattern',
        names,
        span: AST.mergeSpans(start.span, end?.span || this.previous().span),
      };
    }

    if (this.check('DOLLAR_IDENT')) {
      const token = this.advance();
      return {
        kind: 'SimplePattern',
        name: token.value.slice(1),
        span: token.span,
      };
    }

    this.error('E005', 'Expected pattern');
    return {
      kind: 'SimplePattern',
      name: '',
      span: this.current().span,
    };
  }

  private parseCondition(): AST.Condition {
    return this.parseOrCondition();
  }

  private parseOrCondition(): AST.Condition {
    let left = this.parseAndCondition();

    while (this.check('OR')) {
      this.advance();
      const right = this.parseAndCondition();
      left = {
        kind: 'CompoundCondition',
        operator: 'OR',
        left,
        right,
        span: AST.mergeSpans(left.span, right.span),
      };
    }

    return left;
  }

  private parseAndCondition(): AST.Condition {
    let left = this.parsePrimaryCondition();

    while (this.check('AND')) {
      this.advance();
      const right = this.parsePrimaryCondition();
      left = {
        kind: 'CompoundCondition',
        operator: 'AND',
        left,
        right,
        span: AST.mergeSpans(left.span, right.span),
      };
    }

    return left;
  }

  private parsePrimaryCondition(): AST.Condition {
    const negated = this.check('NOT');
    if (negated) {
      this.advance();
    }

    if (this.check('LPAREN')) {
      this.advance();
      const cond = this.parseCondition();
      this.expect('RPAREN');
      return cond;
    }

    if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
      const left = this.parseVariableReference();
      
      if (this.check('ASSIGN') || this.check('NEQ') || 
          this.check('LT') || this.check('GT') ||
          this.check('LTE') || this.check('GTE')) {
        const opToken = this.advance();
        const op = this.tokenToOperator(opToken.type);
        const right = this.parsePrimary();
        
        return {
          kind: 'DeterministicCondition',
          left,
          operator: op,
          right,
          span: AST.mergeSpans(left.span, right.span),
        };
      }

      return {
        kind: 'SemanticCondition',
        text: '$' + (left as AST.VariableReference).name,
        negated,
        span: left.span,
      };
    }

    let text = '';
    const start = this.current();
    
    while (
      !this.isAtEnd() &&
      !this.check('RPAREN') &&
      !this.check('AND') &&
      !this.check('OR') &&
      !this.check('THEN') &&
      !this.check('COLON')
    ) {
      if (text) text += ' ';
      text += this.advance().value;
    }

    return {
      kind: 'SemanticCondition',
      text: text.trim(),
      negated,
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  private parseIndentedBlocks(): AST.Block[] {
    const blocks: AST.Block[] = [];

    if (this.check('INDENT')) {
      this.advance();
    }

    while (!this.check('DEDENT') && !this.isAtEnd() && !this.check('HEADING')) {
      this.skipNewlines();
      
      if (this.check('DEDENT') || this.isAtEnd() || this.check('HEADING')) break;

      const block = this.parseBlock();
      if (block) {
        blocks.push(block);
      }
    }

    if (this.check('DEDENT')) {
      this.advance();
    }

    return blocks;
  }

  // ==========================================================================
  // Prose Content
  // ==========================================================================

  private parseParagraph(): AST.Paragraph {
    const content: AST.InlineContent[] = [];
    const start = this.current();

    while (!this.isAtEnd() && !this.check('NEWLINE') && !this.check('HEADING')) {
      if (this.check('DOUBLE_LBRACKET')) {
        content.push(this.parseReference());
      } else if (this.check('SEMANTIC_OPEN')) {
        content.push(this.parseSemanticMarker());
      } else if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
        const varToken = this.advance();
        content.push({
          kind: 'VariableReference',
          name: varToken.value.slice(1),
          span: varToken.span,
        });
      } else {
        const textContent = this.parseInlineText();
        if (textContent.text) {
          content.push(textContent);
        }
      }
    }

    if (this.check('NEWLINE')) {
      this.advance();
    }

    return {
      kind: 'Paragraph',
      content,
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  private parseCodeBlock(): AST.CodeBlock {
    const start = this.advance();
    const langMatch = start.value.match(/^```(\w*)$/);
    const language = langMatch?.[1] || null;

    let content = '';
    if (this.check('CODE_BLOCK_CONTENT')) {
      content = this.advance().value;
    }

    const end = this.expect('CODE_BLOCK_END');

    return {
      kind: 'CodeBlock',
      language,
      content,
      span: AST.mergeSpans(start.span, end?.span || this.previous().span),
    };
  }

  private parseHorizontalRule(): AST.HorizontalRule {
    const token = this.advance();
    return { kind: 'HorizontalRule', span: token.span };
  }

  private parseDelegation(): AST.Delegation {
    const verbToken = this.advance();
    const verb = verbToken.value;

    const target = this.parseReference();

    const parameters: AST.VariableDeclaration[] = [];

    // Check for WITH
    if (this.check('WITH')) {
      this.advance(); // consume WITH
      this.expect('COLON'); // WITH:

      this.skipNewlines();

      // Parse WITH parameters as list items (like Input sections)
      while (this.check('LIST_MARKER') && !this.isAtEnd()) {
        this.advance(); // consume LIST_MARKER
        const param = this.parseVariableDeclaration(true); // true for inWithClause
        parameters.push(param);

        this.skipNewlines();

        // Stop if we hit a non-list-marker or heading
        if (!this.check('LIST_MARKER') || this.check('HEADING')) {
          break;
        }
      }
    }

    const span = AST.mergeSpans(verbToken.span, this.previous().span);

    return {
      kind: 'Delegation',
      verb,
      target,
      parameters,
      span,
    };
  }

  private parseBlockquote(): AST.Paragraph {
    const token = this.advance();
    const content = token.value.slice(1).trim();

    return {
      kind: 'Paragraph',
      content: [{ kind: 'InlineText', text: content, span: token.span }],
      span: token.span,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.current().type === 'EOF';
  }

  private current(): Token {
    return this.tokens[this.pos] || { 
      type: 'EOF', 
      value: '', 
      span: AST.createSpan(1, 0, 0, 1, 0, 0) 
    };
  }

  private previous(): Token {
    return this.tokens[this.pos - 1] || this.current();
  }

  private peek(offset: number = 0): Token | null {
    const idx = this.pos + offset;
    return idx < this.tokens.length ? this.tokens[idx] : null;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.pos++;
    }
    return this.previous();
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private expect(type: TokenType): Token | null {
    if (this.check(type)) {
      return this.advance();
    }
    this.error('E001', `Expected ${type}, got ${this.current().type}`);
    return null;
  }

  private skipNewlines(): void {
    while (this.check('NEWLINE')) {
      this.advance();
    }
  }

  private error(code: AST.ErrorCode, message: string): void {
    this.errors.push({
      kind: 'ParseError',
      code,
      message,
      recoverable: true,
      span: this.current().span,
    });
  }
}

// ============================================================================
// Exports
// ============================================================================

export function parse(source: string): AST.Document {
  return new Parser(source).parse();
}
