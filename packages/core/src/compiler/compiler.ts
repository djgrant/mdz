/**
 * MDZ Compiler - v0.3 Validator-First Refactor
 * 
 * The compiler validates MDZ source and extracts metadata.
 * It does NOT transform source - the LLM sees MDZ as authored.
 * 
 * Key change from v0.2: Removed all expansion/transformation logic.
 * The compiler now validates, extracts dependency graphs, and checks contracts.
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
  uses: string[];
  imports: ImportInfo[];
  types: TypeInfo[];
  variables: VariableInfo[];
  references: ReferenceInfo[];
  sections: SectionInfo[];
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

export interface ReferenceInfo {
  kind: 'skill' | 'section';
  target: string;
  skill?: string;
  section?: string;
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

  constructor(options: Partial<CompileOptions> = {}, registry?: SkillRegistry) {
    this.options = {
      includeHeader: false,  // Changed default: no header
      generateSourceMap: true,
      validateReferences: true,
      validateTypes: true,
      validateScope: true,
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
      uses: [],
      imports: [],
      types: [],
      variables: [],
      references: [],
      sections: [],
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
      this.metadata.uses = [...ast.frontmatter.uses];
      
      // Track declared dependencies
      for (const use of ast.frontmatter.uses) {
        this.declaredDeps.add(use);
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
      type: decl.typeAnnotation?.name || null,
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
      if (content.kind === 'SkillReference') {
        this.extractSkillReference(content);
      } else if (content.kind === 'SectionReference') {
        this.extractSectionReference(content);
      } else if (content.kind === 'SemanticMarker') {
        this.sourceMap.push({
          source: content.span,
          type: 'semantic',
          name: content.content,
        });
      }
    }
  }

  private extractFromDelegation(deleg: AST.Delegation): void {
    if (deleg.target.kind === 'SkillReference') {
      this.extractSkillReference(deleg.target);
    } else {
      this.extractSectionReference(deleg.target);
    }
    
    for (const param of deleg.parameters) {
      this.extractVariableDeclaration(param);
    }
  }

  private extractFromExpression(expr: AST.Expression): void {
    switch (expr.kind) {
      case 'SkillReference':
        this.extractSkillReference(expr);
        break;
      case 'SectionReference':
        this.extractSectionReference(expr);
        break;
      case 'SemanticMarker':
        this.sourceMap.push({
          source: expr.span,
          type: 'semantic',
          name: expr.content,
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

  private extractSkillReference(ref: AST.SkillReference): void {
    this.metadata.references.push({
      kind: 'skill',
      target: ref.skill,
      skill: ref.skill,
      span: ref.span,
    });

    this.sourceMap.push({
      source: ref.span,
      type: 'reference',
      name: ref.skill,
    });
  }

  private extractSectionReference(ref: AST.SectionReference): void {
    this.metadata.references.push({
      kind: 'section',
      target: ref.skill ? `${ref.skill}#${ref.section}` : `#${ref.section}`,
      skill: ref.skill || undefined,
      section: ref.section,
      span: ref.span,
    });

    this.sourceMap.push({
      source: ref.span,
      type: 'reference',
      name: ref.skill ? `${ref.skill}#${ref.section}` : `#${ref.section}`,
    });
  }

  // ==========================================================================
  // Dependency Graph
  // ==========================================================================

  private buildDependencyGraph(ast: AST.Document): void {
    const nodes = new Set<string>();
    const edges: DependencyEdge[] = [];

    // Add uses: dependencies
    if (ast.frontmatter) {
      for (const use of ast.frontmatter.uses) {
        nodes.add(use);
        edges.push({ target: use, type: 'uses' });
      }

      // Add imports: dependencies
      for (const imp of ast.frontmatter.imports) {
        for (const skill of imp.skills) {
          nodes.add(skill);
          edges.push({ target: skill, type: 'imports' });
        }
      }
    }

    // Add reference dependencies
    for (const ref of this.metadata.references) {
      if (ref.kind === 'skill' && ref.skill) {
        nodes.add(ref.skill);
        edges.push({ target: ref.skill, type: 'reference', span: ref.span });
      } else if (ref.kind === 'section' && ref.skill) {
        nodes.add(ref.skill);
        edges.push({ target: ref.skill, type: 'reference', span: ref.span });
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
    // Check that skill references are declared in uses: or imports:
    for (const ref of this.metadata.references) {
      if (ref.kind === 'skill' && ref.skill) {
        if (!this.declaredDeps.has(ref.skill)) {
          this.diagnostics.push({
            severity: 'warning',
            code: 'W001',
            message: `Skill '${ref.skill}' is referenced but not declared in 'uses:' or 'imports:'`,
            span: ref.span,
          });
        }
      } else if (ref.kind === 'section' && ref.skill) {
        if (!this.declaredDeps.has(ref.skill)) {
          this.diagnostics.push({
            severity: 'warning',
            code: 'W001',
            message: `Skill '${ref.skill}' is referenced but not declared in 'uses:' or 'imports:'`,
            span: ref.span,
          });
        }
      }
    }

    // Check that local section references resolve
    for (const ref of this.metadata.references) {
      if (ref.kind === 'section' && !ref.skill && ref.section) {
        const sectionExists = this.metadata.sections.some(s => s.anchor === ref.section);
        if (!sectionExists) {
          this.diagnostics.push({
            severity: 'error',
            code: 'E010',
            message: `Section '#${ref.section}' does not exist in this document`,
            span: ref.span,
          });
        }
      }
    }

    // If registry available, check that referenced skills exist
    if (this.registry) {
      for (const ref of this.metadata.references) {
        if (ref.kind === 'skill' && ref.skill) {
          const skill = this.registry.get(ref.skill);
          if (!skill) {
            this.diagnostics.push({
              severity: 'error',
              code: 'E009',
              message: `Skill '${ref.skill}' is not found in registry`,
              span: ref.span,
            });
          }
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
