/**
 * Zen Compiler
 * 
 * Compiles zen source to LLM-ready format.
 * v0.2: Added PARALLEL FOR EACH, BREAK, CONTINUE, typed parameters, imports
 */

import { parse } from '../parser/parser';
import * as AST from '../parser/ast';

// ============================================================================
// Types
// ============================================================================

export interface CompileOptions {
  /** Expand $TypeName to include definitions */
  expandTypes: boolean;
  /** Convert [[ref]] to [ref] */
  resolveReferences: boolean;
  /** Convert {~~x} to (determine: x) */
  transformSemantics: boolean;
  /** Inline skill content from registry */
  inlineSkills: boolean;
  /** Generate source map for debugging */
  generateSourceMap: boolean;
  /** Include header comment in output */
  includeHeader: boolean;
}

export interface SourceMapEntry {
  /** Original source position */
  source: AST.Span;
  /** Compiled output position */
  compiled: AST.Span;
  /** Type of mapping */
  type: 'type' | 'variable' | 'reference' | 'semantic' | 'control-flow';
  /** Original text */
  original: string;
  /** Compiled text */
  transformed: string;
}

export interface CompileResult {
  /** Compiled output */
  output: string;
  /** Source map entries */
  sourceMap: SourceMapEntry[];
  /** Compilation statistics */
  stats: CompileStats;
  /** Any errors or warnings */
  diagnostics: Diagnostic[];
}

export interface CompileStats {
  sourceLength: number;
  outputLength: number;
  expansionRatio: number;
  typesExpanded: number;
  referencesResolved: number;
  semanticMarkersTransformed: number;
  controlFlowStatements: number;
  parallelStatements: number;      // v0.2
  breakStatements: number;          // v0.2
  continueStatements: number;       // v0.2
  importDeclarations: number;       // v0.2
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  span: AST.Span;
}

export interface SkillRegistry {
  get(name: string): SkillContent | undefined;
  getSection(skillName: string, sectionName: string): string | undefined;
}

export interface SkillContent {
  name: string;
  source: string;
  ast: AST.Document;
}

// ============================================================================
// Compiler
// ============================================================================

export class Compiler {
  private options: CompileOptions;
  private registry: SkillRegistry | null;
  private sourceMap: SourceMapEntry[] = [];
  private diagnostics: Diagnostic[] = [];
  private stats: CompileStats;
  private typeMap: Map<string, string> = new Map();

  constructor(options: Partial<CompileOptions> = {}, registry?: SkillRegistry) {
    this.options = {
      expandTypes: true,
      resolveReferences: true,
      transformSemantics: true,
      inlineSkills: false,
      generateSourceMap: true,
      includeHeader: true,
      ...options,
    };
    this.registry = registry || null;
    this.stats = {
      sourceLength: 0,
      outputLength: 0,
      expansionRatio: 0,
      typesExpanded: 0,
      referencesResolved: 0,
      semanticMarkersTransformed: 0,
      controlFlowStatements: 0,
      parallelStatements: 0,
      breakStatements: 0,
      continueStatements: 0,
      importDeclarations: 0,
    };
  }

  compile(source: string): CompileResult {
    this.stats.sourceLength = source.length;
    this.sourceMap = [];
    this.diagnostics = [];
    this.typeMap.clear();

    // Parse source
    const ast = parse(source);

    // Collect parse errors
    for (const error of ast.errors) {
      this.diagnostics.push({
        severity: 'error',
        message: error.message,
        span: error.span,
      });
    }

    // Build type map
    this.buildTypeMap(ast);

    // v0.2: Track imports
    if (ast.frontmatter?.imports) {
      this.stats.importDeclarations = ast.frontmatter.imports.length;
    }

    // Compile to output
    let output = this.compileDocument(ast);

    // Add header
    if (this.options.includeHeader) {
      const header = this.generateHeader(ast);
      output = header + output;
    }

    this.stats.outputLength = output.length;
    this.stats.expansionRatio = output.length / source.length;

    return {
      output,
      sourceMap: this.sourceMap,
      stats: this.stats,
      diagnostics: this.diagnostics,
    };
  }

  // ==========================================================================
  // Type Map
  // ==========================================================================

  private buildTypeMap(ast: AST.Document): void {
    for (const section of ast.sections) {
      for (const block of section.content) {
        if (block.kind === 'TypeDefinition') {
          const def = this.compileTypeExpr(block.typeExpr);
          this.typeMap.set(block.name, def);
        }
      }
    }
  }

  private compileTypeExpr(expr: AST.TypeExpr): string {
    switch (expr.kind) {
      case 'SemanticType':
        return expr.description;
      case 'EnumType':
        return expr.values.map(v => `"${v}"`).join(' | ');
      case 'TypeReference':
        return this.typeMap.get(expr.name) || expr.name;
      case 'CompoundType':
        return '(' + expr.elements.map(e => this.compileTypeExpr(e)).join(', ') + ')';
      case 'ArrayType':
        return this.compileTypeExpr(expr.elementType) + '[]';
      case 'FunctionType':
        return `(${expr.params.join(', ')}) => ${this.compileTypeExpr(expr.returnType)}`;
      default:
        return '';
    }
  }

  // ==========================================================================
  // Document Compilation
  // ==========================================================================

  private generateHeader(ast: AST.Document): string {
    const name = ast.frontmatter?.name || 'unknown';
    const timestamp = new Date().toISOString();
    
    return `<!-- Compiled Zen Skill: ${name} -->
<!-- Generated: ${timestamp} -->
<!-- Source map entries: ${this.sourceMap.length} -->

`;
  }

  private compileDocument(ast: AST.Document): string {
    let output = '';

    // Frontmatter
    if (ast.frontmatter) {
      output += this.compileFrontmatter(ast.frontmatter);
    }

    // Sections
    for (const section of ast.sections) {
      output += this.compileSection(section);
    }

    return output;
  }

  private compileFrontmatter(fm: AST.Frontmatter): string {
    let output = '---\n';
    output += `name: ${fm.name}\n`;
    output += `description: ${fm.description}\n`;
    if (fm.uses.length > 0) {
      output += 'uses:\n';
      for (const use of fm.uses) {
        output += `  - ${use}\n`;
      }
    }
    // v0.2: Include imports in compiled output
    if (fm.imports.length > 0) {
      output += 'imports:\n';
      for (const imp of fm.imports) {
        output += `  - path: "${imp.path}"\n`;
        if (imp.skills.length > 0) {
          output += `    skills: [${imp.skills.join(', ')}]\n`;
        }
        if (imp.aliases.size > 0) {
          output += '    alias:\n';
          for (const [from, to] of imp.aliases) {
            output += `      ${from}: ${to}\n`;
          }
        }
      }
    }
    output += '---\n\n';
    return output;
  }

  private compileSection(section: AST.Section): string {
    let output = '';

    if (section.title) {
      output += '#'.repeat(section.level) + ' ' + section.title + '\n\n';
    }

    for (const block of section.content) {
      output += this.compileBlock(block);
    }

    return output;
  }

  private compileBlock(block: AST.Block): string {
    switch (block.kind) {
      case 'TypeDefinition':
        return this.compileTypeDefinition(block);
      case 'VariableDeclaration':
        return this.compileVariableDeclaration(block);
      case 'ForEachStatement':
        return this.compileForEach(block);
      case 'ParallelForEachStatement':  // v0.2
        return this.compileParallelForEach(block);
      case 'WhileStatement':
        return this.compileWhile(block);
      case 'IfStatement':
        return this.compileIf(block);
      case 'BreakStatement':  // v0.2
        return this.compileBreak(block);
      case 'ContinueStatement':  // v0.2
        return this.compileContinue(block);
      case 'Paragraph':
        return this.compileParagraph(block);
      case 'CodeBlock':
        return this.compileCodeBlock(block);
      case 'List':
        return this.compileList(block);
      case 'HorizontalRule':
        return '---\n\n';
      case 'Delegation':
        return this.compileDelegation(block);
      default:
        return '';
    }
  }

  // ==========================================================================
  // Type Definitions
  // ==========================================================================

  private compileTypeDefinition(def: AST.TypeDefinition): string {
    const compiled = this.compileTypeExpr(def.typeExpr);
    return `$${def.name} = ${compiled}\n`;
  }

  // ==========================================================================
  // Variables
  // ==========================================================================

  private compileVariableDeclaration(decl: AST.VariableDeclaration): string {
    let output = `$${decl.name}`;

    if (decl.typeAnnotation) {
      const typeDef = this.typeMap.get(decl.typeAnnotation.name);
      if (this.options.expandTypes && typeDef) {
        output += `: ${decl.typeAnnotation.name} (${typeDef})`;
        this.stats.typesExpanded++;
        this.addSourceMap(decl.typeAnnotation.span, 'type', 
          `$${decl.typeAnnotation.name}`, 
          `${decl.typeAnnotation.name} (${typeDef})`);
      } else {
        output += `: $${decl.typeAnnotation.name}`;
      }
    }

    if (decl.value) {
      output += ' = ' + this.compileExpression(decl.value);
    } else if (decl.isRequired) {
      // v0.2: Required parameter indicator
      output += '  # Required';
    }

    return '- ' + output + '\n';
  }

  // ==========================================================================
  // Expressions
  // ==========================================================================

  private compileExpression(expr: AST.Expression): string {
    switch (expr.kind) {
      case 'StringLiteral':
        return `"${expr.value}"`;
      case 'NumberLiteral':
        return String(expr.value);
      case 'BooleanLiteral':
        return String(expr.value);
      case 'ArrayLiteral':
        return '[' + expr.elements.map(e => this.compileExpression(e)).join(', ') + ']';
      case 'TemplateLiteral':
        return this.compileTemplateLiteral(expr);
      case 'VariableReference':
        return this.compileVariableReference(expr);
      case 'FunctionCall':
        return this.compileFunctionCall(expr);
      case 'SkillReference':
        return this.compileSkillReference(expr);
      case 'SectionReference':
        return this.compileSectionReference(expr);
      case 'SemanticMarker':
        return this.compileSemanticMarker(expr);
      case 'BinaryExpression':
        return this.compileBinaryExpression(expr);
      case 'UnaryExpression':
        return this.compileUnaryExpression(expr);
      case 'MemberAccess':
        return this.compileMemberAccess(expr);
      case 'LambdaExpression':
        return this.compileLambdaExpression(expr);
      case 'InlineText':
        return expr.text;
      default:
        return '';
    }
  }

  private compileTemplateLiteral(expr: AST.TemplateLiteral): string {
    let output = '`';
    for (const part of expr.parts) {
      if (typeof part === 'string') {
        output += part;
      } else {
        output += '${' + this.compileExpression(part) + '}';
      }
    }
    output += '`';
    return output;
  }

  private compileVariableReference(expr: AST.VariableReference): string {
    // Check if this is a type reference and should be expanded
    const typeDef = this.typeMap.get(expr.name);
    if (this.options.expandTypes && typeDef && expr.name[0] === expr.name[0].toUpperCase()) {
      this.stats.typesExpanded++;
      this.addSourceMap(expr.span, 'type', `$${expr.name}`, `${expr.name} (${typeDef})`);
      return `${expr.name} (${typeDef})`;
    }
    return `$${expr.name}`;
  }

  private compileFunctionCall(expr: AST.FunctionCall): string {
    const callee = this.compileExpression(expr.callee);
    const args = expr.args.map(a => this.compileExpression(a)).join(', ');
    return `${callee}(${args})`;
  }

  private compileSkillReference(expr: AST.SkillReference): string {
    this.stats.referencesResolved++;
    
    if (this.options.inlineSkills && this.registry) {
      const skill = this.registry.get(expr.skill);
      if (skill) {
        this.addSourceMap(expr.span, 'reference', `[[${expr.skill}]]`, '[inlined content]');
        return `[${expr.skill}]\n${skill.source}\n[/${expr.skill}]`;
      }
    }

    if (this.options.resolveReferences) {
      this.addSourceMap(expr.span, 'reference', `[[${expr.skill}]]`, `[${expr.skill}]`);
      return `[${expr.skill}]`;
    }

    return `[[${expr.skill}]]`;
  }

  private compileSectionReference(expr: AST.SectionReference): string {
    this.stats.referencesResolved++;
    
    const ref = expr.skill 
      ? `${expr.skill}#${expr.section}`
      : `#${expr.section}`;

    if (this.options.inlineSkills && this.registry && expr.skill) {
      const content = this.registry.getSection(expr.skill, expr.section);
      if (content) {
        this.addSourceMap(expr.span, 'reference', `[[${ref}]]`, '[inlined section]');
        return content;
      }
    }

    if (this.options.resolveReferences) {
      this.addSourceMap(expr.span, 'reference', `[[${ref}]]`, `[${ref}]`);
      return `[${ref}]`;
    }

    return `[[${ref}]]`;
  }

  private compileSemanticMarker(expr: AST.SemanticMarker): string {
    this.stats.semanticMarkersTransformed++;
    
    if (this.options.transformSemantics) {
      const transformed = `(determine: ${expr.content})`;
      this.addSourceMap(expr.span, 'semantic', `{~~${expr.content}}`, transformed);
      return transformed;
    }

    return `{~~${expr.content}}`;
  }

  private compileBinaryExpression(expr: AST.BinaryExpression): string {
    const left = this.compileExpression(expr.left);
    const right = this.compileExpression(expr.right);
    return `${left} ${expr.operator} ${right}`;
  }

  private compileUnaryExpression(expr: AST.UnaryExpression): string {
    return `${expr.operator} ${this.compileExpression(expr.operand)}`;
  }

  private compileMemberAccess(expr: AST.MemberAccess): string {
    return `${this.compileExpression(expr.object)}.${expr.property}`;
  }

  private compileLambdaExpression(expr: AST.LambdaExpression): string {
    const params = expr.params.length === 1 
      ? `$${expr.params[0]}`
      : `(${expr.params.map(p => `$${p}`).join(', ')})`;
    return `${params} => ${this.compileExpression(expr.body)}`;
  }

  // ==========================================================================
  // Control Flow
  // ==========================================================================

  private compileForEach(stmt: AST.ForEachStatement): string {
    this.stats.controlFlowStatements++;
    
    const pattern = this.compilePattern(stmt.pattern);
    const collection = this.compileExpression(stmt.collection);
    let output = `FOR EACH ${pattern} IN ${collection}:\n`;
    
    for (const block of stmt.body) {
      output += '  ' + this.compileBlock(block).replace(/\n/g, '\n  ').trimEnd() + '\n';
    }
    
    return output + '\n';
  }

  // v0.2: PARALLEL FOR EACH
  private compileParallelForEach(stmt: AST.ParallelForEachStatement): string {
    this.stats.controlFlowStatements++;
    this.stats.parallelStatements++;
    
    const pattern = this.compilePattern(stmt.pattern);
    const collection = this.compileExpression(stmt.collection);
    let output = `PARALLEL FOR EACH ${pattern} IN ${collection}:\n`;
    
    // Add a comment indicating parallel execution semantics
    output += '  # Iterations execute concurrently, results collected when all complete\n';
    
    for (const block of stmt.body) {
      output += '  ' + this.compileBlock(block).replace(/\n/g, '\n  ').trimEnd() + '\n';
    }
    
    return output + '\n';
  }

  private compileWhile(stmt: AST.WhileStatement): string {
    this.stats.controlFlowStatements++;
    
    const condition = this.compileCondition(stmt.condition);
    let output = `WHILE (${condition}):\n`;
    
    for (const block of stmt.body) {
      output += '  ' + this.compileBlock(block).replace(/\n/g, '\n  ').trimEnd() + '\n';
    }
    
    return output + '\n';
  }

  private compileIf(stmt: AST.IfStatement): string {
    this.stats.controlFlowStatements++;
    
    const condition = this.compileCondition(stmt.condition);
    let output = `IF ${condition} THEN:\n`;
    
    for (const block of stmt.thenBody) {
      output += '  ' + this.compileBlock(block).replace(/\n/g, '\n  ').trimEnd() + '\n';
    }
    
    if (stmt.elseBody) {
      output += 'ELSE:\n';
      for (const block of stmt.elseBody) {
        output += '  ' + this.compileBlock(block).replace(/\n/g, '\n  ').trimEnd() + '\n';
      }
    }
    
    return output + '\n';
  }

  // v0.2: BREAK statement
  private compileBreak(stmt: AST.BreakStatement): string {
    this.stats.breakStatements++;
    return '- BREAK\n';
  }

  // v0.2: CONTINUE statement
  private compileContinue(stmt: AST.ContinueStatement): string {
    this.stats.continueStatements++;
    return '- CONTINUE\n';
  }

  private compilePattern(pattern: AST.Pattern): string {
    if (pattern.kind === 'SimplePattern') {
      return `$${pattern.name}`;
    }
    return `(${pattern.names.map(n => `$${n}`).join(', ')})`;
  }

  private compileCondition(cond: AST.Condition): string {
    switch (cond.kind) {
      case 'SemanticCondition':
        return (cond.negated ? 'NOT ' : '') + cond.text;
      case 'DeterministicCondition':
        return `${this.compileExpression(cond.left)} ${cond.operator} ${this.compileExpression(cond.right)}`;
      case 'CompoundCondition':
        return `${this.compileCondition(cond.left)} ${cond.operator} ${this.compileCondition(cond.right)}`;
    }
  }

  // ==========================================================================
  // Prose Content
  // ==========================================================================

  private compileParagraph(para: AST.Paragraph): string {
    let output = '';
    for (const item of para.content) {
      output += this.compileInlineContent(item);
    }
    return output + '\n\n';
  }

  private compileInlineContent(content: AST.InlineContent): string {
    switch (content.kind) {
      case 'InlineText':
        return content.text + ' ';
      case 'VariableReference':
        return this.compileVariableReference(content) + ' ';
      case 'SkillReference':
        return this.compileSkillReference(content) + ' ';
      case 'SectionReference':
        return this.compileSectionReference(content) + ' ';
      case 'SemanticMarker':
        return this.compileSemanticMarker(content) + ' ';
      case 'Emphasis':
        return `*${content.content}* `;
      case 'Strong':
        return `**${content.content}** `;
      case 'CodeSpan':
        return `\`${content.content}\` `;
      default:
        return '';
    }
  }

  private compileCodeBlock(block: AST.CodeBlock): string {
    const lang = block.language || '';
    return '```' + lang + '\n' + block.content + '\n```\n\n';
  }

  private compileList(list: AST.List): string {
    let output = '';
    list.items.forEach((item, i) => {
      const marker = list.ordered ? `${i + 1}. ` : '- ';
      let line = marker;
      for (const content of item.content) {
        line += this.compileInlineContent(content);
      }
      output += line.trimEnd() + '\n';
      if (item.nested) {
        output += this.compileList(item.nested).split('\n').map(l => '  ' + l).join('\n');
      }
    });
    return output + '\n';
  }

  private compileDelegation(deleg: AST.Delegation): string {
    let output = deleg.verb + ' ';
    
    if (deleg.target.kind === 'SkillReference') {
      output += this.compileSkillReference(deleg.target);
    } else {
      output += this.compileSectionReference(deleg.target);
    }

    if (deleg.parameters.length > 0) {
      output += ' WITH:\n';
      for (const param of deleg.parameters) {
        output += '  ' + this.compileVariableDeclaration(param);
      }
    }

    return output + '\n';
  }

  // ==========================================================================
  // Source Map
  // ==========================================================================

  private addSourceMap(
    sourceSpan: AST.Span, 
    type: SourceMapEntry['type'],
    original: string,
    transformed: string
  ): void {
    if (!this.options.generateSourceMap) return;

    this.sourceMap.push({
      source: sourceSpan,
      compiled: sourceSpan, // Simplified: same position for now
      type,
      original,
      transformed,
    });
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
      
      // Return section title for now
      // Full implementation would extract section content
      return `[Section: ${section.title}]`;
    }
  };
}
