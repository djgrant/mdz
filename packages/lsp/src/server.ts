/**
 * MDZ Language Server
 * 
 * A minimal LSP implementation for MDZ files.
 * Supports:
 * - Go-to-definition for [[references]] and $variables
 * - Hover information for types
 * - Autocomplete after [[, $, and {~~
 * - Diagnostics for undefined references
 * - Document symbols
 */

import { parse, AST } from '@mdz/core';

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
  semanticMarkers: SemanticMarkerInfo[];
}

export interface TypeInfo {
  name: string;
  definition: string;
  span: AST.Span;
}

export interface VariableInfo {
  name: string;
  typeName?: string;
  span: AST.Span;
  isLambda: boolean;
}

export interface ReferenceInfo {
  skill: string | null;
  section: string | null;
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

  // ==========================================================================
  // Document Management
  // ==========================================================================

  openDocument(uri: string, content: string): Diagnostic[] {
    const state = this.analyzeDocument(uri, content);
    this.documents.set(uri, state);
    return this.getDiagnostics(state);
  }

  updateDocument(uri: string, content: string): Diagnostic[] {
    const state = this.analyzeDocument(uri, content);
    this.documents.set(uri, state);
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
    const semanticMarkers: SemanticMarkerInfo[] = [];

    // Extract all definitions and references
    for (const section of ast.sections) {
      this.analyzeBlocks(section.content, types, variables, references, semanticMarkers);
    }

    // Register as skill if it has a name
    if (ast.frontmatter?.name) {
      const state: DocumentState = {
        uri,
        content,
        ast,
        types,
        variables,
        references,
        semanticMarkers,
      };
      this.skillRegistry.set(ast.frontmatter.name, state);
    }

    return {
      uri,
      content,
      ast,
      types,
      variables,
      references,
      semanticMarkers,
    };
  }

  private analyzeBlocks(
    blocks: AST.Block[],
    types: Map<string, TypeInfo>,
    variables: Map<string, VariableInfo>,
    references: ReferenceInfo[],
    semanticMarkers: SemanticMarkerInfo[]
  ): void {
    for (const block of blocks) {
      switch (block.kind) {
        case 'TypeDefinition':
          types.set(block.name, {
            name: block.name,
            definition: this.typeExprToString(block.typeExpr),
            span: block.span,
          });
          break;

        case 'VariableDeclaration':
          variables.set(block.name, {
            name: block.name,
            typeName: block.typeAnnotation?.name,
            span: block.span,
            isLambda: block.isLambda,
          });
          if (block.value) {
            this.analyzeExpression(block.value, references, semanticMarkers);
          }
          break;

        case 'ForEachStatement':
          if (block.pattern.kind === 'SimplePattern') {
            variables.set(block.pattern.name, {
              name: block.pattern.name,
              span: block.pattern.span,
              isLambda: false,
            });
          } else {
            for (const name of block.pattern.names) {
              variables.set(name, {
                name,
                span: block.pattern.span,
                isLambda: false,
              });
            }
          }
          this.analyzeExpression(block.collection, references, semanticMarkers);
          this.analyzeBlocks(block.body, types, variables, references, semanticMarkers);
          break;

        case 'WhileStatement':
          this.analyzeCondition(block.condition, references, semanticMarkers);
          this.analyzeBlocks(block.body, types, variables, references, semanticMarkers);
          break;

        case 'IfStatement':
          this.analyzeCondition(block.condition, references, semanticMarkers);
          this.analyzeBlocks(block.thenBody, types, variables, references, semanticMarkers);
          if (block.elseBody) {
            this.analyzeBlocks(block.elseBody, types, variables, references, semanticMarkers);
          }
          break;

        case 'Paragraph':
          for (const item of block.content) {
            if (item.kind === 'SkillReference') {
              references.push({ skill: item.skill, section: null, span: item.span });
            } else if (item.kind === 'SectionReference') {
              references.push({ skill: item.skill, section: item.section, span: item.span });
            } else if (item.kind === 'SemanticMarker') {
              semanticMarkers.push({ content: item.content, span: item.span });
            }
          }
          break;
      }
    }
  }

  private analyzeExpression(
    expr: AST.Expression,
    references: ReferenceInfo[],
    semanticMarkers: SemanticMarkerInfo[]
  ): void {
    switch (expr.kind) {
      case 'SkillReference':
        references.push({ skill: expr.skill, section: null, span: expr.span });
        break;
      case 'SectionReference':
        references.push({ skill: expr.skill, section: expr.section, span: expr.span });
        break;
      case 'SemanticMarker':
        semanticMarkers.push({ content: expr.content, span: expr.span });
        break;
      case 'ArrayLiteral':
        for (const el of expr.elements) {
          this.analyzeExpression(el, references, semanticMarkers);
        }
        break;
      case 'TemplateLiteral':
        for (const part of expr.parts) {
          if (typeof part !== 'string') {
            this.analyzeExpression(part, references, semanticMarkers);
          }
        }
        break;
      case 'BinaryExpression':
        this.analyzeExpression(expr.left, references, semanticMarkers);
        this.analyzeExpression(expr.right, references, semanticMarkers);
        break;
      case 'LambdaExpression':
        this.analyzeExpression(expr.body, references, semanticMarkers);
        break;
      case 'FunctionCall':
        this.analyzeExpression(expr.callee, references, semanticMarkers);
        for (const arg of expr.args) {
          this.analyzeExpression(arg, references, semanticMarkers);
        }
        break;
    }
  }

  private analyzeCondition(
    cond: AST.Condition,
    references: ReferenceInfo[],
    semanticMarkers: SemanticMarkerInfo[]
  ): void {
    switch (cond.kind) {
      case 'DeterministicCondition':
        this.analyzeExpression(cond.left, references, semanticMarkers);
        this.analyzeExpression(cond.right, references, semanticMarkers);
        break;
      case 'CompoundCondition':
        this.analyzeCondition(cond.left, references, semanticMarkers);
        this.analyzeCondition(cond.right, references, semanticMarkers);
        break;
    }
  }

  private typeExprToString(expr: AST.TypeExpr): string {
    switch (expr.kind) {
      case 'SemanticType':
        return expr.description;
      case 'EnumType':
        return expr.values.map(v => `"${v}"`).join(' | ');
      case 'TypeReference':
        return `$${expr.name}`;
      case 'CompoundType':
        return `(${expr.elements.map(e => this.typeExprToString(e)).join(', ')})`;
      case 'ArrayType':
        return `${this.typeExprToString(expr.elementType)}[]`;
      case 'FunctionType':
        return `(${expr.params.join(', ')}) => ${this.typeExprToString(expr.returnType)}`;
      default:
        return '';
    }
  }

  // ==========================================================================
  // Diagnostics
  // ==========================================================================

  private getDiagnostics(state: DocumentState): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Parse errors
    for (const error of state.ast.errors) {
      diagnostics.push({
        range: this.spanToRange(error.span),
        severity: DiagnosticSeverity.Error,
        message: error.message,
        source: 'zen',
      });
    }

    // Undefined variable references
    // (simplified - would need full scope analysis for accuracy)

    // Undefined skill references
    for (const ref of state.references) {
      if (ref.skill && !this.skillRegistry.has(ref.skill)) {
        // Only warn, don't error - skill might be external
        diagnostics.push({
          range: this.spanToRange(ref.span),
          severity: DiagnosticSeverity.Information,
          message: `Skill '${ref.skill}' not found in workspace`,
          source: 'zen',
        });
      }
    }

    return diagnostics;
  }

  // ==========================================================================
  // Go-to-Definition
  // ==========================================================================

  getDefinition(uri: string, position: Position): Location | null {
    const state = this.documents.get(uri);
    if (!state) return null;

    // Check if position is on a variable reference
    for (const [name, info] of state.variables) {
      if (this.positionInSpan(position, info.span)) {
        return {
          uri,
          range: this.spanToRange(info.span),
        };
      }
    }

    // Check if position is on a type reference
    for (const [name, info] of state.types) {
      if (this.positionInSpan(position, info.span)) {
        return {
          uri,
          range: this.spanToRange(info.span),
        };
      }
    }

    // Check if position is on a skill reference
    for (const ref of state.references) {
      if (this.positionInSpan(position, ref.span) && ref.skill) {
        const targetState = this.skillRegistry.get(ref.skill);
        if (targetState) {
          // If section specified, find that section
          if (ref.section) {
            const section = targetState.ast.sections.find(s => s.anchor === ref.section);
            if (section) {
              return {
                uri: targetState.uri,
                range: this.spanToRange(section.span),
              };
            }
          }
          // Otherwise return start of document
          return {
            uri: targetState.uri,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          };
        }
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

    // Check types
    for (const [name, info] of state.types) {
      if (this.positionInSpan(position, info.span)) {
        return {
          contents: `**Type** $${name}\n\n${info.definition}`,
          range: this.spanToRange(info.span),
        };
      }
    }

    // Check variables
    for (const [name, info] of state.variables) {
      if (this.positionInSpan(position, info.span)) {
        let contents = `**Variable** $${name}`;
        if (info.typeName) {
          const type = state.types.get(info.typeName);
          contents += `: $${info.typeName}`;
          if (type) {
            contents += `\n\n${type.definition}`;
          }
        }
        if (info.isLambda) {
          contents += '\n\n*Lambda function*';
        }
        return {
          contents,
          range: this.spanToRange(info.span),
        };
      }
    }

    // Check skill references
    for (const ref of state.references) {
      if (this.positionInSpan(position, ref.span)) {
        const refStr = ref.skill 
          ? (ref.section ? `${ref.skill}#${ref.section}` : ref.skill)
          : `#${ref.section}`;
        let contents = `**Skill Reference** [[${refStr}]]`;
        
        if (ref.skill) {
          const targetState = this.skillRegistry.get(ref.skill);
          if (targetState?.ast.frontmatter) {
            contents += `\n\n${targetState.ast.frontmatter.description}`;
          }
        }
        
        return {
          contents,
          range: this.spanToRange(ref.span),
        };
      }
    }

    return null;
  }

  // ==========================================================================
  // Completion
  // ==========================================================================

  getCompletions(uri: string, position: Position): CompletionItem[] {
    const state = this.documents.get(uri);
    if (!state) return [];

    const lineContent = state.content.split('\n')[position.line] || '';
    const beforeCursor = lineContent.substring(0, position.character);

    // After [[
    if (beforeCursor.endsWith('[[')) {
      return this.getSkillCompletions();
    }

    // After [[ with partial text
    const skillMatch = beforeCursor.match(/\[\[([a-z0-9-]*)$/);
    if (skillMatch) {
      const prefix = skillMatch[1];
      return this.getSkillCompletions().filter(c => 
        c.label.toLowerCase().startsWith(prefix.toLowerCase())
      );
    }

    // After $
    if (beforeCursor.endsWith('$')) {
      return [
        ...this.getVariableCompletions(state),
        ...this.getTypeCompletions(state),
      ];
    }

    // After $ with partial text
    const varMatch = beforeCursor.match(/\$([a-zA-Z0-9-]*)$/);
    if (varMatch) {
      const prefix = varMatch[1];
      const all = [
        ...this.getVariableCompletions(state),
        ...this.getTypeCompletions(state),
      ];
      return all.filter(c => 
        c.label.toLowerCase().startsWith(prefix.toLowerCase())
      );
    }

    // After {~~
    if (beforeCursor.endsWith('{~~')) {
      return this.getSemanticCompletions();
    }

    // Control flow keywords at start of line
    if (/^\s*$/.test(beforeCursor)) {
      return this.getKeywordCompletions();
    }

    return [];
  }

  private getSkillCompletions(): CompletionItem[] {
    const items: CompletionItem[] = [];
    
    for (const [name, state] of this.skillRegistry) {
      items.push({
        label: name,
        kind: CompletionItemKind.Module,
        detail: state.ast.frontmatter?.description,
        insertText: name + ']]',
      });
    }

    return items;
  }

  private getVariableCompletions(state: DocumentState): CompletionItem[] {
    const items: CompletionItem[] = [];

    for (const [name, info] of state.variables) {
      items.push({
        label: name,
        kind: info.isLambda ? CompletionItemKind.Function : CompletionItemKind.Variable,
        detail: info.typeName ? `$${info.typeName}` : undefined,
      });
    }

    return items;
  }

  private getTypeCompletions(state: DocumentState): CompletionItem[] {
    const items: CompletionItem[] = [];

    // User-defined types
    for (const [name, info] of state.types) {
      items.push({
        label: name,
        kind: CompletionItemKind.Class,
        detail: info.definition,
      });
    }

    // Built-in types
    const builtins = ['FilePath', 'String', 'Number', 'Boolean'];
    for (const name of builtins) {
      items.push({
        label: name,
        kind: CompletionItemKind.Class,
        detail: `Built-in type`,
      });
    }

    return items;
  }

  private getSemanticCompletions(): CompletionItem[] {
    return [
      { label: 'appropriate location', kind: CompletionItemKind.Snippet, insertText: 'appropriate location}' },
      { label: 'relevant context', kind: CompletionItemKind.Snippet, insertText: 'relevant context}' },
      { label: 'best approach for', kind: CompletionItemKind.Snippet, insertText: 'best approach for }' },
      { label: 'determine based on', kind: CompletionItemKind.Snippet, insertText: 'determine based on }' },
    ];
  }

  private getKeywordCompletions(): CompletionItem[] {
    return [
      { label: 'FOR EACH', kind: CompletionItemKind.Keyword, insertText: 'FOR EACH $item IN $items:\n  - ' },
      { label: 'WHILE', kind: CompletionItemKind.Keyword, insertText: 'WHILE ($condition):\n  - ' },
      { label: 'IF', kind: CompletionItemKind.Keyword, insertText: 'IF $condition THEN:\n  - ' },
      { label: 'ELSE', kind: CompletionItemKind.Keyword, insertText: 'ELSE:\n  - ' },
    ];
  }

  // ==========================================================================
  // Document Symbols
  // ==========================================================================

  getDocumentSymbols(uri: string): DocumentSymbol[] {
    const state = this.documents.get(uri);
    if (!state) return [];

    const symbols: DocumentSymbol[] = [];

    // Sections as symbols
    for (const section of state.ast.sections) {
      const children: DocumentSymbol[] = [];

      for (const block of section.content) {
        if (block.kind === 'TypeDefinition') {
          children.push({
            name: `$${block.name}`,
            kind: SymbolKind.Class,
            range: this.spanToRange(block.span),
            selectionRange: this.spanToRange(block.span),
          });
        } else if (block.kind === 'VariableDeclaration') {
          children.push({
            name: `$${block.name}`,
            kind: block.isLambda ? SymbolKind.Function : SymbolKind.Variable,
            range: this.spanToRange(block.span),
            selectionRange: this.spanToRange(block.span),
          });
        }
      }

      symbols.push({
        name: section.title || '(untitled)',
        kind: SymbolKind.Namespace,
        range: this.spanToRange(section.span),
        selectionRange: this.spanToRange(section.span),
        children: children.length > 0 ? children : undefined,
      });
    }

    return symbols;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private spanToRange(span: AST.Span): Range {
    return {
      start: { line: span.start.line - 1, character: span.start.column },
      end: { line: span.end.line - 1, character: span.end.column },
    };
  }

  private positionInSpan(pos: Position, span: AST.Span): boolean {
    const line = pos.line + 1; // LSP is 0-based, our spans are 1-based
    const char = pos.character;

    if (line < span.start.line || line > span.end.line) return false;
    if (line === span.start.line && char < span.start.column) return false;
    if (line === span.end.line && char > span.end.column) return false;

    return true;
  }
}

// ============================================================================
// Exports
// ============================================================================

export function createLanguageServer(): ZenLanguageServer {
  return new ZenLanguageServer();
}
