/**
 * MDZ AST Types
 * 
 * Complete type definitions for the Abstract Syntax Tree
 * Aligned with grammar.md and language-spec.md
 * 
 * v0.2: Import declarations, PARALLEL FOR EACH, BREAK/CONTINUE
 * v0.8: Link-based references (~/path), DELEGATE/USE/EXECUTE/GOTO statements
 * v0.9: RETURN/PUSH/DO statements, frontmatter type/input/context declarations,
 *       async/await delegate support, removed PARALLEL FOR EACH
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
  skills: string[];    // Declared skill dependencies
  agents: string[];    // Declared subagents for DELEGATE
  tools: string[];     // External tools
  uses: string[];      // Deprecated, kept for backward compatibility (alias for skills)
  imports: ImportDeclaration[];
  types: FrontmatterTypeDecl[];      // v0.9: Type declarations
  input: FrontmatterInputDecl[];     // v0.9: Input parameters
  context: FrontmatterContextDecl[]; // v0.9: Context variables
  raw: Record<string, unknown>;
}

// v0.2: Import declarations in frontmatter
export interface ImportDeclaration extends BaseNode {
  kind: 'ImportDeclaration';
  path: string;
  skills: string[];
  aliases: Map<string, string>;
}

// v0.9: Type declaration in frontmatter
export interface FrontmatterTypeDecl extends BaseNode {
  kind: 'FrontmatterTypeDecl';
  name: string;
  typeExpr: TypeExpr;
}

// v0.9: Input parameter in frontmatter
export interface FrontmatterInputDecl extends BaseNode {
  kind: 'FrontmatterInputDecl';
  name: string;
  type?: TypeExpr;
  defaultValue?: Expression;
  required: boolean;
}

// v0.9: Context variable in frontmatter
export interface FrontmatterContextDecl extends BaseNode {
  kind: 'FrontmatterContextDecl';
  name: string;
  type?: TypeExpr;
  initialValue?: Expression;
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
  | WhileStatement
  | IfStatement
  | BreakStatement            // v0.2
  | ContinueStatement         // v0.2
  | ReturnStatement           // v0.9
  | PushStatement             // v0.9
  | DoStatement               // v0.9
  | DelegateStatement         // v0.8: DELEGATE task TO ~/agent/x
  | UseStatement              // v0.8: USE ~/skill/x TO task
  | ExecuteStatement          // v0.8: EXECUTE ~/tool/x TO action
  | GotoStatement             // v0.8: GOTO #section
  | Heading
  | Delegation
  | Paragraph
  | CodeBlock
  | List
  | HorizontalRule;

// ============================================================================
// Blocks (Continued)
// ============================================================================

export interface Heading extends BaseNode {
  kind: 'Heading';
  level: number;
  title: string;
  anchor: string;
}

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
  typeAnnotation: TypeReference | SemanticType | null;  // v0.11: unquoted semantic descriptions
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
  | ObjectLiteral
  | TemplateLiteral
  | VariableReference
  | FunctionCall
  | LinkNode         // v0.8: ~/path/to/file or ~/path/to/file#anchor
  | AnchorNode       // v0.8: #section (same-file reference)
  | InferredVariable
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

export interface ObjectLiteral extends BaseNode {
  kind: 'ObjectLiteral';
  fields: ObjectField[];
}

export interface ObjectField {
  key: string;
  value: Expression;
  span: Span;
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

// v0.8: Link reference (~/path/to/file or ~/path/to/file#anchor)
export interface LinkNode extends BaseNode {
  kind: 'Link';
  path: string[];           // e.g., ['agent', 'architect'] from ~/agent/architect
  anchor: string | null;    // e.g., 'section' from ~/skill/x#section, null otherwise
  raw: string;              // Original syntax: '~/agent/architect' or '~/skill/x#section'
}

// v0.8: Anchor reference (#section - same-file reference)
export interface AnchorNode extends BaseNode {
  kind: 'Anchor';
  name: string;  // e.g., "methodology" from #methodology
}

export interface SemanticMarker extends BaseNode {
  kind: 'SemanticMarker';
  content: string;                 // Positional semantic span content
  interpolations: VariableReference[];
}

export interface InferredVariable extends BaseNode {
  kind: 'InferredVariable';
  name: string;  // e.g., "index" from $/index/
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

export interface WhileStatement extends BaseNode {
  kind: 'WhileStatement';
  condition: Condition;
  body: Block[];
}

export interface ElseIfClause {
  condition: Condition;
  body: Block[];
  span: Span;
}

export interface IfStatement extends BaseNode {
  kind: 'IfStatement';
  condition: Condition;
  thenBody: Block[];
  elseIf: ElseIfClause[];  // ELSE IF chains
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

// v0.9: RETURN statement
export interface ReturnStatement extends BaseNode {
  kind: 'ReturnStatement';
  value?: Expression;
}

// v0.9: Push statement
export interface PushStatement extends BaseNode {
  kind: 'PushStatement';
  target: VariableReference;
  value: Expression;
}

// v0.9: DO instruction (standalone prose instruction)
export interface DoStatement extends BaseNode {
  kind: 'DoStatement';
  instruction?: SemanticMarker;       // Positional instruction span
  body?: Block[];
}

// v0.8: DELEGATE statement for agent delegation
// v0.9: Added async/awaited flags, made target optional
// Syntax: DELEGATE task TO ~/agent/x [WITH #template]
//         ASYNC DELEGATE task TO ~/agent/x  (v0.9: fire and forget)

//         AWAIT $handle                        (v0.9: await async delegate)
export interface DelegateStatement extends BaseNode {
  kind: 'DelegateStatement';
  task?: SemanticMarker;             // Task being delegated (positional span)
  target?: LinkNode;                 // Target agent: ~/agent/architect (v0.9: optional for AWAIT)
  handle?: VariableReference;        // v0.9: Handle for AWAIT $handle
  withAnchor?: AnchorNode;           // Optional template: WITH #template
  parameters?: ParameterBlock;       // Optional parameters block
  async?: boolean;                   // v0.9: Fire-and-forget delegation
  awaited?: boolean;                 // v0.9: Awaiting a previous async delegation
}

// v0.8: USE statement for skill activation
// Syntax: USE ~/skill/x TO task
export interface UseStatement extends BaseNode {
  kind: 'UseStatement';
  link: LinkNode;                     // Skill to use: ~/skill/work-packages
  task: SemanticMarker;              // Task description (positional span)
  parameters?: ParameterBlock;        // Optional parameters block
}

// v0.8: EXECUTE statement for tool invocation
// Syntax: EXECUTE ~/tool/x TO action
export interface ExecuteStatement extends BaseNode {
  kind: 'ExecuteStatement';
  link: LinkNode;                     // Tool to execute: ~/tool/browser
  task: SemanticMarker;              // Action description (positional span)
  parameters?: ParameterBlock;        // Optional parameters block
}

// v0.8: GOTO statement for same-file navigation
// Syntax: GOTO #section
export interface GotoStatement extends BaseNode {
  kind: 'GotoStatement';
  anchor: AnchorNode;                 // Section to navigate to: #methodology
}

// v0.8: Parameter block for structured parameters
export interface ParameterBlock extends BaseNode {
  kind: 'ParameterBlock';
  parameters: VariableDeclaration[];
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
  target: LinkNode | AnchorNode;  // v0.8: Changed from SkillReference | SectionReference
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
  | LinkNode         // v0.8
  | AnchorNode       // v0.8
  | InferredVariable
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
  | 'E003' // Malformed inferred variable
  | 'E004' // Invalid type name
  | 'E005' // Malformed control flow
  | 'E006' // Invalid indentation
  | 'E007' // Undefined variable
  | 'E008' // Undefined type
  | 'E009' // Undefined skill reference
  | 'E010' // Undefined section reference
  | 'E011' // Duplicate definition
  | 'E012' // Reserved (legacy semantic span)
  | 'E013' // Invalid frontmatter
  | 'E014' // Missing required field
  | 'E015' // Syntax error
  | 'E016' // BREAK outside loop (v0.2)
  | 'E017' // CONTINUE outside loop (v0.2)
  | 'E018' // RETURN not at end of section/loop (v0.9)
  | 'E019' // Push target not array (v0.9)
  | 'E020'; // Parameter type mismatch (v0.9)

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

export function isControlFlow(node: BaseNode): node is ForEachStatement | WhileStatement | IfStatement {
  return node.kind === 'ForEachStatement' || node.kind === 'WhileStatement' || node.kind === 'IfStatement';
}

export function isLoopStatement(node: BaseNode): node is ForEachStatement | WhileStatement {
  return node.kind === 'ForEachStatement' || node.kind === 'WhileStatement';
}

// v0.9: Type guards for new statements
export function isReturnStatement(node: BaseNode): node is ReturnStatement {
  return node.kind === 'ReturnStatement';
}

export function isPushStatement(node: BaseNode): node is PushStatement {
  return node.kind === 'PushStatement';
}

export function isDoStatement(node: BaseNode): node is DoStatement {
  return node.kind === 'DoStatement';
}

// v0.8: Type guards for link-based references
export function isLink(node: BaseNode): node is LinkNode {
  return node.kind === 'Link';
}

export function isAnchor(node: BaseNode): node is AnchorNode {
  return node.kind === 'Anchor';
}

// v0.8: Helper to resolve link to file path
export function resolveLinkPath(link: LinkNode): string {
  return link.path.join('/') + '.mdz';
}

// v0.8: Get reference kind from path
export function getLinkKind(link: LinkNode): 'agent' | 'skill' | 'tool' | 'unknown' {
  const folder = link.path[0];
  if (folder === 'agent' || folder === 'agents') return 'agent';
  if (folder === 'skill' || folder === 'skills') return 'skill';
  if (folder === 'tool' || folder === 'tools') return 'tool';
  return 'unknown';
}
