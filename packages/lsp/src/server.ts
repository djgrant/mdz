/**
 * MDZ Language Server v0.8
 * 
 * A minimal LSP implementation for MDZ files.
 * Supports:
 * - Go-to-definition for ~/path/to/file, #anchor, $variables
 * - Hover information for links, anchors, and types
 * - Autocomplete after ~/, #, $, and /
 * - Diagnostics for broken links
 * - Document symbols
 */

import { parse } from '../../core/src/parser/parser';
import * as AST from '../../core/src/parser/ast';
import { inferType, isCompatible, makeAnyTypeReference, type TypeEnv } from '../../core/src/typecheck/typecheck';

// ============================================================================
// LSP Types (subset needed for implementation)
// ============================================================================

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  source: string;
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  insertText?: string;
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
}

export interface Hover {
  contents: string;
  range?: Range;
}

export interface SemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

export interface SemanticTokens {
  data: number[];
}

export interface DocumentSymbol {
  name: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

// ============================================================================
// Document State
// ============================================================================

export interface DocumentState {
  uri: string;
  content: string;
  ast: AST.Document;
  types: Map<string, TypeInfo>;
  variables: Map<string, VariableInfo>;
  references: ReferenceInfo[];
  variableRefs: Map<string, AST.Span[]>; // v0.10: Usage spans for variables
  typeRefs: Map<string, AST.Span[]>;     // v0.10: Usage spans for types
  semanticSpans: SemanticMarkerInfo[];
  parameters: ParameterInfo[];
  typeEnv: TypeEnv;
  variableTypes: Map<string, AST.TypeExpr>;
}

export interface TypeInfo {
  name: string;
  definition: string;
  span: AST.Span;
  typeExpr: AST.TypeExpr;
}

export type VariableSource = 'local' | 'input' | 'context';

export interface VariableInfo {
  name: string;
  typeExpr?: AST.TypeExpr;
  span: AST.Span;
  isLambda: boolean;
  source: VariableSource;
}

export interface ParameterInfo {
  name: string;
  typeExpr: AST.TypeExpr;
  isRequired: boolean;
  span: AST.Span;
}

// v0.8: Link-based reference info
export interface ReferenceInfo {
  kind: 'link' | 'anchor';
  path?: string[];        // For links: ['agent', 'architect']
  anchor?: string;        // For anchors or link#anchor
  target: string;         // Display string: '~/agent/architect' or '#section'
  span: AST.Span;
}

export interface SemanticMarkerInfo {
  content: string;
  span: AST.Span;
}

// ============================================================================
// Language Server
// ============================================================================

export class ZenLanguageServer {
  private documents: Map<string, DocumentState> = new Map();
  private skillRegistry: Map<string, DocumentState> = new Map();
  private workspaceFolders: string[] = [];
  private semanticTokenTypes = [
    'keyword',
    'variable',
    'type',
    'string',
    'number',
    'operator',
    'function',
    'parameter',
    'namespace',
    'semanticSpan',
    'link',
    'anchor',
    'frontmatter',
    'heading',
  ];
  private semanticTokenTypeIndex = new Map(
    this.semanticTokenTypes.map((type, index) => [type, index])
  );

  setWorkspaceFolders(uris: string[]): void {
    this.workspaceFolders = uris;
  }

  // ==========================================================================
  // Document Management
  // ==========================================================================

  indexDocument(uri: string, content: string, registryKey?: string): void {
    const state = this.analyzeDocument(uri, content);
    this.documents.set(uri, state);
    
    const key = registryKey || this.computeRegistryKey(uri);
    this.skillRegistry.set(key, state);
  }

  private computeRegistryKey(uri: string): string {
    // Basic heuristic: strip file:// and extension
    return uri.replace(/^file:\/\//, "").replace(/\.mdz$/, "");
  }

  openDocument(uri: string, content: string): Diagnostic[] {
    const state = this.analyzeDocument(uri, content);
    this.documents.set(uri, state);
    this.skillRegistry.set(this.computeRegistryKey(uri), state);
    return this.getDiagnostics(state);
  }

  updateDocument(uri: string, content: string): Diagnostic[] {
    const state = this.analyzeDocument(uri, content);
    this.documents.set(uri, state);
    this.skillRegistry.set(this.computeRegistryKey(uri), state);
    return this.getDiagnostics(state);
  }

  closeDocument(uri: string): void {
    this.documents.delete(uri);
  }

  // ==========================================================================
  // Analysis
  // ==========================================================================

  private analyzeDocument(uri: string, content: string): DocumentState {
    const ast = parse(content);
    
    const types = new Map<string, TypeInfo>();
    const variables = new Map<string, VariableInfo>();
    const references: ReferenceInfo[] = [];
    const variableRefs = new Map<string, AST.Span[]>();
    const typeRefs = new Map<string, AST.Span[]>();
    const semanticSpans: SemanticMarkerInfo[] = [];

    const frontmatterSpans = this.collectFrontmatterDeclarationSpans(content);

    if (ast.frontmatter) {
      for (const typeDecl of ast.frontmatter.types) {
        types.set(typeDecl.name, {
          name: typeDecl.name,
          definition: this.typeExprToString(typeDecl.typeExpr),
          span: frontmatterSpans.types.get(typeDecl.name) ?? typeDecl.span,
          typeExpr: typeDecl.typeExpr,
        });
        this.analyzeTypeExpr(typeDecl.typeExpr, typeRefs);
      }

      for (const inputDecl of ast.frontmatter.input) {
        variables.set(inputDecl.name, {
          name: inputDecl.name,
          typeExpr: inputDecl.type,
          span: frontmatterSpans.input.get(inputDecl.name) ?? inputDecl.span,
          isLambda: false,
          source: 'input',
        });
        if (inputDecl.type) this.analyzeTypeExpr(inputDecl.type, typeRefs);
      }

      for (const contextDecl of ast.frontmatter.context) {
        variables.set(contextDecl.name, {
          name: contextDecl.name,
          typeExpr: contextDecl.type,
          span: frontmatterSpans.context.get(contextDecl.name) ?? contextDecl.span,
          isLambda: false,
          source: 'context',
        });
        if (contextDecl.type) this.analyzeTypeExpr(contextDecl.type, typeRefs);
      }
    }

    // Extract all definitions and references
    for (const section of ast.sections) {
      this.analyzeBlocks(section.title, section.content, types, variables, references, semanticSpans, variableRefs, typeRefs);
    }

    const parameters = this.collectParameters(ast);
    const typeEnv = this.buildTypeEnv(types, ast);
    const variableTypes = this.buildVariableTypes(variables);

    // Register as skill using its path (URI) as the key
    // v0.10: Strip extension and use relative path as canonical key
    const relativePath = uri.replace(/\.mdz$/, "");
    const state: DocumentState = {
      uri,
      content,
      ast,
      types,
      variables,
      references,
      variableRefs,
      typeRefs,
      semanticSpans,
      parameters,
      typeEnv,
      variableTypes,
    };
    this.skillRegistry.set(relativePath, state);

    return state;
  }

  private analyzeBlocks(
    sectionTitle: string,
    blocks: AST.Block[],
    types: Map<string, TypeInfo>,
    variables: Map<string, VariableInfo>,
    references: ReferenceInfo[],
    semanticSpans: SemanticMarkerInfo[],
    variableRefs: Map<string, AST.Span[]>,
    typeRefs: Map<string, AST.Span[]>
  ): void {
    const isLegacySection = sectionTitle === 'Types' || sectionTitle === 'Input' || sectionTitle === 'Context';

    for (const block of blocks) {
      switch (block.kind) {
        case 'TypeDefinition':
          if (!isLegacySection) {
            types.set(block.name, {
              name: block.name,
              definition: this.typeExprToString(block.typeExpr),
              span: block.span,
              typeExpr: block.typeExpr,
            });
          }
          this.analyzeTypeExpr(block.typeExpr, typeRefs);
          break;
        case 'VariableDeclaration':
          if (!isLegacySection) {
            variables.set(block.name, {
              name: block.name,
              typeExpr: block.typeAnnotation ?? undefined,
              span: block.span,
              isLambda: block.isLambda,
              source: 'local',
            });
          }
          if (block.typeAnnotation) {
            if (block.typeAnnotation.kind === 'TypeReference') {
              this.addRef(typeRefs, block.typeAnnotation.name, block.typeAnnotation.span);
            }
          }
          if (block.value) {
            this.analyzeExpression(block.value, references, semanticSpans, variableRefs, typeRefs);
          }
          break;

        case 'ForEachStatement':
          if (block.pattern.kind === 'SimplePattern') {
            variables.set(block.pattern.name, {
              name: block.pattern.name,
              span: block.pattern.span,
              isLambda: false,
              source: 'local',
            });
          } else {
            for (const name of block.pattern.names) {
              variables.set(name, {
                name,
                span: block.pattern.span,
                isLambda: false,
                source: 'local',
              });
            }
          }
          this.analyzeExpression(block.collection, references, semanticSpans, variableRefs, typeRefs);
          this.analyzeBlocks(sectionTitle, block.body, types, variables, references, semanticSpans, variableRefs, typeRefs);
          break;

        case 'WhileStatement':
          this.analyzeCondition(block.condition, references, semanticSpans, variableRefs, typeRefs);
          this.analyzeBlocks(sectionTitle, block.body, types, variables, references, semanticSpans, variableRefs, typeRefs);
          break;

        case 'IfStatement':
          this.analyzeCondition(block.condition, references, semanticSpans, variableRefs, typeRefs);
          this.analyzeBlocks(sectionTitle, block.thenBody, types, variables, references, semanticSpans, variableRefs, typeRefs);
          for (const clause of block.elseIf) {
            this.analyzeCondition(clause.condition, references, semanticSpans, variableRefs, typeRefs);
            this.analyzeBlocks(sectionTitle, clause.body, types, variables, references, semanticSpans, variableRefs, typeRefs);
          }
          if (block.elseBody) {
            this.analyzeBlocks(sectionTitle, block.elseBody, types, variables, references, semanticSpans, variableRefs, typeRefs);
          }
          break;

        case 'Paragraph':
          for (const item of block.content) {
            if (AST.isLink(item)) {
              references.push({
                kind: 'link',
                path: item.path,
                anchor: item.anchor ?? undefined,
                target: item.raw,
                span: item.span,
              });
            } else if (AST.isAnchor(item)) {
              references.push({
                kind: 'anchor',
                anchor: item.name,
                target: `#${item.name}`,
                span: item.span,
              });
            } else if (item.kind === 'VariableReference') {
              this.addRef(variableRefs, item.name, item.span);
            }
          }
          break;

        case 'Delegation':
        case 'UseStatement':
        case 'ExecuteStatement':
        case 'DelegateStatement':
        case 'PushStatement':
        case 'ReturnStatement':
        case 'DoStatement':
        case 'GotoStatement':
          this.analyzeOtherBlock(block, references, semanticSpans, variableRefs, typeRefs, types, variables, sectionTitle);
          break;
      }
    }
  }

  private addRef(map: Map<string, AST.Span[]>, name: string, span: AST.Span): void {
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(span);
  }

  private analyzeTypeExpr(expr: AST.TypeExpr, typeRefs: Map<string, AST.Span[]>): void {
    switch (expr.kind) {
      case 'TypeReference':
        this.addRef(typeRefs, expr.name, expr.span);
        break;
      case 'ArrayType':
        this.analyzeTypeExpr(expr.elementType, typeRefs);
        break;
      case 'CompoundType':
        expr.elements.forEach(e => this.analyzeTypeExpr(e, typeRefs));
        break;
      case 'FunctionType':
        this.analyzeTypeExpr(expr.returnType, typeRefs);
        break;
    }
  }

  private analyzeOtherBlock(
    block: AST.Block,
    references: ReferenceInfo[],
    semanticSpans: SemanticMarkerInfo[],
    variableRefs: Map<string, AST.Span[]>,
    typeRefs: Map<string, AST.Span[]>,
    types: Map<string, TypeInfo>,
    variables: Map<string, VariableInfo>,
    sectionTitle: string
  ): void {
    switch (block.kind) {
      case 'Delegation':
        if (block.target.kind === 'Link') {
          references.push({ kind: 'link', path: block.target.path, anchor: block.target.anchor ?? undefined, target: block.target.raw, span: block.target.span });
        } else {
          references.push({ kind: 'anchor', anchor: block.target.name, target: `#${block.target.name}`, span: block.target.span });
        }
        for (const param of block.parameters) {
          if (param.typeAnnotation && param.typeAnnotation.kind === 'TypeReference') {
            this.addRef(typeRefs, param.typeAnnotation.name, param.typeAnnotation.span);
          }
          if (param.value) this.analyzeExpression(param.value, references, semanticSpans, variableRefs, typeRefs);
        }
        break;
      case 'UseStatement':
      case 'ExecuteStatement': {
        const link = (block as any).link as AST.LinkNode;
        references.push({ kind: 'link', path: link.path, anchor: link.anchor ?? undefined, target: link.raw, span: link.span });
        if (block.kind === 'UseStatement' && block.parameters) {
          for (const param of block.parameters.parameters) {
             if (param.value) this.analyzeExpression(param.value, references, semanticSpans, variableRefs, typeRefs);
          }
        }
        break;
      }
      case 'DelegateStatement':
        if (block.target) {
          references.push({ kind: 'link', path: block.target.path, anchor: block.target.anchor ?? undefined, target: block.target.raw, span: block.target.span });
        }
        if (block.withAnchor) {
          references.push({ kind: 'anchor', anchor: block.withAnchor.name, target: `#${block.withAnchor.name}`, span: block.withAnchor.span });
        }
        if (block.parameters) {
          for (const param of block.parameters.parameters) {
            if (param.value) this.analyzeExpression(param.value, references, semanticSpans, variableRefs, typeRefs);
          }
        }
        break;
      case 'PushStatement':
        this.analyzeExpression(block.target, references, semanticSpans, variableRefs, typeRefs);
        this.analyzeExpression(block.value, references, semanticSpans, variableRefs, typeRefs);
        break;
      case 'ReturnStatement':
        if (block.value) this.analyzeExpression(block.value, references, semanticSpans, variableRefs, typeRefs);
        break;
      case 'DoStatement':
        if (block.body) this.analyzeBlocks(sectionTitle, block.body, types, variables, references, semanticSpans, variableRefs, typeRefs);
        break;
      case 'GotoStatement':
        references.push({ kind: 'anchor', anchor: block.anchor.name, target: `#${block.anchor.name}`, span: block.anchor.span });
        break;
    }
  }

  private analyzeExpression(
    expr: AST.Expression,
    references: ReferenceInfo[],
    semanticSpans: SemanticMarkerInfo[],
    variableRefs: Map<string, AST.Span[]>,
    typeRefs: Map<string, AST.Span[]>
  ): void {
    if (AST.isLink(expr)) {
      references.push({
        kind: 'link',
        path: expr.path,
        anchor: expr.anchor ?? undefined,
        target: expr.raw,
        span: expr.span,
      });
      return;
    }
    
    if (AST.isAnchor(expr)) {
      references.push({
        kind: 'anchor',
        anchor: expr.name,
        target: `#${expr.name}`,
        span: expr.span,
      });
      return;
    }
    
    switch (expr.kind) {
      case 'VariableReference':
        this.addRef(variableRefs, expr.name, expr.span);
        break;
      case 'ArrayLiteral':
        for (const el of expr.elements) {
          this.analyzeExpression(el, references, semanticSpans, variableRefs, typeRefs);
        }
        break;
      case 'TemplateLiteral':
        for (const part of expr.parts) {
          if (typeof part !== 'string') {
            this.analyzeExpression(part, references, semanticSpans, variableRefs, typeRefs);
          }
        }
        break;
      case 'BinaryExpression':
        this.analyzeExpression(expr.left, references, semanticSpans, variableRefs, typeRefs);
        this.analyzeExpression(expr.right, references, semanticSpans, variableRefs, typeRefs);
        break;
      case 'LambdaExpression':
        this.analyzeExpression(expr.body, references, semanticSpans, variableRefs, typeRefs);
        break;
      case 'FunctionCall':
        this.analyzeExpression(expr.callee, references, semanticSpans, variableRefs, typeRefs);
        for (const arg of expr.args) {
          this.analyzeExpression(arg, references, semanticSpans, variableRefs, typeRefs);
        }
        break;
      case 'MemberAccess':
        this.analyzeExpression(expr.object, references, semanticSpans, variableRefs, typeRefs);
        break;
    }
  }

  private analyzeCondition(
    cond: AST.Condition,
    references: ReferenceInfo[],
    semanticSpans: SemanticMarkerInfo[],
    variableRefs: Map<string, AST.Span[]>,
    typeRefs: Map<string, AST.Span[]>
  ): void {
    switch (cond.kind) {
      case 'SemanticCondition':
        semanticSpans.push({ content: cond.text, span: cond.span });
        break;
      case 'DeterministicCondition':
        this.analyzeExpression(cond.left, references, semanticSpans, variableRefs, typeRefs);
        this.analyzeExpression(cond.right, references, semanticSpans, variableRefs, typeRefs);
        break;
      case 'CompoundCondition':
        this.analyzeCondition(cond.left, references, semanticSpans, variableRefs, typeRefs);
        this.analyzeCondition(cond.right, references, semanticSpans, variableRefs, typeRefs);
        break;
    }
  }

  private typeExprToString(expr: AST.TypeExpr): string {
    switch (expr.kind) {
      case 'SemanticType':
        return expr.description;
      case 'EnumType':
        return expr.values.map((v: string) => `"${v}"`).join(' | ');
      case 'TypeReference':
        return `$${expr.name}`;
      case 'CompoundType':
        return `(${expr.elements.map((e: AST.TypeExpr) => this.typeExprToString(e)).join(', ')})`;
      case 'ArrayType':
        return `${this.typeExprToString(expr.elementType)}[]`;
      case 'FunctionType':
        return `(${expr.params.join(', ')}) => ${this.typeExprToString(expr.returnType)}`;
      default:
        return '';
    }
  }

  // ==========================================================================
  // Semantic Tokens
  // ==========================================================================

  getSemanticTokensLegend(): SemanticTokensLegend {
    return {
      tokenTypes: [...this.semanticTokenTypes],
      tokenModifiers: [],
    };
  }

  getSemanticTokens(uri: string): SemanticTokens {
    const state = this.documents.get(uri);
    if (!state) return { data: [] };

    const tokens: Array<{ line: number; char: number; length: number; type: number; modifiers: number }> = [];
    const lineOffsets = this.buildLineOffsets(state.content);
    const codeLines = this.collectCodeBlockLines(state.ast);
    const lines = state.content.split('\n');
    const frontmatterLines = new Set<number>();
    if (state.ast.frontmatter) {
      const start = state.ast.frontmatter.span.start.line;
      const end = state.ast.frontmatter.span.end.line;
      for (let line = start; line <= end; line += 1) {
        frontmatterLines.add(line);
      }
    }

    const addToken = (line: number, char: number, length: number, type: string): void => {
      if (length <= 0) return;
      const typeIndex = this.semanticTokenTypeIndex.get(type);
      if (typeIndex === undefined) return;
      tokens.push({ line, char, length, type: typeIndex, modifiers: 0 });
    };

    const addSpanToken = (span: AST.Span, type: string): void => {
      if (span.start.line !== span.end.line) return;
      addToken(span.start.line - 1, span.start.column, span.end.column - span.start.column, type);
    };

    const addLineToken = (lineIndex: number, length: number, type: string): void => {
      if (length <= 0) return;
      addToken(lineIndex, 0, length, type);
    };

    const addFrontmatterTokens = (): void => {
      if (!state.ast.frontmatter) return;
      const start = state.ast.frontmatter.span.start.line - 1;
      const end = state.ast.frontmatter.span.end.line - 1;
      for (let lineIndex = start; lineIndex <= end; lineIndex += 1) {
        const line = lines[lineIndex] ?? '';
        const trimmed = line.trim();
        if (trimmed === '---') {
          addLineToken(lineIndex, line.length, 'frontmatter');
          continue;
        }
        const match = line.match(/^\s*[A-Za-z0-9_-]+:/);
        if (match) {
          addToken(lineIndex, match.index ?? 0, match[0].length, 'frontmatter');
        }
      }
    };

    const headingPattern = /^#+\s+/;
    const inlineKeywordPattern = /\b(THEN|IN|WITH|TO)\b/g;

    const addHeadingFromLine = (lineIndex: number, line: string): void => {
      if (codeLines.has(lineIndex + 1) || frontmatterLines.has(lineIndex + 1)) return;
      if (!headingPattern.test(line)) return;
      addLineToken(lineIndex, line.length, 'heading');
    };

    const addInlineKeywordFromLine = (lineIndex: number, line: string): void => {
      if (codeLines.has(lineIndex + 1) || frontmatterLines.has(lineIndex + 1)) return;
      inlineKeywordPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = inlineKeywordPattern.exec(line))) {
        addToken(lineIndex, match.index, match[0].length, 'keyword');
      }
    };

    const addSemanticMarkerFromLine = (lineIndex: number, line: string): void => {
      if (codeLines.has(lineIndex + 1) || frontmatterLines.has(lineIndex + 1)) return;
      const markerPattern = /\/[^\/\n]+\//g;
      let match: RegExpExecArray | null;
      markerPattern.lastIndex = 0;
      while ((match = markerPattern.exec(line))) {
        addToken(lineIndex, match.index, match[0].length, 'semanticSpan');
      }
    };

    const addTemplateTokensFromLine = (lineIndex: number, line: string): void => {
      if (codeLines.has(lineIndex + 1)) return;
      const templatePattern = /`[^`]*`/g;
      const variablePattern = /\$\/[^\/\n]+\/|\$[A-Za-z][A-Za-z0-9-]*/g;
      let templateMatch: RegExpExecArray | null;
      templatePattern.lastIndex = 0;
      while ((templateMatch = templatePattern.exec(line))) {
        const fullStart = templateMatch.index;
        const fullEnd = templateMatch.index + templateMatch[0].length;
        const content = templateMatch[0].slice(1, -1);
        let cursor = fullStart;
        variablePattern.lastIndex = 0;
        let varMatch: RegExpExecArray | null;
        while ((varMatch = variablePattern.exec(content))) {
          const varStart = fullStart + 1 + varMatch.index;
          if (cursor < varStart) {
            addToken(lineIndex, cursor, varStart - cursor, 'string');
          }
          addToken(lineIndex, varStart, varMatch[0].length, 'variable');
          cursor = varStart + varMatch[0].length;
        }
        if (cursor < fullEnd) {
          addToken(lineIndex, cursor, fullEnd - cursor, 'string');
        }
      }
    };

    const addFrontmatterInlineTokens = (lineIndex: number, line: string): void => {
      if (!frontmatterLines.has(lineIndex + 1)) return;
      if (line.trim() === '---') return;
      const patterns: Array<{ regex: RegExp; type: string }> = [
        { regex: /\$\/[^\/\n]+\//g, type: 'variable' },
        { regex: /\$[A-Z][A-Za-z0-9]*/g, type: 'type' },
        { regex: /\$[a-z][A-Za-z0-9-]*/g, type: 'variable' },
        { regex: /"[^"]*"/g, type: 'string' },
        { regex: /\b-?\d+(?:\.\d+)?\b/g, type: 'number' },
      ];
      for (const { regex, type } of patterns) {
        let match: RegExpExecArray | null;
        regex.lastIndex = 0;
        while ((match = regex.exec(line))) {
          addToken(lineIndex, match.index, match[0].length, type);
        }
      }
      const semanticTypeMatch = line.match(
        /(\$[A-Za-z][A-Za-z0-9-]*\s*:\s+)(?!\$|"|\()([^\n=]+)/,
      );
      if (semanticTypeMatch && semanticTypeMatch.index !== undefined) {
        const matchStart = semanticTypeMatch.index + semanticTypeMatch[1].length;
        let matchEnd = semanticTypeMatch.index + semanticTypeMatch[0].length;
        while (matchEnd > matchStart && /\s/.test(line[matchEnd - 1])) {
          matchEnd -= 1;
        }
        addToken(lineIndex, matchStart, matchEnd - matchStart, 'semanticSpan');
      }
    };

    const addStringToken = (span: AST.Span): void => {
      if (span.start.line !== span.end.line) return;
      const lineIndex = span.start.line - 1;
      const line = lines[lineIndex] ?? '';
      let start = span.start.column;
      let length = span.end.column - span.start.column;

      if (start >= 1 && line[start - 1] === '"') {
        start -= 1;
        length += 1;
      } else if (start >= 2 && line[start - 2] === '"') {
        start -= 2;
        length += 2;
      }

      if (start + length < line.length && line[start + length] === '"') {
        length += 1;
      }

      addToken(lineIndex, start, length, 'string');
    };

    const addKeywordFromLine = (lineIndex: number, line: string): void => {
      if (codeLines.has(lineIndex + 1)) return;
      const match = line.match(/^\s*(ELSE IF|ELSE|IF|FOR|WHILE|DO|END|RETURN|BREAK|CONTINUE|ASYNC|AWAIT|DELEGATE|USE|EXECUTE|GOTO)\b/);
      if (!match) return;
      const keyword = match[1];
      const start = line.indexOf(keyword);
      if (start >= 0) {
        addToken(lineIndex, start, keyword.length, 'keyword');
      }
    };

    const addOperatorToken = (span: AST.Span, operator: string): void => {
      const startOffset = span.start.offset;
      const endOffset = span.end.offset;
      const slice = state.content.slice(startOffset, endOffset);
      let index = -1;
      if (operator === 'AND' || operator === 'OR' || operator === 'NOT') {
        const regex = new RegExp(`\\b${operator}\\b`);
        const match = slice.match(regex);
        if (match && match.index !== undefined) {
          index = match.index;
        }
      } else {
        index = slice.indexOf(operator);
      }
      if (index < 0) return;
      const pos = this.offsetToPosition(startOffset + index, lineOffsets);
      const tokenType = operator === 'AND' || operator === 'OR' || operator === 'NOT' ? 'keyword' : 'operator';
      addToken(pos.line, pos.character, operator.length, tokenType);
    };

    const addNameToken = (
      lineIndex: number,
      startColumn: number,
      endColumn: number,
      name: string,
      type: string,
      allowBare: boolean
    ): void => {
      if (codeLines.has(lineIndex + 1)) return;
      const line = lines[lineIndex] || '';
      const searchStart = Math.max(0, startColumn);
      const searchEnd = endColumn > 0 ? Math.min(line.length, endColumn) : line.length;
      const slice = line.slice(searchStart, searchEnd);
      let matchIndex = slice.indexOf(name);
      if (matchIndex === -1 && allowBare) {
        const bare = name.replace(/^\$/, '');
        const regex = new RegExp(`\\b${bare}\\b`);
        const match = slice.match(regex);
        if (match && match.index !== undefined) {
          matchIndex = match.index;
          addToken(lineIndex, searchStart + matchIndex, bare.length, type);
          return;
        }
        return;
      }
      if (matchIndex === -1) return;
      addToken(lineIndex, searchStart + matchIndex, name.length, type);
    };

    const addVariableNameToken = (span: AST.Span, name: string): void => {
      const lineIndex = span.start.line - 1;
      addNameToken(lineIndex, span.start.column, span.end.column, `$${name}`, 'variable', true);
    };

    const addTypeNameToken = (span: AST.Span, name: string): void => {
      const lineIndex = span.start.line - 1;
      addNameToken(lineIndex, span.start.column, span.end.column, `$${name}`, 'type', false);
    };

    const addSemanticSpanTokens = (span: AST.SemanticMarker): void => {
      if (span.span.start.line !== span.span.end.line) {
        addSpanToken(span.span, 'semanticSpan');
        return;
      }
      const lineIndex = span.span.start.line - 1;
      const spanStart = span.span.start.column;
      const spanEnd = span.span.end.column;
      const interpolations = span.interpolations
        .filter((interp: AST.VariableReference) => interp.span.start.line === span.span.start.line)
        .sort((a: AST.VariableReference, b: AST.VariableReference) => a.span.start.column - b.span.start.column);
      let cursor = spanStart;
      for (const interpolation of interpolations) {
        const varStart = interpolation.span.start.column;
        const varEnd = interpolation.span.end.column;
        if (varStart > cursor) {
          addToken(lineIndex, cursor, varStart - cursor, 'semanticSpan');
        }
        if (varEnd > varStart) {
          addToken(lineIndex, varStart, varEnd - varStart, 'variable');
        }
        cursor = Math.max(cursor, varEnd);
      }
      if (cursor < spanEnd) {
        addToken(lineIndex, cursor, spanEnd - cursor, 'semanticSpan');
      }
    };

    const addEnumTokens = (expr: AST.EnumType): void => {
      if (expr.span.start.line !== expr.span.end.line) return;
      const lineIndex = expr.span.start.line - 1;
      const line = lines[lineIndex] ?? '';
      const start = Math.max(0, expr.span.start.column - 2);
      const end = Math.min(line.length, expr.span.end.column + 2);
      if (end <= start) return;
      const stringPattern = /"[^"]*"/g;
      let match: RegExpExecArray | null;
      while ((match = stringPattern.exec(line))) {
        const tokenStart = match.index;
        const tokenEnd = match.index + match[0].length;
        if (tokenStart >= start && tokenEnd <= end) {
          addToken(lineIndex, tokenStart, match[0].length, 'string');
        }
      }
    };

    const collectTypeExprTokens = (expr: AST.TypeExpr): void => {
      switch (expr.kind) {
        case 'SemanticType':
          addSpanToken(expr.span, 'semanticSpan');
          break;
        case 'EnumType':
          addEnumTokens(expr);
          break;
        case 'CompoundType':
          expr.elements.forEach(collectTypeExprTokens);
          break;
        case 'ArrayType':
          collectTypeExprTokens(expr.elementType);
          break;
        case 'FunctionType':
          collectTypeExprTokens(expr.returnType);
          break;
        case 'TypeReference':
          addSpanToken(expr.span, 'type');
          break;
      }
    };

    const collectExpressionTokens = (expr: AST.Expression): void => {
      switch (expr.kind) {
        case 'VariableReference':
          addSpanToken(expr.span, 'variable');
          break;
        case 'InferredVariable':
          addSpanToken(expr.span, 'variable');
          break;
        case 'StringLiteral':
          addStringToken(expr.span);
          break;
        case 'NumberLiteral':
          addSpanToken(expr.span, 'number');
          break;
        case 'BooleanLiteral':
          addSpanToken(expr.span, 'keyword');
          break;
        case 'Link':
          addSpanToken(expr.span, 'link');
          break;
        case 'Anchor':
          addSpanToken(expr.span, 'anchor');
          break;
        case 'TemplateLiteral':
          for (const part of expr.parts) {
            if (typeof part !== 'string') {
              collectExpressionTokens(part);
            }
          }
          break;
        case 'ArrayLiteral':
          for (const el of expr.elements) {
            collectExpressionTokens(el);
          }
          break;
        case 'BinaryExpression':
          collectExpressionTokens(expr.left);
          collectExpressionTokens(expr.right);
          addOperatorToken(expr.span, expr.operator);
          break;
        case 'UnaryExpression':
          collectExpressionTokens(expr.operand);
          addOperatorToken(expr.span, expr.operator);
          break;
        case 'LambdaExpression':
          collectExpressionTokens(expr.body);
          break;
        case 'FunctionCall':
          collectExpressionTokens(expr.callee);
          for (const arg of expr.args) {
            collectExpressionTokens(arg);
          }
          break;
        case 'MemberAccess':
          collectExpressionTokens(expr.object);
          break;
        case 'InlineText':
          break;
      }
    };

    const collectConditionTokens = (cond: AST.Condition): void => {
      switch (cond.kind) {
        case 'SemanticCondition':
          addSpanToken(cond.span, 'semanticSpan');
          break;
        case 'DeterministicCondition':
          collectExpressionTokens(cond.left);
          collectExpressionTokens(cond.right);
          addOperatorToken(cond.span, cond.operator);
          break;
        case 'CompoundCondition':
          collectConditionTokens(cond.left);
          collectConditionTokens(cond.right);
          addOperatorToken(cond.span, cond.operator);
          break;
      }
    };

    const collectBlockTokens = (sectionTitle: string, blocks: AST.Block[]): void => {
      const isLegacySection = sectionTitle === 'Types' || sectionTitle === 'Input' || sectionTitle === 'Context';

      for (const block of blocks) {
        switch (block.kind) {
          case 'TypeDefinition':
            if (!isLegacySection) {
              addTypeNameToken(block.span, block.name);
              collectTypeExprTokens(block.typeExpr);
            }
            break;

          case 'VariableDeclaration':
            if (!isLegacySection) {
              addVariableNameToken(block.span, block.name);
              if (block.typeAnnotation) {
                if (block.typeAnnotation.kind === 'TypeReference') {
                  addTypeNameToken(block.typeAnnotation.span, block.typeAnnotation.name);
                } else if (block.typeAnnotation.kind === 'SemanticType') {
                  addSpanToken(block.typeAnnotation.span, 'semanticSpan');
                }
              }
            }
            if (block.value) {
              collectExpressionTokens(block.value);
            }
            break;
          case 'ForEachStatement':
            if (block.pattern.kind === 'SimplePattern') {
              addVariableNameToken(block.pattern.span, block.pattern.name);
            } else {
              for (const name of block.pattern.names) {
                addVariableNameToken(block.pattern.span, name);
              }
            }
            collectExpressionTokens(block.collection);
            collectBlockTokens(sectionTitle, block.body);
            break;
          case 'WhileStatement':
            collectConditionTokens(block.condition);
            collectBlockTokens(sectionTitle, block.body);
            break;
          case 'IfStatement':
            collectConditionTokens(block.condition);
            collectBlockTokens(sectionTitle, block.thenBody);
            for (const clause of block.elseIf) {
              collectConditionTokens(clause.condition);
              collectBlockTokens(sectionTitle, clause.body);
            }
            if (block.elseBody) {
              collectBlockTokens(sectionTitle, block.elseBody);
            }
            break;
          case 'DoStatement': {
            const doBlock = block as AST.DoStatement & { body?: AST.Block[] };
            if (doBlock.instruction) {
              addSemanticSpanTokens(doBlock.instruction);
            }
            if (doBlock.body) {
              collectBlockTokens(sectionTitle, doBlock.body);
            }
            break;
          }
          case 'ReturnStatement':
            if (block.value) {
              collectExpressionTokens(block.value);
            }
            break;
          case 'PushStatement':
            collectExpressionTokens(block.target);
            collectExpressionTokens(block.value);
            break;
          case 'DelegateStatement':
            if (block.task) addSemanticSpanTokens(block.task);
            if (block.target) addSpanToken(block.target.span, 'link');
            if (block.withAnchor) addSpanToken(block.withAnchor.span, 'anchor');
            if (block.parameters) {
              for (const param of block.parameters.parameters) {
                addVariableNameToken(param.span, param.name);
                if (param.value) collectExpressionTokens(param.value);
              }
            }
            break;
          case 'UseStatement':
            addSpanToken(block.link.span, 'link');
            addSemanticSpanTokens(block.task);
            if (block.parameters) {
              for (const param of block.parameters.parameters) {
                addVariableNameToken(param.span, param.name);
                if (param.value) collectExpressionTokens(param.value);
              }
            }
            break;
          case 'ExecuteStatement':
            addSpanToken(block.link.span, 'link');
            addSemanticSpanTokens(block.task);
            break;
          case 'GotoStatement':
            addSpanToken(block.anchor.span, 'anchor');
            break;
          case 'Delegation':
            addSpanToken(block.target.span, block.target.kind === 'Link' ? 'link' : 'anchor');
            for (const param of block.parameters) {
              addVariableNameToken(param.span, param.name);
              if (param.value) collectExpressionTokens(param.value);
            }
            break;
          case 'Paragraph':
            for (const item of block.content) {
              switch (item.kind) {
                case 'VariableReference':
                case 'InferredVariable':
                  addSpanToken(item.span, 'variable');
                  break;
                case 'Link':
                  addSpanToken(item.span, 'link');
                  break;
                case 'Anchor':
                  addSpanToken(item.span, 'anchor');
                  break;
                case 'CodeSpan':
                  break;
              }
            }
            break;
          case 'CodeBlock':
          case 'List':
          case 'HorizontalRule':
            break;
        }
      }
    };

    for (const section of state.ast.sections) {
      collectBlockTokens(section.title, section.content);
    }

    addFrontmatterTokens();

    for (let i = 0; i < lines.length; i += 1) {
      addHeadingFromLine(i, lines[i]);
      addKeywordFromLine(i, lines[i]);
      addInlineKeywordFromLine(i, lines[i]);
      addSemanticMarkerFromLine(i, lines[i]);
      addTemplateTokensFromLine(i, lines[i]);
      addFrontmatterInlineTokens(i, lines[i]);
    }

    tokens.sort((a, b) => (a.line - b.line) || (a.char - b.char));

    const data: number[] = [];
    let prevLine = 0;
    let prevChar = 0;
    for (const token of tokens) {
      const deltaLine = token.line - prevLine;
      const deltaChar = deltaLine === 0 ? token.char - prevChar : token.char;
      data.push(deltaLine, deltaChar, token.length, token.type, token.modifiers);
      prevLine = token.line;
      prevChar = token.char;
    }

    return { data };
  }

  // ==========================================================================
  // Diagnostics
  // ==========================================================================

  private getDiagnostics(state: DocumentState): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    for (const error of state.ast.errors) {
      diagnostics.push({
        range: this.spanToRange(error.span),
        severity: DiagnosticSeverity.Error,
        message: error.message,
        source: 'zen',
      });
    }

    for (const ref of state.references) {
      if (ref.kind === 'link' && ref.path) {
        const linkPath = ref.path.join('/');
        const targetState = this.skillRegistry.get(linkPath);
        
        if (!targetState) {
          diagnostics.push({
            range: this.spanToRange(ref.span),
            severity: DiagnosticSeverity.Information,
            message: `File not found in workspace: ~/${linkPath}`,
            source: 'zen',
          });
        } else if (ref.anchor) {
          const section = targetState.ast.sections.find((s: AST.Section) => s.anchor === ref.anchor);
          if (!section) {
            diagnostics.push({
              range: this.spanToRange(ref.span),
              severity: DiagnosticSeverity.Warning,
              message: `Section "${ref.anchor}" not found in ~/${linkPath}`,
              source: 'zen',
            });
          }
        }
      } else if (ref.kind === 'anchor' && ref.anchor) {
        const section = state.ast.sections.find((s: AST.Section) => s.anchor === ref.anchor);
        if (!section) {
          diagnostics.push({
            range: this.spanToRange(ref.span),
            severity: DiagnosticSeverity.Warning,
            message: `Section "${ref.anchor}" not found in current file`,
            source: 'zen',
          });
        }
      }
    }

    this.validateDelegationContracts(state, diagnostics);

    return diagnostics;
  }

  // ==========================================================================
  // Go-to-Definition
  // ==========================================================================

  getDefinition(uri: string, position: Position): Location | null {
    const state = this.documents.get(uri);
    if (!state) return null;

    // 1. Check variable references (usage first)
    for (const [name, spans] of state.variableRefs) {
      for (const span of spans) {
        if (this.positionInSpan(position, span)) {
          const info = state.variables.get(name);
          if (info) return { uri, range: this.spanToRange(info.span) };
        }
      }
    }

    // 2. Check variable declarations
    for (const [name, info] of state.variables) {
      if (this.positionInSpan(position, info.span)) {
        return { uri, range: this.spanToRange(info.span) };
      }
    }

    // 3. Check type references (usage first)
    for (const [name, spans] of state.typeRefs) {
      for (const span of spans) {
        if (this.positionInSpan(position, span)) {
          const info = state.types.get(name);
          if (info) return { uri, range: this.spanToRange(info.span) };
        }
      }
    }

    // 4. Check type declarations
    for (const [name, info] of state.types) {
      if (this.positionInSpan(position, info.span)) {
        return { uri, range: this.spanToRange(info.span) };
      }
    }

    // 5. Check link or anchor reference
    for (const ref of state.references) {
      if (!this.positionInSpan(position, ref.span)) continue;
      
      if (ref.kind === 'link' && ref.path) {
        const linkPath = ref.path.join('/');
        const targetState = this.skillRegistry.get(linkPath);
        
        if (targetState) {
          if (ref.anchor) {
            const section = targetState.ast.sections.find((s: AST.Section) => s.anchor === ref.anchor);
            if (section) return { uri: targetState.uri, range: this.spanToRange(section.span) };
          }
          return { uri: targetState.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
        }
      } else if (ref.kind === 'anchor' && ref.anchor) {
        const section = state.ast.sections.find((s: AST.Section) => s.anchor === ref.anchor);
        if (section) return { uri, range: this.spanToRange(section.span) };
      }
    }

    return null;
  }

  // ==========================================================================
  // Hover
  // ==========================================================================

  getHover(uri: string, position: Position): Hover | null {
    const state = this.documents.get(uri);
    if (!state) return null;

    // Check types (usage and decl)
    for (const [name, info] of state.types) {
      const spans = state.typeRefs.get(name) || [];
      const matchesUsage = spans.some(s => this.positionInSpan(position, s));
      if (matchesUsage || this.positionInSpan(position, info.span)) {
        return {
          contents: `**Type** $${name}\n\n${info.definition}`,
          range: this.spanToRange(info.span),
        };
      }
    }

    // Check variables (usage and decl)
    for (const [name, info] of state.variables) {
      const spans = state.variableRefs.get(name) || [];
      const matchesUsage = spans.some(s => this.positionInSpan(position, s));
      if (matchesUsage || this.positionInSpan(position, info.span)) {
        let contents = `**Variable** $${name}`;
        const typeExpr = info.typeExpr || this.inferVariableType(state, name);
        if (typeExpr) {
          contents += `: ${this.typeExprToString(typeExpr)}`;
          if (typeExpr.kind === "TypeReference") {
            const type = state.types.get(typeExpr.name);
            if (type) contents += `\n\n${type.definition}`;
          }
        }
        if (info.source !== "local") contents += `\n\n*${info.source}*`;
        if (info.isLambda) contents += "\n\n*Lambda function*";
        return { contents, range: this.spanToRange(info.span) };
      }
    }

    for (const ref of state.references) {
      if (this.positionInSpan(position, ref.span)) {
        let contents: string;
        if (ref.kind === 'link' && ref.path) {
          const linkPath = ref.path.join('/');
          const linkKind = this.inferLinkKind(ref.path);
          const targetState = this.skillRegistry.get(linkPath);
          if (!targetState) {
            contents = `**${linkKind}:** ${ref.target}\n\n*Not found in workspace*`;
          } else {
            contents = `**${linkKind}:** ${ref.target}`;
            if (targetState.ast.frontmatter?.description) contents += `\n\n${targetState.ast.frontmatter.description}`;
            const sections = targetState.ast.sections.filter((s: AST.Section) => s.anchor).map((s: AST.Section) => s.anchor);
            if (sections.length > 0) contents += `\n\nSections: ${sections.join(', ')}`;
            if (targetState.parameters.length > 0) {
              contents += `\n\n**Input Contract:**\n` + targetState.parameters.map(p => 
                `- $${p.name}: ${this.typeExprToString(p.typeExpr)}${p.isRequired ? '' : ' (optional)'}`
              ).join('\n');
            }
          }
        } else if (ref.kind === 'anchor') {
          const section = state.ast.sections.find((s: AST.Section) => s.anchor === ref.anchor);
          contents = `**Anchor** ${ref.target}`;
          if (section?.title) contents += `\n\nSection: ${section.title}`;
        } else continue;
        return { contents, range: this.spanToRange(ref.span) };
      }
    }

    return null;
  }

  private inferVariableType(state: DocumentState, name: string): AST.TypeExpr | undefined {
    const existing = state.variableTypes.get(name);
    if (existing) return existing;
    for (const section of state.ast.sections) {
      for (const block of section.content) {
        if (block.kind === 'VariableDeclaration' && block.name === name && block.value) {
          return inferType(block.value, state.typeEnv);
        }
      }
    }
    return undefined;
  }

  // ==========================================================================
  // Completion
  // ==========================================================================

  getCompletions(uri: string, position: Position): CompletionItem[] {
    const state = this.documents.get(uri);
    if (!state) return [];

    const lineContent = state.content.split('\n')[position.line] || '';
    const beforeCursor = lineContent.substring(0, position.character);

    if (beforeCursor.endsWith('~/')) return this.getPathCompletions('');
    const linkMatch = beforeCursor.match(/~\/([a-z0-9\/-]*)$/);
    if (linkMatch) {
      const partial = linkMatch[1];
      const anchorInLink = partial.match(/^([^#]+)#([a-z0-9-]*)$/);
      if (anchorInLink) return this.getCrossFileAnchorCompletions(anchorInLink[1], anchorInLink[2]);
      return this.getPathCompletions(partial);
    }

    if (beforeCursor.endsWith('#') && !beforeCursor.match(/~\/[^#]*#$/)) return this.getAnchorCompletions(state);
    const anchorMatch = beforeCursor.match(/(?<!~\/[^#]*)#([a-z0-9-]+)$/);
    if (anchorMatch) {
      return this.getAnchorCompletions(state).filter(c => c.label.toLowerCase().startsWith(anchorMatch[1].toLowerCase()));
    }

    if (beforeCursor.endsWith('$')) return [...this.getVariableCompletions(state), ...this.getTypeCompletions(state)];
    const varMatch = beforeCursor.match(/\$([a-zA-Z0-9-]*)$/);
    if (varMatch) {
      const prefix = varMatch[1].toLowerCase();
      return [...this.getVariableCompletions(state), ...this.getTypeCompletions(state)].filter(c => c.label.toLowerCase().startsWith(prefix));
    }

    if (beforeCursor.endsWith('/')) return this.getSemanticCompletions();
    if (/^\s*$/.test(beforeCursor)) return this.getKeywordCompletions();

    return [];
  }

  private getPathCompletions(partial: string): CompletionItem[] {
    const items: CompletionItem[] = [];
    for (const key of this.skillRegistry.keys()) {
      if (key.startsWith(partial)) {
        items.push({ label: "~/" + key, kind: CompletionItemKind.File, detail: this.inferLinkKind(key.split("/")), insertText: key });
      }
    }
    return items;
  }

  private getCrossFileAnchorCompletions(linkPath: string, prefix: string): CompletionItem[] {
    const targetState = this.skillRegistry.get(linkPath);
    if (!targetState) return [];
    return targetState.ast.sections
      .filter(s => s.anchor && s.anchor.startsWith(prefix))
      .map(s => ({ label: '#' + s.anchor, kind: CompletionItemKind.Reference, detail: s.title || 'Section', insertText: s.anchor!.substring(prefix.length) }));
  }

  private getAnchorCompletions(state: DocumentState): CompletionItem[] {
    return state.ast.sections
      .filter(s => s.anchor)
      .map(s => ({ label: '#' + s.anchor, kind: CompletionItemKind.Reference, detail: s.title || 'Section', insertText: s.anchor! }));
  }

  private getVariableCompletions(state: DocumentState): CompletionItem[] {
    const items: CompletionItem[] = [];
    for (const [name, info] of state.variables) {
      const typeExpr = info.typeExpr || this.inferVariableType(state, name);
      items.push({ label: name, kind: info.isLambda ? CompletionItemKind.Function : CompletionItemKind.Variable, detail: typeExpr ? this.typeExprToString(typeExpr) : undefined });
    }
    return items;
  }

  private getTypeCompletions(state: DocumentState): CompletionItem[] {
    const items: CompletionItem[] = [];
    for (const [name, info] of state.types) items.push({ label: name, kind: CompletionItemKind.Class, detail: info.definition });
    for (const name of ['FilePath', 'String', 'Number', 'Boolean']) items.push({ label: name, kind: CompletionItemKind.Class, detail: `Built-in type` });
    return items;
  }

  private getSemanticCompletions(): CompletionItem[] {
    return [
      { label: 'appropriate location', kind: CompletionItemKind.Snippet, insertText: 'appropriate location/' },
      { label: 'relevant context', kind: CompletionItemKind.Snippet, insertText: 'relevant context/' },
      { label: 'best approach for', kind: CompletionItemKind.Snippet, insertText: 'best approach for /' },
      { label: 'determine based on', kind: CompletionItemKind.Snippet, insertText: 'determine based on /' },
    ];
  }

  private getKeywordCompletions(): CompletionItem[] {
    return [
      { label: 'FOR', kind: CompletionItemKind.Keyword, insertText: 'FOR $item IN $items\n  \nEND' },
      { label: 'WHILE', kind: CompletionItemKind.Keyword, insertText: 'WHILE /condition/ DO\n  \nEND' },
      { label: 'IF', kind: CompletionItemKind.Keyword, insertText: 'IF $condition THEN\n  \nEND' },
      { label: 'ELSE', kind: CompletionItemKind.Keyword, insertText: 'ELSE\n  ' },
      { label: 'DO', kind: CompletionItemKind.Keyword, insertText: 'DO\n  \nEND' },
      { label: 'END', kind: CompletionItemKind.Keyword, insertText: 'END' },
    ];
  }

  private inferLinkKind(path: string[]): string {
    const folder = path[0];
    if (folder === 'agent' || folder === 'agents') return 'agent';
    if (folder === 'skill' || folder === 'skills') return 'skill';
    if (folder === 'tool' || folder === 'tools') return 'tool';
    return 'link';
  }

  getDocumentSymbols(uri: string): DocumentSymbol[] {
    const state = this.documents.get(uri);
    if (!state) return [];
    const symbols: DocumentSymbol[] = [];
    for (const section of state.ast.sections) {
      if (section.title === 'Types' || section.title === 'Input' || section.title === 'Context') continue;
      const children: DocumentSymbol[] = [];
      for (const block of section.content) {
        if (block.kind === 'VariableDeclaration') {
          children.push({ name: `$${block.name}`, kind: block.isLambda ? SymbolKind.Function : SymbolKind.Variable, range: this.spanToRange(block.span), selectionRange: this.spanToRange(block.span) });
        }
      }
      symbols.push({ name: section.title || '(untitled)', kind: SymbolKind.Namespace, range: this.spanToRange(section.span), selectionRange: this.spanToRange(section.span), children: children.length > 0 ? children : undefined });
    }
    return symbols;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private spanToRange(span: AST.Span): Range {
    return { start: { line: span.start.line - 1, character: span.start.column }, end: { line: span.end.line - 1, character: span.end.column } };
  }

  private positionInSpan(pos: Position, span: AST.Span): boolean {
    const line = pos.line + 1;
    const char = pos.character;
    if (line < span.start.line || line > span.end.line) return false;
    if (line === span.start.line && char < span.start.column) return false;
    if (line === span.end.line && char > span.end.column) return false;
    return true;
  }

  private buildLineOffsets(content: string): number[] {
    const offsets: number[] = [0];
    let current = 0;
    for (const char of content) {
      current += 1;
      if (char === '\n') offsets.push(current);
    }
    return offsets;
  }

  private offsetToPosition(offset: number, lineOffsets: number[]): Position {
    let line = 0;
    while (line + 1 < lineOffsets.length && lineOffsets[line + 1] <= offset) line += 1;
    return { line, character: offset - (lineOffsets[line] ?? 0) };
  }

  private collectCodeBlockLines(ast: AST.Document): Set<number> {
    const lines = new Set<number>();
    for (const section of ast.sections) {
      for (const block of section.content) {
        if (block.kind !== 'CodeBlock') continue;
        for (let l = block.span.start.line; l <= block.span.end.line; l++) lines.add(l);
      }
    }
    return lines;
  }

  private collectParameters(ast: AST.Document): ParameterInfo[] {
    const params: ParameterInfo[] = [];
    if (ast.frontmatter) {
      for (const inputDecl of ast.frontmatter.input) {
        params.push({ name: inputDecl.name, typeExpr: inputDecl.type ?? makeAnyTypeReference(), isRequired: inputDecl.required, span: inputDecl.span });
      }
    }
    for (const section of ast.sections) {
      if (section.title !== 'Input') continue;
      for (const block of section.content) {
        if (block.kind !== 'VariableDeclaration') continue;
        params.push({ name: block.name, typeExpr: block.typeAnnotation ?? makeAnyTypeReference(), isRequired: block.isRequired ?? block.value === null, span: block.span });
      }
    }
    return params;
  }

  private buildTypeEnv(types: Map<string, TypeInfo>, ast: AST.Document): TypeEnv {
    const env: TypeEnv = new Map();
    for (const [name, info] of types) env.set(name, info.typeExpr);
    if (ast.frontmatter) {
      for (const typeDecl of ast.frontmatter.types) env.set(typeDecl.name, typeDecl.typeExpr);
    }
    return env;
  }

  private buildVariableTypes(variables: Map<string, VariableInfo>): Map<string, AST.TypeExpr> {
    const map = new Map<string, AST.TypeExpr>();
    for (const [name, info] of variables) {
      if (info.typeExpr) map.set(name, info.typeExpr);
      else if (info.isLambda) map.set(name, makeAnyTypeReference());
    }
    return map;
  }

  private validateDelegationContracts(state: DocumentState, diagnostics: Diagnostic[]): void {
    for (const section of state.ast.sections) {
      this.validateContractsInBlocks(section.title, section.content, state, diagnostics);
    }
  }

  private validateContractsInBlocks(sectionTitle: string, blocks: AST.Block[], state: DocumentState, diagnostics: Diagnostic[]): void {
    for (const block of blocks) {
      switch (block.kind) {
        case 'Delegation': this.validateDelegation(block, state, diagnostics); break;
        case 'DelegateStatement': this.validateDelegateStatement(block, state, diagnostics); break;
        case 'UseStatement': this.validateUseStatement(block, state, diagnostics); break;
        case 'ForEachStatement':
        case 'WhileStatement': this.validateContractsInBlocks(sectionTitle, block.body, state, diagnostics); break;
        case 'IfStatement':
          this.validateContractsInBlocks(sectionTitle, block.thenBody, state, diagnostics);
          for (const clause of block.elseIf) this.validateContractsInBlocks(sectionTitle, clause.body, state, diagnostics);
          if (block.elseBody) this.validateContractsInBlocks(sectionTitle, block.elseBody, state, diagnostics);
          break;
        case 'DoStatement': if (block.body) this.validateContractsInBlocks(sectionTitle, block.body, state, diagnostics); break;
      }
    }
  }

  private validateDelegation(deleg: AST.Delegation, state: DocumentState, diagnostics: Diagnostic[]): void {
    if (deleg.target.kind === 'Link') this.validateParameterBlock(deleg.parameters, deleg.target, state, diagnostics);
  }

  private validateDelegateStatement(deleg: AST.DelegateStatement, state: DocumentState, diagnostics: Diagnostic[]): void {
    if (deleg.target && deleg.parameters) this.validateParameterBlock(deleg.parameters.parameters, deleg.target, state, diagnostics);
  }

  private validateUseStatement(stmt: AST.UseStatement, state: DocumentState, diagnostics: Diagnostic[]): void {
    if (stmt.parameters) this.validateParameterBlock(stmt.parameters.parameters, stmt.link, state, diagnostics);
  }

  private validateParameterBlock(parameters: AST.VariableDeclaration[], target: AST.LinkNode, state: DocumentState, diagnostics: Diagnostic[]): void {
    const targetPath = target.path.join('/');
    const targetState = this.skillRegistry.get(targetPath);
    if (!targetState) return;
    const requiredParams = targetState.parameters.filter(p => p.isRequired);
    const provided = new Set(parameters.map(p => p.name));
    for (const req of requiredParams) {
      if (!provided.has(req.name)) {
        diagnostics.push({ range: this.spanToRange(target.span), severity: DiagnosticSeverity.Error, message: `Required parameter "${req.name}" is missing for "${targetPath}"`, source: 'zen' });
      }
    }
    for (const param of parameters) {
      const expected = targetState.parameters.find(p => p.name === param.name);
      if (!expected) {
        diagnostics.push({ range: this.spanToRange(param.span), severity: DiagnosticSeverity.Warning, message: `Parameter "${param.name}" is not defined for "${targetPath}"`, source: 'zen' });
        continue;
      }
      const actualType = this.inferParameterType(param, state);
      const compatibility = isCompatible(actualType, expected.typeExpr, targetState.typeEnv);
      if (!compatibility.compatible) {
        diagnostics.push({ range: this.spanToRange(param.span), severity: DiagnosticSeverity.Error, message: `Parameter "${param.name}" expects ${this.typeExprToString(expected.typeExpr)} but received ${this.typeExprToString(actualType)}`, source: 'zen' });
      }
    }
  }

  private inferParameterType(param: AST.VariableDeclaration, state: DocumentState): AST.TypeExpr {
    if (param.typeAnnotation) return param.typeAnnotation;
    if (param.value) return inferType(param.value, state.variableTypes);
    return makeAnyTypeReference();
  }

  private collectFrontmatterDeclarationSpans(content: string): { types: Map<string, AST.Span>; input: Map<string, AST.Span>; context: Map<string, AST.Span>; } {
    const maps = { types: new Map<string, AST.Span>(), input: new Map<string, AST.Span>(), context: new Map<string, AST.Span>(), };
    const lines = content.split('\n');
    if (lines[0]?.trim() !== '---') return maps;
    let offset = lines[0].length + 1;
    let currentSection: keyof typeof maps | null = null;
    let sectionIndent: number | null = null;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.trim() === '---') break;
      const indent = line.search(/\S/);
      const sectionMatch = line.match(/^\s*(types|input|context):\s*$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1] as keyof typeof maps;
        sectionIndent = indent;
      } else if (currentSection && (sectionIndent === null || indent > sectionIndent)) {
        const entryMatch = line.match(/^\s*(\$?[A-Za-z0-9_-]+)\s*:/);
        if (entryMatch) {
          const name = entryMatch[1].replace(/^\$/, "");
          const start = entryMatch.index ?? 0;
          maps[currentSection].set(name, AST.createSpan(i + 1, start, offset + start, i + 1, start + entryMatch[0].length, offset + start + entryMatch[0].length));
        }
      } else {
        currentSection = null;
        sectionIndent = null;
      }
      offset += line.length + 1;
    }
    return maps;
  }
}

export function createLanguageServer(): ZenLanguageServer {
  return new ZenLanguageServer();
}
