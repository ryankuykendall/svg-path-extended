// AST Node Types for svg-path-extended

export type Node =
  | Program
  | LetDeclaration
  | ForLoop
  | IfStatement
  | FunctionDefinition
  | PathCommand
  | CalcExpression
  | FunctionCall
  | BinaryExpression
  | UnaryExpression
  | Identifier
  | NumberLiteral;

export interface Program {
  type: 'Program';
  body: Statement[];
}

export type Statement =
  | LetDeclaration
  | ForLoop
  | IfStatement
  | FunctionDefinition
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

// M x y, L 10 20, etc.
export interface PathCommand {
  type: 'PathCommand';
  command: string; // M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
  args: PathArg[];
}

export type PathArg = NumberLiteral | Identifier | CalcExpression | FunctionCall;

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

// Variable reference
export interface Identifier {
  type: 'Identifier';
  name: string;
}

// Numeric literal
export interface NumberLiteral {
  type: 'NumberLiteral';
  value: number;
}

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | CalcExpression
  | FunctionCall
  | Identifier
  | NumberLiteral;
