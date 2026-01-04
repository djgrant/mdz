/**
 * MDZ AST Types
 * 
 * Complete type definitions for the Abstract Syntax Tree
 * Aligned with grammar.md and language-spec.md v0.2
 */

// ============================================================================
// Position and Span
// ============================================================================

export interface Position {
  /** 1-based line number */
  line: number;
  /** 0-based column number */
  column: number;
  /** 0-based offset from start of file */
  offset: number;
}

export interface Span {
  start: Position;
  end: Position;
}

// ============================================================================
// Base Node
// ============================================================================

export interface BaseNode {
  kind: string;
  span: Span;
}

// ============================================================================
// Document
// ============================================================================

export interface Document extends BaseNode {
  kind: 'Document';
  frontmatter: Frontmatter | null;
  sections: Section[];
  errors: ParseError[];
}

export interface Frontmatter extends BaseNode {
  kind: 'Frontmatter';
  name: string;
  description: string;
  uses: string[];
  imports: ImportDeclaration[];
  raw: Record<string, unknown>;
}

// v0.2: Import declarations in frontmatter
export interface ImportDeclaration extends BaseNode {
  kind: 'ImportDeclaration';
  path: string;
  skills: string[];
  aliases: Map<string, string>;
}

export interface Section extends BaseNode {
  kind: 'Section';
  level: number;
  title: string;
  anchor: string;
  content: Block[];
}

// ============================================================================
// Blocks
// ============================================================================

export type Block =
  | TypeDefinition
  | VariableDeclaration
  | ForEachStatement
  | ParallelForEachStatement  // v0.2
  | WhileStatement
  | IfStatement
  | BreakStatement            // v0.2
  | ContinueStatement         // v0.2
  | Delegation
  | Paragraph
  | CodeBlock
  | List
  | HorizontalRule;

// ============================================================================
// Type System
// ============================================================================

export interface TypeDefinition extends BaseNode {
  kind: 'TypeDefinition';
  name: string;
  typeExpr: TypeExpr;
}

export type TypeExpr =
  | SemanticType
  | EnumType
  | CompoundType
  | ArrayType
  | FunctionType
  | TypeReference;

export interface SemanticType extends BaseNode {
  kind: 'SemanticType';
  description: string;
}

export interface EnumType extends BaseNode {
  kind: 'EnumType';
  values: string[];
}

export interface CompoundType extends BaseNode {
  kind: 'CompoundType';
  elements: TypeExpr[];
}

export interface ArrayType extends BaseNode {
  kind: 'ArrayType';
  elementType: TypeExpr;
}

export interface FunctionType extends BaseNode {
  kind: 'FunctionType';
  params: string[];
  returnType: TypeExpr;
}

export interface TypeReference extends BaseNode {
  kind: 'TypeReference';
  name: string;
}

// ============================================================================
// Variables
// ============================================================================

export interface VariableDeclaration extends BaseNode {
  kind: 'VariableDeclaration';
  name: string;
  typeAnnotation: TypeReference | null;
  value: Expression | null;
  isLambda: boolean;
  isRequired?: boolean;  // v0.2: for WITH clause parameters
}

// ============================================================================
// Expressions
// ============================================================================

export type Expression =
  | LambdaExpression
  | StringLiteral
  | NumberLiteral
  | BooleanLiteral
  | ArrayLiteral
  | TemplateLiteral
  | VariableReference
  | FunctionCall
  | SkillReference
  | SectionReference
  | SemanticMarker
  | BinaryExpression
  | UnaryExpression
  | MemberAccess
  | InlineText;

export interface LambdaExpression extends BaseNode {
  kind: 'LambdaExpression';
  params: string[];
  body: Expression;
}

export interface StringLiteral extends BaseNode {
  kind: 'StringLiteral';
  value: string;
}

export interface NumberLiteral extends BaseNode {
  kind: 'NumberLiteral';
  value: number;
}

export interface BooleanLiteral extends BaseNode {
  kind: 'BooleanLiteral';
  value: boolean;
}

export interface ArrayLiteral extends BaseNode {
  kind: 'ArrayLiteral';
  elements: Expression[];
}

export interface TemplateLiteral extends BaseNode {
  kind: 'TemplateLiteral';
  parts: (string | Expression)[];
}

export interface VariableReference extends BaseNode {
  kind: 'VariableReference';
  name: string;
}

export interface FunctionCall extends BaseNode {
  kind: 'FunctionCall';
  callee: Expression;
  args: Expression[];
}

export interface SkillReference extends BaseNode {
  kind: 'SkillReference';
  skill: string;
}

export interface SectionReference extends BaseNode {
  kind: 'SectionReference';
  skill: string | null;
  section: string;
}

export interface SemanticMarker extends BaseNode {
  kind: 'SemanticMarker';
  content: string;
  interpolations: VariableReference[];
}

export interface BinaryExpression extends BaseNode {
  kind: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export type BinaryOperator =
  | '='
  | '!='
  | '<'
  | '>'
  | '<='
  | '>='
  | 'AND'
  | 'OR';

export interface UnaryExpression extends BaseNode {
  kind: 'UnaryExpression';
  operator: 'NOT';
  operand: Expression;
}

export interface MemberAccess extends BaseNode {
  kind: 'MemberAccess';
  object: Expression;
  property: string;
}

export interface InlineText extends BaseNode {
  kind: 'InlineText';
  text: string;
}

// ============================================================================
// Control Flow
// ============================================================================

export interface ForEachStatement extends BaseNode {
  kind: 'ForEachStatement';
  pattern: Pattern;
  collection: Expression;
  body: Block[];
}

// v0.2: PARALLEL FOR EACH
export interface ParallelForEachStatement extends BaseNode {
  kind: 'ParallelForEachStatement';
  pattern: Pattern;
  collection: Expression;
  body: Block[];
  mergeStrategy?: 'collect' | 'first' | 'last';  // How to merge results
}

export interface WhileStatement extends BaseNode {
  kind: 'WhileStatement';
  condition: Condition;
  body: Block[];
}

export interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Condition;
  thenBody: Block[];
  elseBody: Block[] | null;
}

// v0.2: BREAK statement
export interface BreakStatement extends BaseNode {
  kind: 'BreakStatement';
}

// v0.2: CONTINUE statement
export interface ContinueStatement extends BaseNode {
  kind: 'ContinueStatement';
}

export type Pattern = SimplePattern | DestructuringPattern;

export interface SimplePattern extends BaseNode {
  kind: 'SimplePattern';
  name: string;
}

export interface DestructuringPattern extends BaseNode {
  kind: 'DestructuringPattern';
  names: string[];
}

export type Condition = SemanticCondition | DeterministicCondition | CompoundCondition;

export interface SemanticCondition extends BaseNode {
  kind: 'SemanticCondition';
  text: string;
  negated: boolean;
}

export interface DeterministicCondition extends BaseNode {
  kind: 'DeterministicCondition';
  left: Expression;
  operator: BinaryOperator;
  right: Expression;
}

export interface CompoundCondition extends BaseNode {
  kind: 'CompoundCondition';
  operator: 'AND' | 'OR';
  left: Condition;
  right: Condition;
}

// ============================================================================
// Composition
// ============================================================================

export interface Delegation extends BaseNode {
  kind: 'Delegation';
  verb: string;
  target: SkillReference | SectionReference;
  parameters: VariableDeclaration[];
}

// ============================================================================
// Prose Content
// ============================================================================

export interface Paragraph extends BaseNode {
  kind: 'Paragraph';
  content: InlineContent[];
}

export type InlineContent =
  | InlineText
  | VariableReference
  | SkillReference
  | SectionReference
  | SemanticMarker
  | Emphasis
  | Strong
  | CodeSpan;

export interface Emphasis extends BaseNode {
  kind: 'Emphasis';
  content: string;
}

export interface Strong extends BaseNode {
  kind: 'Strong';
  content: string;
}

export interface CodeSpan extends BaseNode {
  kind: 'CodeSpan';
  content: string;
}

export interface CodeBlock extends BaseNode {
  kind: 'CodeBlock';
  language: string | null;
  content: string;
}

export interface List extends BaseNode {
  kind: 'List';
  ordered: boolean;
  items: ListItem[];
}

export interface ListItem extends BaseNode {
  kind: 'ListItem';
  content: InlineContent[];
  nested: List | null;
}

export interface HorizontalRule extends BaseNode {
  kind: 'HorizontalRule';
}

// ============================================================================
// Errors
// ============================================================================

export interface ParseError extends BaseNode {
  kind: 'ParseError';
  message: string;
  code: ErrorCode;
  recoverable: boolean;
}

export type ErrorCode =
  | 'E001' // Unexpected token
  | 'E002' // Unclosed bracket
  | 'E003' // Unclosed semantic marker
  | 'E004' // Invalid type name
  | 'E005' // Malformed control flow
  | 'E006' // Invalid indentation
  | 'E007' // Undefined variable
  | 'E008' // Undefined type
  | 'E009' // Undefined skill reference
  | 'E010' // Undefined section reference
  | 'E011' // Duplicate definition
  | 'E012' // Nested semantic marker
  | 'E013' // Invalid frontmatter
  | 'E014' // Missing required field
  | 'E015' // Syntax error
  | 'E016' // BREAK outside loop (v0.2)
  | 'E017' // CONTINUE outside loop (v0.2)
  | 'E018'; // Invalid import declaration (v0.2)

// ============================================================================
// Utilities
// ============================================================================

export function createSpan(
  startLine: number,
  startColumn: number,
  startOffset: number,
  endLine: number,
  endColumn: number,
  endOffset: number
): Span {
  return {
    start: { line: startLine, column: startColumn, offset: startOffset },
    end: { line: endLine, column: endColumn, offset: endOffset },
  };
}

export function mergeSpans(a: Span, b: Span): Span {
  return {
    start: a.start.offset < b.start.offset ? a.start : b.start,
    end: a.end.offset > b.end.offset ? a.end : b.end,
  };
}

export function isTypeDefinition(node: BaseNode): node is TypeDefinition {
  return node.kind === 'TypeDefinition';
}

export function isVariableDeclaration(node: BaseNode): node is VariableDeclaration {
  return node.kind === 'VariableDeclaration';
}

export function isControlFlow(node: BaseNode): node is ForEachStatement | ParallelForEachStatement | WhileStatement | IfStatement {
  return node.kind === 'ForEachStatement' || node.kind === 'ParallelForEachStatement' || 
         node.kind === 'WhileStatement' || node.kind === 'IfStatement';
}

export function isLoopStatement(node: BaseNode): node is ForEachStatement | ParallelForEachStatement | WhileStatement {
  return node.kind === 'ForEachStatement' || node.kind === 'ParallelForEachStatement' || 
         node.kind === 'WhileStatement';
}

export function isReference(node: BaseNode): node is SkillReference | SectionReference {
  return node.kind === 'SkillReference' || node.kind === 'SectionReference';
}
