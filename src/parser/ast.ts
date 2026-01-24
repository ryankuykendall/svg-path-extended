// AST Node Types for svg-path-extended

// Source location for annotated output
export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

// Comment node for preserving comments in annotated output
export interface Comment {
  type: 'Comment';
  text: string;
  loc: SourceLocation;
}

export type Node =
  | Program
  | Comment
  | LetDeclaration
  | ForLoop
  | IfStatement
  | FunctionDefinition
  | PathCommand
  | CalcExpression
  | FunctionCall
  | BinaryExpression
  | UnaryExpression
  | MemberExpression
  | Identifier
  | NumberLiteral
  | StringLiteral;

export interface Program {
  type: 'Program';
  body: Statement[];
}

export type Statement =
  | Comment
  | LetDeclaration
  | ForLoop
  | IfStatement
  | FunctionDefinition
  | ReturnStatement
  | PathCommand;

// let x = 10;
export interface LetDeclaration {
  type: 'LetDeclaration';
  name: string;
  value: Expression;
}

// for (i in 0..10) { ... }
export interface ForLoop {
  type: 'ForLoop';
  variable: string;
  start: Expression;
  end: Expression;
  body: Statement[];
  loc?: SourceLocation;
}

// if (condition) { ... } else { ... }
export interface IfStatement {
  type: 'IfStatement';
  condition: Expression;
  consequent: Statement[];
  alternate: Statement[] | null;
}

// fn name(a, b) { ... }
export interface FunctionDefinition {
  type: 'FunctionDefinition';
  name: string;
  params: string[];
  body: Statement[];
}

// return expr;
export interface ReturnStatement {
  type: 'ReturnStatement';
  value: Expression;
}

// M x y, L 10 20, etc.
export interface PathCommand {
  type: 'PathCommand';
  command: string; // M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
  args: PathArg[];
  loc?: SourceLocation;
}

export type PathArg = NumberLiteral | Identifier | CalcExpression | FunctionCall | MemberExpression;

// calc(x + 10)
export interface CalcExpression {
  type: 'CalcExpression';
  expression: Expression;
}

// sin(x), star(10, 20, 5, 6)
export interface FunctionCall {
  type: 'FunctionCall';
  name: string;
  args: Expression[];
  loc?: SourceLocation;
}

// x + y, x * 2, etc.
export interface BinaryExpression {
  type: 'BinaryExpression';
  operator: '+' | '-' | '*' | '/' | '%' | '<' | '>' | '<=' | '>=' | '==' | '!=' | '&&' | '||';
  left: Expression;
  right: Expression;
}

// -x, !x
export interface UnaryExpression {
  type: 'UnaryExpression';
  operator: '-' | '!';
  argument: Expression;
}

// Property access: ctx.x, ctx.position.x
export interface MemberExpression {
  type: 'MemberExpression';
  object: Expression;
  property: string;
}

// Variable reference
export interface Identifier {
  type: 'Identifier';
  name: string;
}

// Numeric literal
export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
  unit?: 'deg' | 'rad';  // Optional angle unit
}

// String literal (for log messages)
export interface StringLiteral {
  type: 'StringLiteral';
  value: string;
}

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | CalcExpression
  | FunctionCall
  | MemberExpression
  | Identifier
  | NumberLiteral
  | StringLiteral;
