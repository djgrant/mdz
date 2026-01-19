/**
 * MDZ Parser
 * 
 * Recursive descent parser for MDZ documents.
 * v0.2: Added PARALLEL FOR EACH, BREAK, CONTINUE, typed parameters
 * v0.9: Added RETURN, ASYNC/AWAIT DELEGATE, push operator, DO instruction;
 *       removed PARALLEL FOR EACH; frontmatter types/input/context
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
  private blockDepth: number = 0; // v0.10: Track control-flow nesting

  constructor(private source: string) {}

  parse(): AST.Document {
    this.tokens = tokenize(this.source);
    this.pos = 0;
    this.errors = [];
    this.loopDepth = 0;
    this.blockDepth = 0;

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

    // v0.7: Parse unified uses: field with sigil-based entries
    // Supports: ~skill-name, @agent-name, !tool-name
    // Also supports legacy separate skills:/agents:/tools: fields for backward compat
    const { skills, agents, tools, uses } = this.parseUsesField(parsed);
    
    return {
      kind: 'Frontmatter',
      name: parsed.name || '',
      description: parsed.description || '',
      types: this.parseFrontmatterTypes(parsed.types),      // v0.9
      input: this.parseFrontmatterInput(parsed.input),      // v0.9
      context: this.parseFrontmatterContext(parsed.context), // v0.9
      skills,
      agents,
      tools,
      uses,
      imports: this.parseImports(parsed.imports),
      raw: parsed,
      span: AST.mergeSpans(start.span, end.span),
    };
  }

  // v0.7: Parse unified uses: field with sigil-based entries
  private parseUsesField(parsed: Record<string, any>): { skills: string[]; agents: string[]; tools: string[]; uses: string[] } {
    const skills: string[] = [];
    const agents: string[] = [];
    const tools: string[] = [];
    const uses: string[] = [];

    // Priority: explicit skills:/agents:/tools: fields take precedence over uses:
    // This maintains backward compatibility where skills: is the preferred name
    const hasExplicitSkills = Array.isArray(parsed.skills) && parsed.skills.length > 0;
    const hasExplicitAgents = Array.isArray(parsed.agents) && parsed.agents.length > 0;
    const hasExplicitTools = Array.isArray(parsed.tools) && parsed.tools.length > 0;

    // First, add explicit skills/agents/tools fields
    if (hasExplicitSkills) {
      for (const skill of parsed.skills) {
        skills.push(skill);
        uses.push(`~${skill}`);
      }
    }
    if (hasExplicitAgents) {
      for (const agent of parsed.agents) {
        agents.push(agent);
        uses.push(`@${agent}`);
      }
    }
    if (hasExplicitTools) {
      for (const tool of parsed.tools) {
        tools.push(tool);
        uses.push(`!${tool}`);
      }
    }

    // Then process uses: field with sigil-based entries
    // Skip non-sigil entries if explicit skills: was provided (backward compat)
    if (Array.isArray(parsed.uses)) {
      for (const entry of parsed.uses) {
        if (typeof entry !== 'string') continue;
        
        if (entry.startsWith('~/')) {
          const parts = entry.slice(2).split('/');
          const kind = parts[0];
          const name = parts.slice(1).join('/');
          if (kind === 'agent') {
            if (!agents.includes(name)) {
              agents.push(name);
              uses.push(entry);
            }
          } else if (kind === 'skill') {
            if (!skills.includes(name)) {
              skills.push(name);
              uses.push(entry);
            }
          } else if (kind === 'tool') {
            if (!tools.includes(name)) {
              tools.push(name);
              uses.push(entry);
            }
          }
        } else if (entry.startsWith('~')) {
          // ~skill-name -> skills
          const skill = entry.slice(1);
          if (!skills.includes(skill)) {
            skills.push(skill);
            uses.push(entry);
          }
        } else if (entry.startsWith('@')) {
          // @agent-name -> agents
          const agent = entry.slice(1);
          if (!agents.includes(agent)) {
            agents.push(agent);
            uses.push(entry);
          }
        } else if (entry.startsWith('!')) {
          // !tool-name -> tools
          const tool = entry.slice(1);
          if (!tools.includes(tool)) {
            tools.push(tool);
            uses.push(entry);
          }
        } else {
          // No sigil - treat as skill only if no explicit skills: field
          if (!hasExplicitSkills && !skills.includes(entry)) {
            skills.push(entry);
            uses.push(entry);
          }
        }
      }
    }

    return { skills, agents, tools, uses };
  }

  private parseYaml(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split('\n');
    let currentKey = '';
    let inArray = false;
    let inImports = false;
    let inNestedObject = false;
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
          inNestedObject = false;
        } else {
          // v0.9: types, input, context are objects, not arrays
          if (currentKey === 'types' || currentKey === 'input' || currentKey === 'context') {
            result[currentKey] = {};
            inNestedObject = true;
            inArray = false;
          } else {
            result[currentKey] = [];
            inArray = true;
          }
          inImports = currentKey === 'imports';
        }
        continue;
      }

      // v0.9: Handle nested object entries (key: value indented)
      if (inNestedObject && currentKey) {
        const nestedMatch = line.match(/^\s+(\$?\w+):\s*(.*)$/);
        if (nestedMatch) {
          result[currentKey][nestedMatch[1]] = nestedMatch[2].trim();
          continue;
        }
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

  // v0.9: Parse types from frontmatter
  private parseFrontmatterTypes(typesYaml: Record<string, any> | undefined): AST.FrontmatterTypeDecl[] {
    if (!typesYaml || typeof typesYaml !== 'object') return [];
    return Object.entries(typesYaml).map(([name, def]) => ({
      kind: 'FrontmatterTypeDecl' as const,
      name: name.replace(/^\$/, ''),
      typeExpr: this.parseTypeExprFromString(String(def)),
      span: AST.createSpan(1, 0, 0, 1, 0, 0),
    }));
  }

  // v0.9: Parse input params from frontmatter
  private parseFrontmatterInput(inputYaml: Record<string, any> | undefined): AST.FrontmatterInputDecl[] {
    if (!inputYaml || typeof inputYaml !== 'object') return [];
    return Object.entries(inputYaml).map(([name, def]) => {
      const defStr = String(def);
      const hasDefault = defStr.includes('=');
      const [typeStr, defaultStr] = hasDefault ? defStr.split('=').map(s => s.trim()) : [defStr.trim(), undefined];
      return {
        kind: 'FrontmatterInputDecl' as const,
        name: name.replace(/^\$/, ''),
        type: typeStr ? this.parseTypeExprFromString(typeStr) : undefined,
        defaultValue: defaultStr ? this.parseValueFromString(defaultStr) : undefined,
        required: !hasDefault,
        span: AST.createSpan(1, 0, 0, 1, 0, 0),
      };
    });
  }

  // v0.9: Parse context vars from frontmatter
  private parseFrontmatterContext(contextYaml: Record<string, any> | undefined): AST.FrontmatterContextDecl[] {
    if (!contextYaml || typeof contextYaml !== 'object') return [];
    return Object.entries(contextYaml).map(([name, def]) => {
      const defStr = String(def);
      const hasInit = defStr.includes('=');
      const [typeStr, initStr] = hasInit ? defStr.split('=').map(s => s.trim()) : [defStr.trim(), undefined];
      return {
        kind: 'FrontmatterContextDecl' as const,
        name: name.replace(/^\$/, ''),
        type: typeStr ? this.parseTypeExprFromString(typeStr) : undefined,
        initialValue: initStr ? this.parseValueFromString(initStr) : undefined,
        span: AST.createSpan(1, 0, 0, 1, 0, 0),
      };
    });
  }

  private parseTypeExprFromString(str: string): AST.TypeExpr {
    // Simple type reference: $Type or Type
    const name = str.replace(/^\$/, '').replace(/\[\]$/, '');
    const isArray = str.endsWith('[]');
    const typeRef: AST.TypeReference = {
      kind: 'TypeReference',
      name,
      span: AST.createSpan(1, 0, 0, 1, 0, 0),
    };
    if (isArray) {
      return { kind: 'ArrayType', elementType: typeRef, span: typeRef.span };
    }
    return typeRef;
  }

  private parseValueFromString(str: string): AST.Expression {
    // Simple literal parsing
    if (str.startsWith('"') && str.endsWith('"')) {
      return { kind: 'StringLiteral', value: str.slice(1, -1), span: AST.createSpan(1, 0, 0, 1, 0, 0) };
    }
    if (!isNaN(Number(str))) {
      return { kind: 'NumberLiteral', value: Number(str), span: AST.createSpan(1, 0, 0, 1, 0, 0) };
    }
    if (str === 'true' || str === 'false') {
      return { kind: 'BooleanLiteral', value: str === 'true', span: AST.createSpan(1, 0, 0, 1, 0, 0) };
    }
    if (str === '[]') {
      return { kind: 'ArrayLiteral', elements: [], span: AST.createSpan(1, 0, 0, 1, 0, 0) };
    }
    return { kind: 'InlineText', text: str, span: AST.createSpan(1, 0, 0, 1, 0, 0) };
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
    if (this.check('END')) {
      this.error('E001', 'Unexpected END');
      this.advance();
      return null;
    }

    if (this.check('ELSE')) {
      this.error('E001', 'Unexpected ELSE');
      this.advance();
      return null;
    }

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

    if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
      // v0.9: Check for push operator << on the same line
      let i = 1;
      while (this.peek(i) && this.peek(i)!.type !== 'NEWLINE' && this.peek(i)!.type !== 'EOF') {
        if (this.peek(i)!.type === 'PUSH') {
          return this.parsePushStatement();
        }
        // Stop if we hit something that clearly isn't part of an L-value
        if (['ASSIGN', 'FOR', 'IF', 'WHILE', 'DELEGATE'].includes(this.peek(i)!.type)) {
          break;
        }
        i++;
      }
      return this.parseVariableOrType();
    }

    // Control flow
    if (this.check('FOR')) {
      return this.parseFor();
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

    // v0.9: RETURN statement
    if (this.check('RETURN')) {
      return this.parseReturnStatement();
    }

    // v0.9: ASYNC/AWAIT before DELEGATE
    if (this.check('ASYNC') || this.check('AWAIT')) {
      return this.parseDelegateStatement();
    }

    // v0.9/v0.10: DO instruction (standalone or block)
    if (this.check('DO')) {
      return this.parseDoStatement();
    }

    // v0.3: DELEGATE statement
    if (this.check('DELEGATE')) {
      return this.parseDelegateStatement();
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

    // v0.8: USE statement
    if (this.check('USE')) {
      return this.parseUseStatement();
    }

    // v0.8: EXECUTE statement
    if (this.check('EXECUTE')) {
      return this.parseExecuteStatement();
    }

    // v0.8: GOTO statement
    if (this.check('GOTO')) {
      return this.parseGotoStatement();
    }

    // Delegation - v0.8: check for link-based references
    if (this.check('LOWER_IDENT') || this.check('UPPER_IDENT')) {
      const verb = this.current().value.toLowerCase();
      if (verb === 'call' || verb === 'run' || verb === 'invoke') {
        // Check for "verb (ref)" or "verb to (ref)" patterns with LINK or ANCHOR
        const lookahead1 = this.peek(1);
        const lookahead2 = this.peek(2);
        const isRefToken = (t: Token | null) => 
          t?.type === 'LINK' || t?.type === 'ANCHOR';
        if (isRefToken(lookahead1) ||
            (lookahead1?.type === 'LOWER_IDENT' && lookahead1.value === 'to' && isRefToken(lookahead2))) {
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

  private parseSemanticText(stopTypes: TokenType[]): {
    content: string;
    span: AST.Span;
    interpolations: AST.VariableReference[];
  } {
    const start = this.current();
    const interpolations: AST.VariableReference[] = [];
    let end: Token | null = null;

    while (!this.isAtEnd() && !stopTypes.includes(this.current().type)) {
      const token = this.advance();
      end = token;
      if (token.type === 'DOLLAR_IDENT') {
        interpolations.push({
          kind: 'VariableReference',
          name: token.value.slice(1),
          span: token.span,
        });
      }
    }

    if (!end) {
      return { content: '', span: start.span, interpolations: [] };
    }

    const content = this.source.slice(start.span.start.offset, end.span.end.offset).trim();

    return {
      content,
      span: AST.mergeSpans(start.span, end.span),
      interpolations,
    };
  }

  private parseSemanticSpan(stopTypes: TokenType[]): AST.SemanticMarker {
    const { content, span, interpolations } = this.parseSemanticText(stopTypes);

    return {
      kind: 'SemanticMarker',
      content,
      interpolations,
      span,
    };
  }

  private parseSemanticTypeAnnotation(stopTypes: TokenType[]): AST.SemanticType {
    const { content, span } = this.parseSemanticText(stopTypes);

    return {
      kind: 'SemanticType',
      description: content,
      span,
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

    let typeAnnotation: AST.TypeReference | AST.SemanticType | null = null;
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
      } else {
        typeAnnotation = this.parseSemanticTypeAnnotation(['ASSIGN', 'NEWLINE', 'END', 'ELSE']);
        if (typeAnnotation.description.trim() === '') {
          this.error('E020', 'Malformed type annotation: expected type name or description');
        }
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

    // v0.8: Link-based references
    if (this.check('LINK')) {
      return this.parseLink();
    }
    if (this.check('ANCHOR')) {
      return this.parseAnchor();
    }

    if (this.check('INFERRED_VAR')) {
      return this.parseInferredVariable();
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
      } else if (this.check('INFERRED_VAR')) {
        parts.push(this.parseInferredVariable());
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

  // v0.8: Parse ~/path/to/file or ~/path/to/file#anchor link reference
  private parseLink(): AST.LinkNode {
    const token = this.expect('LINK');
    if (!token) {
      return {
        kind: 'Link',
        path: [],
        anchor: null,
        raw: '',
        span: this.current().span,
      };
    }
    
    // Token value is JSON: { path: string[], anchor: string | null }
    const parsed = JSON.parse(token.value);
    const raw = '~/' + parsed.path.join('/') + (parsed.anchor ? '#' + parsed.anchor : '');
    
    return {
      kind: 'Link',
      path: parsed.path,
      anchor: parsed.anchor,
      raw,
      span: token.span,
    };
  }

  // v0.8: Parse #section anchor reference
  private parseAnchor(): AST.AnchorNode {
    const token = this.expect('ANCHOR');
    if (!token) {
      return {
        kind: 'Anchor',
        name: '',
        span: this.current().span,
      };
    }
    
    return {
      kind: 'Anchor',
      name: token.value,
      span: token.span,
    };
  }

  private parseInferredVariable(): AST.InferredVariable {
    const token = this.advance();
    // Extract name from $/name/ - remove $/ prefix and / suffix
    const name = token.value.slice(2, -1);
    
    return {
      kind: 'InferredVariable',
      name,
      span: token.span,
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
    const startToken = this.current();
    let lastToken = startToken;

    while (
      !this.isAtEnd() &&
      !this.check('NEWLINE') &&
      !this.check('HEADING') &&
      // v0.8: link-based references
      !this.check('LINK') &&
      !this.check('ANCHOR') &&
      !this.check('INFERRED_VAR') &&
      !this.check('DOLLAR_IDENT') &&
      !this.check('TYPE_IDENT')
    ) {
      lastToken = this.advance();
    }

    const text = this.source.slice(startToken.span.start.offset, lastToken.span.end.offset);

    return {
      kind: 'InlineText',
      text,
      span: AST.mergeSpans(startToken.span, lastToken.span),
    };
  }

  // ==========================================================================
  // Control Flow
  // ==========================================================================

  private parseFor(): AST.ForEachStatement {
    const start = this.advance();

    const pattern = this.parsePattern();
    this.expect('IN');
    const collection = this.parseExpression();
    if (this.check('DO')) {
      this.advance();
    }
    this.expect('NEWLINE');
    this.skipNewlines();

    this.loopDepth++;
    this.blockDepth++;
    const body = this.parseBlockBody(['END']);
    this.blockDepth--;
    this.loopDepth--;

    const end = this.expect('END');
    this.skipNewlines();

    return {
      kind: 'ForEachStatement',
      pattern,
      collection,
      body,
      span: AST.mergeSpans(start.span, end?.span || (body.length > 0 ? body[body.length - 1].span : collection.span)),
    };
  }

  private parseWhile(): AST.WhileStatement {
    const start = this.advance();
    const condition = this.parseCondition();
    if (this.check('DO')) {
      this.advance();
    }
    this.expect('NEWLINE');
    this.skipNewlines();

    this.loopDepth++;
    this.blockDepth++;
    const body = this.parseBlockBody(['END']);
    this.blockDepth--;
    this.loopDepth--;

    const end = this.expect('END');
    this.skipNewlines();

    return {
      kind: 'WhileStatement',
      condition,
      body,
      span: AST.mergeSpans(start.span, end?.span || (body.length > 0 ? body[body.length - 1].span : condition.span)),
    };
  }

  private parseIf(): AST.IfStatement {
    const start = this.advance();
    const condition = this.parseCondition();
    if (this.check('THEN')) {
      this.advance();
    }
    this.expect('NEWLINE');
    this.skipNewlines();

    this.blockDepth++;
    const thenBody = this.parseBlockBody(['ELSE', 'END']);

    const elseIf: AST.ElseIfClause[] = [];
    let elseBody: AST.Block[] | null = null;

    while (this.check('ELSE')) {
      const elseStart = this.current();
      this.advance();

      if (this.check('IF')) {
        this.advance();
        const elseIfCondition = this.parseCondition();
        if (this.check('THEN')) {
          this.advance();
        }
        this.expect('NEWLINE');
        this.skipNewlines();

        const elseIfBody = this.parseBlockBody(['ELSE', 'END']);

        elseIf.push({
          condition: elseIfCondition,
          body: elseIfBody,
          span: AST.mergeSpans(
            elseStart.span,
            elseIfBody.length > 0 ? elseIfBody[elseIfBody.length - 1].span : elseIfCondition.span
          ),
        });
      } else {
        this.expect('NEWLINE');
        this.skipNewlines();
        elseBody = this.parseBlockBody(['END']);
        break;
      }
    }

    this.blockDepth--;

    const end = this.expect('END');
    this.skipNewlines();

    let endSpan = end?.span || condition.span;
    if (elseBody?.length) {
      endSpan = elseBody[elseBody.length - 1].span;
    } else if (elseIf.length > 0) {
      endSpan = elseIf[elseIf.length - 1].span;
    } else if (thenBody.length) {
      endSpan = thenBody[thenBody.length - 1].span;
    }

    return {
      kind: 'IfStatement',
      condition,
      thenBody,
      elseIf,
      elseBody,
      span: AST.mergeSpans(start.span, endSpan),
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

  // v0.9: RETURN statement
  private parseReturnStatement(): AST.ReturnStatement {
    const token = this.advance();  // consume RETURN
    
    let value: AST.Expression | undefined;
    // Check if there's an expression to return (not at newline/end)
    if (!this.check('NEWLINE') && !this.isAtEnd() && !this.check('END') && !this.check('ELSE')) {
      value = this.parseExpression();
    }

    // E018: RETURN must be the last statement
    // Skip newlines to see what's next
    let nextPos = this.pos;
    while (nextPos < this.tokens.length && this.tokens[nextPos].type === 'NEWLINE') {
      nextPos++;
    }
    
    const nextToken = nextPos < this.tokens.length ? this.tokens[nextPos] : { type: 'EOF' };
    const isLast = ['END', 'ELSE', 'EOF', 'HEADING'].includes(nextToken.type as string);

    if (!isLast) {
      this.error('E018', 'RETURN must be the last statement in a block or section');
    }
    
    return {
      kind: 'ReturnStatement',
      value,
      span: value ? AST.mergeSpans(token.span, value.span) : token.span,
    };
  }

  // v0.9: Push statement ($array << value)
  private parsePushStatement(): AST.PushStatement {
    const target = this.parseVariableReference();
    
    if (target.kind !== 'VariableReference') {
      this.error('E019', 'Push target must be a variable');
    }

    this.expect('PUSH');  // consume <<
    const value = this.parseExpression();
    
    return {
      kind: 'PushStatement',
      target: target as AST.VariableReference,
      value,
      span: AST.mergeSpans(target.span, value.span),
    };
  }

  // v0.9/v0.10: DO instruction (standalone or block)
  private parseDoStatement(): AST.DoStatement {
    const token = this.advance();  // consume DO

    if (!this.check('NEWLINE')) {
      if (this.blockDepth > 0) {
        this.error('E005', 'Single-line DO is only valid at top level');
      }
      const instruction = this.parseSemanticSpan(['NEWLINE', 'EOF']);
      return {
        kind: 'DoStatement',
        instruction,
        span: AST.mergeSpans(token.span, instruction.span),
      };
    }

    this.expect('NEWLINE');
    this.skipNewlines();

    this.blockDepth++;
    const body = this.parseBlockBody(['END']);
    this.blockDepth--;

    const end = this.expect('END');
    this.skipNewlines();

    return {
      kind: 'DoStatement',
      body,
      span: AST.mergeSpans(token.span, end?.span || (body.length > 0 ? body[body.length - 1].span : token.span)),
    };
  }

  // v0.9: DELEGATE statement for agent delegation
  // Syntax: [ASYNC|AWAIT] DELEGATE [/task/] [TO ~/agent/x] [WITH #template | WITH: params]
  //         AWAIT $handle
  private parseDelegateStatement(): AST.DelegateStatement {
    const start = this.current();
    
    // v0.9: Check for ASYNC/AWAIT modifiers
    let async = false;
    let awaited = false;
    
    if (this.check('ASYNC')) {
      async = true;
      this.advance();
    } else if (this.check('AWAIT')) {
      awaited = true;
      this.advance();
    }
    
    // v0.9: Support AWAIT $handle
    if (awaited && this.check('DOLLAR_IDENT')) {
      const handle = this.parseVariableReference() as AST.VariableReference;
      return {
        kind: 'DelegateStatement',
        handle,
        awaited: true,
        span: AST.mergeSpans(start.span, handle.span),
      };
    }

    this.expect('DELEGATE');
    
    // Task is optional positional span
    let task: AST.SemanticMarker | undefined;
    const taskStopTokens: TokenType[] = ['TO', 'WITH', 'COLON', 'NEWLINE', 'END', 'EOF'];
    if (!taskStopTokens.includes(this.current().type)) {
      task = this.parseSemanticSpan(taskStopTokens);
    }
    
    // v0.9: TO is optional
    let target: AST.LinkNode | undefined;
    if (this.check('TO')) {
      this.advance();
      target = this.parseLink();
    }
    
    // Optional WITH: either #anchor or :params
    let withAnchor: AST.AnchorNode | undefined;
    let parameters: AST.ParameterBlock | undefined;
    if (this.check('WITH')) {
      this.advance();  // consume WITH
      if (this.check('COLON')) {
        parameters = this.parseParameterBlock();
      } else if (this.check('ANCHOR')) {
        withAnchor = this.parseAnchor();
      }
    } else if (this.check('COLON')) {
      parameters = this.parseParameterBlock();
    }
    
    return {
      kind: 'DelegateStatement',
      task,
      target,
      withAnchor,
      parameters,
      async,
      awaited,
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  // v0.8: USE statement for skill activation
  // Syntax: USE ~/skill/x TO task
  private parseUseStatement(): AST.UseStatement {
    const start = this.advance();  // consume USE
    
    // Parse link: ~/skill/x
    const link = this.parseLink();
    
    // Expect TO keyword
    this.expect('TO');
    
    // Parse task: positional semantic span
    const task = this.parseSemanticSpan(['COLON', 'NEWLINE', 'EOF']);
    
    // Optional parameter block with colon
    let parameters: AST.ParameterBlock | undefined;
    if (this.check('COLON')) {
      parameters = this.parseParameterBlock();
    }
    
    return {
      kind: 'UseStatement',
      link,
      task,
      parameters,
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  // v0.8: EXECUTE statement for tool invocation
  // Syntax: EXECUTE ~/tool/x TO action [WITH: params]
  private parseExecuteStatement(): AST.ExecuteStatement {
    const start = this.advance();  // consume EXECUTE
    
    // Parse link: ~/tool/x
    const link = this.parseLink();
    
    // Expect TO keyword
    this.expect('TO');
    
    // Parse task: positional semantic span
    const task = this.parseSemanticSpan(['COLON', 'NEWLINE', 'EOF']);
    
    // Optional parameter block with colon
    let parameters: AST.ParameterBlock | undefined;
    if (this.check('COLON')) {
      parameters = this.parseParameterBlock();
    }
    
    return {
      kind: 'ExecuteStatement',
      link,
      task,
      parameters,
      span: AST.mergeSpans(start.span, this.previous().span),
    };
  }

  // v0.8: GOTO statement for same-file navigation
  // Syntax: GOTO #section
  private parseGotoStatement(): AST.GotoStatement {
    const start = this.advance();  // consume GOTO
    
    // Parse anchor: #section
    const anchor = this.parseAnchor();
    
    return {
      kind: 'GotoStatement',
      anchor,
      span: AST.mergeSpans(start.span, anchor.span),
    };
  }

  // v0.8: Parse parameter block
  private parseParameterBlock(): AST.ParameterBlock {
    const start = this.advance();  // consume COLON
    this.skipNewlines();
    
    const parameters: AST.VariableDeclaration[] = [];
    
    while ((this.check('LOWER_IDENT') || this.check('UPPER_IDENT') || this.check('DOLLAR_IDENT')) && !this.isAtEnd()) {
      const nameToken = this.advance();
      const name = nameToken.type === 'DOLLAR_IDENT' ? nameToken.value.slice(1) : nameToken.value;

      this.expect('COLON');

      let value: AST.Expression | null = null;
      let isRequired = false;
      if (!this.check('NEWLINE') && !this.check('END') && !this.check('ELSE') && !this.isAtEnd()) {
        value = this.parseExpression();
      } else {
        isRequired = true;
      }

      parameters.push({
        kind: 'VariableDeclaration',
        name,
        typeAnnotation: null,
        value,
        isLambda: false,
        isRequired,
        span: AST.mergeSpans(nameToken.span, value?.span || nameToken.span),
      });

      this.skipNewlines();
    }
    
    return {
      kind: 'ParameterBlock',
      parameters,
      span: AST.mergeSpans(start.span, this.previous().span),
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

  private isConditionStop(type: TokenType): boolean {
    return ['AND', 'OR', 'THEN', 'DO', 'NEWLINE', 'END', 'ELSE', 'EOF'].includes(type);
  }

  private hasComparisonOperatorAhead(): boolean {
    let sawVariable = false;
    let i = 0;
    while (true) {
      const token = this.peek(i);
      if (!token) return false;
      if (this.isConditionStop(token.type)) {
        return false;
      }
      if (token.type === 'DOLLAR_IDENT' || token.type === 'TYPE_IDENT') {
        sawVariable = true;
      }
      if (sawVariable && ['ASSIGN', 'NEQ', 'LT', 'GT', 'LTE', 'GTE'].includes(token.type)) {
        return true;
      }
      i += 1;
    }
  }

  private parseSemanticConditionSpan(negated: boolean): AST.SemanticCondition {
    const { content, span } = this.parseSemanticText(['AND', 'OR', 'THEN', 'DO', 'NEWLINE', 'END', 'ELSE', 'EOF']);

    return {
      kind: 'SemanticCondition',
      text: content,
      negated,
      span,
    };
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

    if ((this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) && this.hasComparisonOperatorAhead()) {
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
    }

    return this.parseSemanticConditionSpan(negated);
  }

  private parseBlockBody(stopTypes: TokenType[]): AST.Block[] {
    const blocks: AST.Block[] = [];

    while (!this.isAtEnd() && !this.check('HEADING')) {
      if (stopTypes.includes(this.current().type)) {
        break;
      }
      this.skipNewlines();
      
      if (this.isAtEnd() || this.check('HEADING') || stopTypes.includes(this.current().type)) break;

      const block = this.parseBlock();
      if (block) {
        blocks.push(block);
      }
    }

    return blocks;
  }

  // ==========================================================================
  // Prose Content
  // ==========================================================================

  private parseParagraph(): AST.Paragraph {
    const content: AST.InlineContent[] = [];
    const startToken = this.current();
    let lastEndOffset = this.pos === 0 ? 0 : this.previous().span.end.offset;

    const captureGap = () => {
      const cur = this.current();
      if (cur.span.start.offset > lastEndOffset) {
        content.push({
          kind: 'InlineText',
          text: this.source.slice(lastEndOffset, cur.span.start.offset),
          span: {
            start: this.pos === 0 ? { line: 1, column: 0, offset: 0 } : this.previous().span.end,
            end: cur.span.start,
          },
        });
      }
    };

    while (!this.isAtEnd() && !this.check('NEWLINE') && !this.check('HEADING')) {
      if (this.check('LINK')) {
        captureGap();
        const link = this.parseLink();
        content.push(link);
        lastEndOffset = link.span.end.offset;
      } else if (this.check('ANCHOR')) {
        captureGap();
        const anchor = this.parseAnchor();
        content.push(anchor);
        lastEndOffset = anchor.span.end.offset;
      } else if (this.check('INFERRED_VAR')) {
        captureGap();
        const invar = this.parseInferredVariable();
        content.push(invar);
        lastEndOffset = invar.span.end.offset;
      } else if (this.check('DOLLAR_IDENT') || this.check('TYPE_IDENT')) {
        captureGap();
        const varToken = this.advance();
        content.push({
          kind: 'VariableReference',
          name: varToken.value.slice(1),
          span: varToken.span,
        });
        lastEndOffset = varToken.span.end.offset;
      } else {
        captureGap();
        const textContent = this.parseInlineText();
        if (textContent.text) {
          content.push(textContent);
        }
        lastEndOffset = this.previous().span.end.offset;
      }
    }

    captureGap(); // Trailing gap

    if (this.check('NEWLINE')) {
      this.advance();
    }

    return {
      kind: 'Paragraph',
      content,
      span: AST.mergeSpans(startToken.span, this.previous().span),
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

    // Skip optional "to" before the reference
    if (this.check('LOWER_IDENT') && this.current().value === 'to') {
      this.advance();
    }

    // v0.8: Parse link-based reference (link or anchor)
    let target: AST.LinkNode | AST.AnchorNode;
    if (this.check('LINK')) {
      target = this.parseLink();
    } else if (this.check('ANCHOR')) {
      target = this.parseAnchor();
    } else {
      // Error - expected a reference
      this.error('E001', 'Expected link reference (~/path) or anchor reference (#name)');
      // Return a dummy target
      target = {
        kind: 'Anchor',
        name: '',
        span: this.current().span,
      };
    }

    const parameters: AST.VariableDeclaration[] = [];

    // Check for WITH
    if (this.check('WITH')) {
      this.advance(); // consume WITH
      if (this.check('COLON')) {
        const paramBlock = this.parseParameterBlock();
        parameters.push(...paramBlock.parameters);
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
