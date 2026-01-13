/**
 * MDZ Compiler - v0.8 Link-Based References
 * 
 * The compiler validates MDZ source and extracts metadata.
 * It does NOT transform source - the LLM sees MDZ as authored.
 * 
 * Key change from v0.2: Removed all expansion/transformation logic.
 * The compiler now validates, extracts dependency graphs, and checks contracts.
 * 
 * v0.8 changes:
 * - Link-based references replace sigil-based syntax
 * - LinkNode: ~/path/to/file or ~/path/to/file#anchor
 * - AnchorNode: #section (same-file reference)
 * - Dependencies inferred from links, not frontmatter uses:
 * - Type inferred from folder: ~/agent/x → agent, ~/skill/x → skill, ~/tool/x → tool
 */

import { parse } from '../parser/parser';
import * as AST from '../parser/ast';

// ============================================================================
// Types
// ============================================================================

export interface CompileOptions {
  /** Include header comment in output (for debugging) */
  includeHeader: boolean;
  /** Generate source map for debugging */
  generateSourceMap: boolean;
  /** Validate references exist (requires registry) */
  validateReferences: boolean;
  /** Check type consistency */
  validateTypes: boolean;
  /** Check variable scope */
  validateScope: boolean;
  /** Check contract matching for delegations */
  validateContracts: boolean;
}

export interface SourceMapEntry {
  source: AST.Span;
  type: 'type-def' | 'variable' | 'reference' | 'semantic' | 'control-flow';
  name: string;
}

export interface CompileResult {
  /** The original source, unchanged (we don't transform) */
  output: string;
  /** Validation diagnostics */
  diagnostics: Diagnostic[];
  /** Extracted metadata */
  metadata: DocumentMetadata;
  /** Source map entries (for IDE integration) */
  sourceMap: SourceMapEntry[];
  /** Dependency graph */
  dependencies: DependencyGraph;
}

export interface DocumentMetadata {
  name: string;
  description: string;
  skills: string[];     // v0.7: extracted from uses: with ~ sigil
  agents: string[];     // v0.7: extracted from uses: with @ sigil
  tools: string[];      // v0.7: extracted from uses: with ! sigil
  uses: string[];       // v0.7: raw uses array (for backward compat)
  imports: ImportInfo[];
  types: TypeInfo[];
  variables: VariableInfo[];
  references: ReferenceInfo[];
  sections: SectionInfo[];
  parameters: VariableInfo[];
}

export interface ImportInfo {
  path: string;
  skills: string[];
  aliases: Map<string, string>;
}

export interface TypeInfo {
  name: string;
  definition: string;
  span: AST.Span;
}

export interface VariableInfo {
  name: string;
  type: string | null;
  hasDefault: boolean;
  isRequired: boolean;
  span: AST.Span;
}

// v0.8: Reference info based on LinkNode and AnchorNode
export interface ReferenceInfo {
  kind: 'skill' | 'section' | 'agent' | 'tool' | 'anchor';
  target: string;      // Full path for links, name for anchors
  path?: string[];     // For links: the path segments
  anchor?: string;     // For links with anchors or anchor references
  span: AST.Span;
}

export interface SectionInfo {
  title: string;
  anchor: string;
  level: number;
  span: AST.Span;
}

export interface DependencyGraph {
  /** Skills this document depends on (from uses: and [[refs]]) */
  nodes: string[];
  /** Edges from this document to dependencies */
  edges: DependencyEdge[];
  /** Detected cycles (if any) */
  cycles: string[][];
}

export interface DependencyEdge {
  target: string;
  type: 'uses' | 'imports' | 'reference';
  span?: AST.Span;
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  span: AST.Span;
}

export interface SkillRegistry {
  get(name: string): SkillContent | undefined;
  getSection(skillName: string, sectionName: string): string | undefined;
  list(): string[];
}

export interface SkillContent {
  name: string;
  source: string;
  ast: AST.Document;
}

// ============================================================================
// Built-in Types
// ============================================================================

/**
 * Built-in primitive types that don't require explicit definition.
 * Using these types will not trigger "type not defined" warnings.
 */
const BUILTIN_PRIMITIVES = new Set(['String', 'Number', 'Boolean']);

// ============================================================================
// Compiler
// ============================================================================

export class Compiler {
  private options: CompileOptions;
  private registry: SkillRegistry | null;
  private diagnostics: Diagnostic[] = [];
  private sourceMap: SourceMapEntry[] = [];
  private metadata: DocumentMetadata;
  private dependencies: DependencyGraph;
  private definedTypes: Set<string> = new Set();
  private definedVariables: Set<string> = new Set();
  private declaredDeps: Set<string> = new Set();
  private declaredAgents: Set<string> = new Set();  // v0.7: Track declared agents from uses:
  private declaredTools: Set<string> = new Set();   // v0.7: Track declared tools from uses:

  constructor(options: Partial<CompileOptions> = {}, registry?: SkillRegistry) {
    this.options = {
      includeHeader: false,  // Changed default: no header
      generateSourceMap: true,
      validateReferences: true,
      validateTypes: true,
      validateScope: true,
      validateContracts: true,
      ...options,
    };
    this.registry = registry || null;
    this.metadata = this.createEmptyMetadata();
    this.dependencies = { nodes: [], edges: [], cycles: [] };
  }

  private createEmptyMetadata(): DocumentMetadata {
    return {
      name: '',
      description: '',
      skills: [],
      agents: [],
      tools: [],
      uses: [],  // v0.7: raw uses array for reference
      imports: [],
      types: [],
      variables: [],
      references: [],
      sections: [],
      parameters: [],
    };
  }

  compile(source: string): CompileResult {
    // Reset state
    this.diagnostics = [];
    this.sourceMap = [];
    this.metadata = this.createEmptyMetadata();
    this.dependencies = { nodes: [], edges: [], cycles: [] };
    this.definedTypes.clear();
    this.definedVariables.clear();
    this.declaredDeps.clear();
    this.declaredAgents.clear();
    this.declaredTools.clear();

    // Parse source
    const ast = parse(source);

    // Collect parse errors
    for (const error of ast.errors) {
      this.diagnostics.push({
        severity: 'error',
        code: error.code,
        message: error.message,
        span: error.span,
      });
    }

    // Extract metadata and validate
    this.extractMetadata(ast);
    this.buildDependencyGraph(ast);
    
    if (this.options.validateTypes) {
      this.validateTypes(ast);
    }
    if (this.options.validateScope) {
      this.validateScope(ast);
    }
    if (this.options.validateReferences) {
      this.validateReferences();
    }
    if (this.options.validateContracts) {
      this.validateContracts(ast);
    }
    
    // v0.3: Validate DELEGATE statements
    this.validateDelegateStatements(ast);

    // Output is the original source, unchanged
    // We only prepend a header if requested (for debugging)
    let output = source;
    if (this.options.includeHeader) {
      const header = `<!-- MDZ Validated: ${this.metadata.name || 'unnamed'} -->\n<!-- Errors: ${this.diagnostics.filter(d => d.severity === 'error').length}, Warnings: ${this.diagnostics.filter(d => d.severity === 'warning').length} -->\n\n`;
      output = header + source;
    }

    return {
      output,
      diagnostics: this.diagnostics,
      metadata: this.metadata,
      sourceMap: this.sourceMap,
      dependencies: this.dependencies,
    };
  }

  // ==========================================================================
  // Metadata Extraction
  // ==========================================================================

  private extractMetadata(ast: AST.Document): void {
    // Extract frontmatter
    if (ast.frontmatter) {
      this.metadata.name = ast.frontmatter.name;
      this.metadata.description = ast.frontmatter.description;
      this.metadata.skills = [...ast.frontmatter.skills];
      this.metadata.agents = [...ast.frontmatter.agents];
      this.metadata.tools = [...ast.frontmatter.tools];
      this.metadata.uses = [...ast.frontmatter.uses];
      
      // v0.7: Track declared dependencies (skills)
      for (const skill of ast.frontmatter.skills) {
        this.declaredDeps.add(skill);
      }
      
      // v0.7: Track declared agents
      for (const agent of ast.frontmatter.agents) {
        this.declaredAgents.add(agent);
      }

      // v0.7: Track declared tools
      for (const tool of ast.frontmatter.tools) {
        this.declaredTools.add(tool);
      }

      // Extract imports
      for (const imp of ast.frontmatter.imports) {
        this.metadata.imports.push({
          path: imp.path,
          skills: [...imp.skills],
          aliases: new Map(imp.aliases),
        });
        // Track imported skills as declared deps
        for (const skill of imp.skills) {
          this.declaredDeps.add(skill);
        }
      }
    }

    // Extract sections
    for (const section of ast.sections) {
      if (section.title) {
        this.metadata.sections.push({
          title: section.title,
          anchor: section.anchor,
          level: section.level,
          span: section.span,
        });
      }

      // Extract parameters from Input section
      if (section.title === 'Input') {
        this.extractParameters(section.content);
      }

      // Extract types, variables, and references from section content
      this.extractFromBlocks(section.content);
    }
  }

  private extractFromBlocks(blocks: AST.Block[]): void {
    for (const block of blocks) {
      this.extractFromBlock(block);
    }
  }

  private extractFromBlock(block: AST.Block): void {
    switch (block.kind) {
      case 'TypeDefinition':
        this.extractTypeDefinition(block);
        break;
      case 'VariableDeclaration':
        this.extractVariableDeclaration(block);
        break;
      case 'ForEachStatement':
      case 'ParallelForEachStatement':
        this.extractFromControlFlow(block);
        break;
      case 'WhileStatement':
        this.extractFromBlocks(block.body);
        break;
      case 'IfStatement':
        this.extractFromBlocks(block.thenBody);
        if (block.elseBody) {
          this.extractFromBlocks(block.elseBody);
        }
        break;
      case 'Paragraph':
        this.extractFromParagraph(block);
        break;
      case 'Delegation':
        this.extractFromDelegation(block);
        break;
      case 'DelegateStatement':
        this.extractFromDelegateStatement(block);
        break;
      case 'UseStatement':
        this.extractFromUseStatement(block);
        break;
      case 'ExecuteStatement':
        this.extractFromExecuteStatement(block);
        break;
      case 'GotoStatement':
        this.extractFromGotoStatement(block);
        break;
    }
  }

  private extractTypeDefinition(def: AST.TypeDefinition): void {
    const typeInfo: TypeInfo = {
      name: def.name,
      definition: this.typeExprToString(def.typeExpr),
      span: def.span,
    };
    this.metadata.types.push(typeInfo);
    this.definedTypes.add(def.name);

    this.sourceMap.push({
      source: def.span,
      type: 'type-def',
      name: def.name,
    });
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
        return '(' + expr.elements.map(e => this.typeExprToString(e)).join(', ') + ')';
      case 'ArrayType':
        return this.typeExprToString(expr.elementType) + '[]';
      case 'FunctionType':
        return `(${expr.params.join(', ')}) => ${this.typeExprToString(expr.returnType)}`;
      default:
        return '';
    }
  }

  private extractVariableDeclaration(decl: AST.VariableDeclaration): void {
    const varInfo: VariableInfo = {
      name: decl.name,
      type: this.getTypeAnnotationName(decl.typeAnnotation),
      hasDefault: decl.value !== null,
      isRequired: decl.isRequired || false,
      span: decl.span,
    };
    this.metadata.variables.push(varInfo);
    this.definedVariables.add(decl.name);

    this.sourceMap.push({
      source: decl.span,
      type: 'variable',
      name: decl.name,
    });

    // Extract references from value expression
    if (decl.value) {
      this.extractFromExpression(decl.value);
    }
  }

  private extractFromControlFlow(stmt: AST.ForEachStatement | AST.ParallelForEachStatement): void {
    // Track loop variable
    if (stmt.pattern.kind === 'SimplePattern') {
      this.definedVariables.add(stmt.pattern.name);
    } else {
      for (const name of stmt.pattern.names) {
        this.definedVariables.add(name);
      }
    }

    this.sourceMap.push({
      source: stmt.span,
      type: 'control-flow',
      name: stmt.kind,
    });

    this.extractFromExpression(stmt.collection);
    this.extractFromBlocks(stmt.body);
  }

  private extractFromParagraph(para: AST.Paragraph): void {
    for (const content of para.content) {
      if (content.kind === 'Link') {
        // v0.8: Link reference (~/path/to/file or ~/path/to/file#anchor)
        this.extractLinkReference(content);
      } else if (content.kind === 'Anchor') {
        // v0.8: Anchor reference (#section)
        this.extractAnchorReference(content);
      } else if (content.kind === 'SemanticMarker') {
        this.sourceMap.push({
          source: content.span,
          type: 'semantic',
          name: content.content,
        });
      } else if (content.kind === 'InferredVariable') {
        // InferredVariable nodes ($/name/) are intentionally unresolved
        // They don't need extraction - the LLM infers them at runtime
        this.sourceMap.push({
          source: content.span,
          type: 'semantic',
          name: `$/` + content.name + `/`,
        });
      }
    }
  }

  private extractFromDelegation(deleg: AST.Delegation): void {
    // v0.8: Delegation target is now LinkNode or AnchorNode
    if (deleg.target.kind === 'Link') {
      this.extractLinkReference(deleg.target);
    } else {
      this.extractAnchorReference(deleg.target);
    }
    
    for (const param of deleg.parameters) {
      this.extractVariableDeclaration(param);
    }
  }

  // v0.8: Extract metadata from DELEGATE statement
  private extractFromDelegateStatement(deleg: AST.DelegateStatement): void {
    // v0.8: Extract from target link (~/agent/x)
    this.extractLinkReference(deleg.target);
    
    // Extract from task semantic marker (optional in v0.8.1)
    if (deleg.task) {
      this.sourceMap.push({
        source: deleg.task.span,
        type: 'semantic',
        name: deleg.task.content,
      });
    }
    
    // Extract from withAnchor if present
    if (deleg.withAnchor) {
      this.extractAnchorReference(deleg.withAnchor);
    }
    
    // Extract from parameters if present
    if (deleg.parameters) {
      for (const param of deleg.parameters.parameters) {
        this.extractVariableDeclaration(param);
      }
    }
    
    // Add source map entry
    this.sourceMap.push({
      source: deleg.span,
      type: 'control-flow',
      name: 'DelegateStatement',
    });
  }

  // v0.8: Extract metadata from USE statement
  private extractFromUseStatement(stmt: AST.UseStatement): void {
    // Extract from skill link (~/skill/x)
    this.extractLinkReference(stmt.link);
    
    // Extract from task semantic marker
    this.sourceMap.push({
      source: stmt.task.span,
      type: 'semantic',
      name: stmt.task.content,
    });
    
    // Extract from parameters if present
    if (stmt.parameters) {
      for (const param of stmt.parameters.parameters) {
        this.extractVariableDeclaration(param);
      }
    }
    
    // Add source map entry
    this.sourceMap.push({
      source: stmt.span,
      type: 'control-flow',
      name: 'UseStatement',
    });
  }

  // v0.8: Extract metadata from EXECUTE statement
  private extractFromExecuteStatement(stmt: AST.ExecuteStatement): void {
    // Extract from tool link (~/tool/x)
    this.extractLinkReference(stmt.link);
    
    // Extract from task semantic marker
    this.sourceMap.push({
      source: stmt.task.span,
      type: 'semantic',
      name: stmt.task.content,
    });
    
    // Add source map entry
    this.sourceMap.push({
      source: stmt.span,
      type: 'control-flow',
      name: 'ExecuteStatement',
    });
  }

  // v0.8: Extract metadata from GOTO statement
  private extractFromGotoStatement(stmt: AST.GotoStatement): void {
    // Extract anchor reference (#section)
    this.extractAnchorReference(stmt.anchor);
    
    // Add source map entry
    this.sourceMap.push({
      source: stmt.span,
      type: 'control-flow',
      name: 'GotoStatement',
    });
  }

  private extractParameters(blocks: AST.Block[]): void {
    for (const block of blocks) {
      if (block.kind === 'VariableDeclaration') {
        this.metadata.parameters.push({
          name: block.name,
          type: this.getTypeAnnotationName(block.typeAnnotation),
          hasDefault: block.value !== null,
          isRequired: !block.value,
          span: block.span,
        });
      }
    }
  }

  private getTypeAnnotationName(typeAnnotation: AST.TypeReference | AST.SemanticType | null): string | null {
    if (!typeAnnotation) return null;
    if (typeAnnotation.kind === 'TypeReference') {
      return typeAnnotation.name;
    }
    // For SemanticType, return the description as the type name
    return typeAnnotation.description;
  }

  private extractFromExpression(expr: AST.Expression): void {
    switch (expr.kind) {
      // v0.8: Link and Anchor references replace old sigil-based syntax
      case 'Link':
        this.extractLinkReference(expr);
        break;
      case 'Anchor':
        this.extractAnchorReference(expr);
        break;
      case 'SemanticMarker':
        this.sourceMap.push({
          source: expr.span,
          type: 'semantic',
          name: expr.content,
        });
        break;
      case 'InferredVariable':
        // InferredVariable ($/name/) nodes are intentionally unresolved
        // They don't need extraction - the LLM infers them at runtime
        this.sourceMap.push({
          source: expr.span,
          type: 'semantic',
          name: `$/` + expr.name + `/`,
        });
        break;
      case 'BinaryExpression':
        this.extractFromExpression(expr.left);
        this.extractFromExpression(expr.right);
        break;
      case 'UnaryExpression':
        this.extractFromExpression(expr.operand);
        break;
      case 'ArrayLiteral':
        for (const el of expr.elements) {
          this.extractFromExpression(el);
        }
        break;
      case 'FunctionCall':
        this.extractFromExpression(expr.callee);
        for (const arg of expr.args) {
          this.extractFromExpression(arg);
        }
        break;
      case 'MemberAccess':
        this.extractFromExpression(expr.object);
        break;
      case 'LambdaExpression':
        this.extractFromExpression(expr.body);
        break;
    }
  }

  // v0.8: Extract link reference (~/path/to/file or ~/path/to/file#anchor)
  private extractLinkReference(link: AST.LinkNode): void {
    const kind = AST.getLinkKind(link);
    const target = link.raw;
    
    this.metadata.references.push({
      kind: kind === 'unknown' ? 'skill' : kind,  // Default to skill for unknown
      target,
      path: link.path,
      anchor: link.anchor || undefined,
      span: link.span,
    });

    this.sourceMap.push({
      source: link.span,
      type: 'reference',
      name: target,
    });
  }

  // v0.8: Extract anchor reference (#section)
  private extractAnchorReference(anchor: AST.AnchorNode): void {
    this.metadata.references.push({
      kind: 'anchor',
      target: `#${anchor.name}`,
      anchor: anchor.name,
      span: anchor.span,
    });

    this.sourceMap.push({
      source: anchor.span,
      type: 'reference',
      name: `#${anchor.name}`,
    });
  }

  // ==========================================================================
  // Dependency Graph
  // ==========================================================================

  private buildDependencyGraph(ast: AST.Document): void {
    const nodes = new Set<string>();
    const edges: DependencyEdge[] = [];

    // v0.8: Dependencies are inferred from link references
    // No longer using frontmatter uses:
    for (const ref of this.metadata.references) {
      // Only link-based references (not anchors) create dependencies
      if (ref.path && ref.path.length > 0) {
        const depPath = ref.path.join('/');
        nodes.add(depPath);
        edges.push({ target: depPath, type: 'reference', span: ref.span });
      }
    }

    this.dependencies.nodes = Array.from(nodes);
    this.dependencies.edges = edges;

    // Cycle detection would require the full graph of all skills
    // For now, we just report the local dependency structure
    // Full cycle detection requires the registry to have all skills loaded
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  private validateTypes(ast: AST.Document): void {
    // Check that type references resolve to defined types
    for (const varInfo of this.metadata.variables) {
      if (varInfo.type && !this.definedTypes.has(varInfo.type)) {
        // Skip built-in primitive types - they don't need explicit definition
        if (BUILTIN_PRIMITIVES.has(varInfo.type)) {
          continue;
        }
        this.diagnostics.push({
          severity: 'warning',
          code: 'E008',
          message: `Type '$${varInfo.type}' is not defined in this document`,
          span: varInfo.span,
        });
      }
    }
  }

  private validateScope(ast: AST.Document): void {
    // Check that variables are defined before use
    // This is a simplified check - full implementation would track scope properly
    const usedBeforeDefined = new Set<string>();

    for (const section of ast.sections) {
      this.checkScopeInBlocks(section.content, usedBeforeDefined);
    }
  }

  private checkScopeInBlocks(blocks: AST.Block[], usedBeforeDefined: Set<string>): void {
    for (const block of blocks) {
      if (block.kind === 'VariableDeclaration') {
        // Variable is being defined
        this.definedVariables.add(block.name);
        // Check if value uses undefined variables
        if (block.value) {
          this.checkExpressionScope(block.value, usedBeforeDefined);
        }
      } else if (block.kind === 'ForEachStatement' || block.kind === 'ParallelForEachStatement') {
        // Check collection expression
        this.checkExpressionScope(block.collection, usedBeforeDefined);
        // Loop variable is defined for body
        if (block.pattern.kind === 'SimplePattern') {
          this.definedVariables.add(block.pattern.name);
        } else {
          for (const name of block.pattern.names) {
            this.definedVariables.add(name);
          }
        }
        this.checkScopeInBlocks(block.body, usedBeforeDefined);
      } else if (block.kind === 'WhileStatement') {
        this.checkScopeInBlocks(block.body, usedBeforeDefined);
      } else if (block.kind === 'IfStatement') {
        this.checkScopeInBlocks(block.thenBody, usedBeforeDefined);
        if (block.elseBody) {
          this.checkScopeInBlocks(block.elseBody, usedBeforeDefined);
        }
      } else if (block.kind === 'Paragraph') {
        for (const content of block.content) {
          if (content.kind === 'VariableReference') {
            if (!this.definedVariables.has(content.name)) {
              usedBeforeDefined.add(content.name);
            }
          } else if (content.kind === 'SemanticMarker') {
            // Validate $var references inside semantic markers
            for (const interpolation of content.interpolations) {
              if (!this.definedVariables.has(interpolation.name)) {
                usedBeforeDefined.add(interpolation.name);
              }
            }
          }
          // InferredVariable ($/name/) nodes are intentionally unresolved
          // They don't need scope validation - the LLM infers them at runtime
        }
      } else if (block.kind === 'DelegateStatement') {
        // v0.8: Check scope in DELEGATE statement
        // Target is a LinkNode, task is a SemanticMarker - both can have variable interpolations
        if (block.task) {
          for (const interpolation of block.task.interpolations) {
            if (!this.definedVariables.has(interpolation.name)) {
              usedBeforeDefined.add(interpolation.name);
            }
          }
        }
        if (block.parameters) {
          for (const param of block.parameters.parameters) {
            if (param.value) {
              this.checkExpressionScope(param.value, usedBeforeDefined);
            }
          }
        }
      }
    }
  }

  private checkExpressionScope(expr: AST.Expression, usedBeforeDefined: Set<string>): void {
    if (expr.kind === 'VariableReference') {
      if (!this.definedVariables.has(expr.name)) {
        // Don't report as error - could be a semantic reference
        // Just track it
        usedBeforeDefined.add(expr.name);
      }
    } else if (expr.kind === 'InferredVariable') {
      // InferredVariable ($/name/) nodes are intentionally unresolved
      // They don't need scope validation - the LLM infers them at runtime
      // Do nothing - this is by design
    } else if (expr.kind === 'SemanticMarker') {
      // Validate $var references inside semantic markers
      for (const interpolation of expr.interpolations) {
        if (!this.definedVariables.has(interpolation.name)) {
          usedBeforeDefined.add(interpolation.name);
        }
      }
    } else if (expr.kind === 'BinaryExpression') {
      this.checkExpressionScope(expr.left, usedBeforeDefined);
      this.checkExpressionScope(expr.right, usedBeforeDefined);
    } else if (expr.kind === 'UnaryExpression') {
      this.checkExpressionScope(expr.operand, usedBeforeDefined);
    } else if (expr.kind === 'ArrayLiteral') {
      for (const el of expr.elements) {
        this.checkExpressionScope(el, usedBeforeDefined);
      }
    }
  }

  private validateReferences(): void {
    // v0.8: Validate link references - check that files exist
    // This is done via registry if available
    
    // Validate anchor references (same-file section refs)
    for (const ref of this.metadata.references) {
      if (ref.kind === 'anchor' && ref.anchor) {
        const sectionExists = this.metadata.sections.some(s => s.anchor === ref.anchor);
        if (!sectionExists) {
          this.diagnostics.push({
            severity: 'error',
            code: 'E010',
            message: `Section '#${ref.anchor}' does not exist in this document`,
            span: ref.span,
          });
        }
      }
    }

    // If registry available, check that referenced files exist
    if (this.registry) {
      for (const ref of this.metadata.references) {
        // Only validate link references (those with paths)
        if (ref.path && ref.path.length > 0) {
          const depPath = ref.path.join('/');
          const skill = this.registry.get(depPath);
          if (!skill) {
            this.diagnostics.push({
              severity: 'error',
              code: 'E009',
              message: `File '${ref.target}' is not found in registry`,
              span: ref.span,
            });
          } else if (ref.anchor) {
            // Check that anchor exists in target file
            const targetSection = skill.ast.sections.find(s => s.anchor === ref.anchor);
            if (!targetSection) {
              this.diagnostics.push({
                severity: 'error',
                code: 'E010',
                message: `Section '#${ref.anchor}' does not exist in '${ref.target}'`,
                span: ref.span,
              });
            }
          }
        }
      }
    }
  }

  // v0.3: Validate DELEGATE statements
  private validateDelegateStatements(ast: AST.Document): void {
    const delegateStatements: AST.DelegateStatement[] = [];
    this.findDelegateStatements(ast.sections, delegateStatements);
    
    for (const deleg of delegateStatements) {
      this.validateDelegateAgent(deleg);
    }
  }
  
  private findDelegateStatements(sections: AST.Section[], statements: AST.DelegateStatement[]): void {
    for (const section of sections) {
      this.findDelegateStatementsInBlocks(section.content, statements);
    }
  }
  
  private findDelegateStatementsInBlocks(blocks: AST.Block[], statements: AST.DelegateStatement[]): void {
    for (const block of blocks) {
      if (block.kind === 'DelegateStatement') {
        statements.push(block);
      } else if (block.kind === 'ForEachStatement' || block.kind === 'ParallelForEachStatement') {
        this.findDelegateStatementsInBlocks(block.body, statements);
      } else if (block.kind === 'WhileStatement') {
        this.findDelegateStatementsInBlocks(block.body, statements);
      } else if (block.kind === 'IfStatement') {
        this.findDelegateStatementsInBlocks(block.thenBody, statements);
        for (const elseIf of block.elseIf) {
          this.findDelegateStatementsInBlocks(elseIf.body, statements);
        }
        if (block.elseBody) {
          this.findDelegateStatementsInBlocks(block.elseBody, statements);
        }
      }
    }
  }
  
  private validateDelegateAgent(deleg: AST.DelegateStatement): void {
    // v0.8: Validate that DELEGATE target is an agent (based on path)
    const linkKind = AST.getLinkKind(deleg.target);
    
    if (linkKind !== 'agent') {
      this.diagnostics.push({
        severity: 'warning',
        code: 'W003',
        message: `DELEGATE target '${deleg.target.raw}' should be an agent (~/agent/...)`,
        span: deleg.target.span,
      });
    }
  }

  private validateContracts(ast: AST.Document): void {
    // Find all Delegation blocks
    const delegations: AST.Delegation[] = [];
    this.findDelegations(ast.sections, delegations);

    for (const deleg of delegations) {
      // v0.8: Delegation target is LinkNode or AnchorNode
      if (deleg.target.kind === 'Link') {
        this.validateDelegationParameters(deleg);
      }
      // Anchor delegations are same-file, no parameter validation needed
    }
  }

  private findDelegations(sections: AST.Section[], delegations: AST.Delegation[]): void {
    for (const section of sections) {
      this.findDelegationsInBlocks(section.content, delegations);
    }
  }

  private findDelegationsInBlocks(blocks: AST.Block[], delegations: AST.Delegation[]): void {
    for (const block of blocks) {
      if (block.kind === 'Delegation') {
        delegations.push(block);
      } else if (block.kind === 'ForEachStatement' || block.kind === 'ParallelForEachStatement') {
        this.findDelegationsInBlocks(block.body, delegations);
      } else if (block.kind === 'WhileStatement') {
        this.findDelegationsInBlocks(block.body, delegations);
      } else if (block.kind === 'IfStatement') {
        this.findDelegationsInBlocks(block.thenBody, delegations);
        if (block.elseBody) {
          this.findDelegationsInBlocks(block.elseBody, delegations);
        }
      }
    }
  }

  private validateDelegationParameters(deleg: AST.Delegation): void {
    // v0.8: Only Link targets have external parameters to validate
    if (deleg.target.kind !== 'Link') {
      // Anchor delegations are same-file, no external parameter validation
      return;
    }
    
    const targetPath = deleg.target.path.join('/');
    let skillParams: VariableInfo[] = [];

    // If it's the current document's skill, use this.metadata.parameters
    if (targetPath === this.metadata.name) {
      skillParams = this.metadata.parameters;
    } else if (this.registry) {
      // Get from registry
      const skill = this.registry.get(targetPath);
      if (skill) {
        const skillCompileResult = compile(skill.source, { validateReferences: false, validateContracts: false });
        skillParams = skillCompileResult.metadata.parameters;
      }
    }

    // Check provided parameters
    const providedParams = new Set(deleg.parameters.map(p => p.name));
    const requiredParams = skillParams.filter(p => p.isRequired);

    // Check missing required parameters
    for (const req of requiredParams) {
      if (!providedParams.has(req.name)) {
        this.diagnostics.push({
          severity: 'error',
          code: 'E011',
          message: `Required parameter '${req.name}' is missing for '${targetPath}'`,
          span: deleg.span,
        });
      }
    }

    // Check extra parameters (only if parameters are provided)
    if (deleg.parameters.length > 0) {
      for (const param of deleg.parameters) {
        const expected = skillParams.find(p => p.name === param.name);
        if (!expected) {
          this.diagnostics.push({
            severity: 'warning',
            code: 'W002',
            message: `Parameter '${param.name}' is not defined for '${targetPath}'`,
            span: param.span,
          });
        }
      }
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export function compile(
  source: string, 
  options?: Partial<CompileOptions>,
  registry?: SkillRegistry
): CompileResult {
  return new Compiler(options, registry).compile(source);
}

/**
 * Create a skill registry from a map of skill names to sources
 */
export function createRegistry(skills: Record<string, string>): SkillRegistry {
  const cache: Map<string, SkillContent> = new Map();
  
  return {
    get(name: string): SkillContent | undefined {
      if (cache.has(name)) {
        return cache.get(name);
      }
      
      const source = skills[name];
      if (!source) return undefined;
      
      const ast = parse(source);
      const content: SkillContent = { name, source, ast };
      cache.set(name, content);
      return content;
    },
    
    getSection(skillName: string, sectionName: string): string | undefined {
      const skill = this.get(skillName);
      if (!skill) return undefined;
      
      const section = skill.ast.sections.find(s => s.anchor === sectionName);
      if (!section) return undefined;
      
      return `[Section: ${section.title}]`;
    },

    list(): string[] {
      return Object.keys(skills);
    }
  };
}

/**
 * Extract dependency graph from multiple skills
 * Detects cycles across the entire graph
 */
export function buildFullDependencyGraph(
  registry: SkillRegistry
): { graph: Map<string, string[]>; cycles: string[][] } {
  const graph = new Map<string, string[]>();
  const skillNames = registry.list();

  // Build adjacency list
  for (const name of skillNames) {
    const skill = registry.get(name);
    if (skill) {
      const result = compile(skill.source, { validateReferences: false });
      graph.set(name, result.dependencies.nodes);
    }
  }

  // Detect cycles using DFS
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        dfs(dep);
      } else if (recStack.has(dep)) {
        // Found cycle
        const cycleStart = path.indexOf(dep);
        cycles.push([...path.slice(cycleStart), dep]);
      }
    }

    path.pop();
    recStack.delete(node);
  }

  for (const name of skillNames) {
    if (!visited.has(name)) {
      dfs(name);
    }
  }

  return { graph, cycles };
}
