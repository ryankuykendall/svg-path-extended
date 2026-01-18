import type {
  Program,
  Statement,
  Expression,
  PathArg,
  PathCommand,
  LetDeclaration,
  ForLoop,
  IfStatement,
  FunctionDefinition,
  FunctionCall,
} from '../parser/ast';
import { stdlib } from '../stdlib';

export type Value = number | string | PathSegment | UserFunction;

export interface PathSegment {
  type: 'PathSegment';
  value: string;
}

export interface UserFunction {
  type: 'UserFunction';
  params: string[];
  body: Statement[];
}

export interface Scope {
  variables: Map<string, Value>;
  parent: Scope | null;
}

function createScope(parent: Scope | null = null): Scope {
  return {
    variables: new Map(),
    parent,
  };
}

function lookupVariable(scope: Scope, name: string): Value {
  if (scope.variables.has(name)) {
    return scope.variables.get(name)!;
  }
  if (scope.parent) {
    return lookupVariable(scope.parent, name);
  }
  // Check stdlib
  if (name in stdlib) {
    return stdlib[name as keyof typeof stdlib] as unknown as Value;
  }
  throw new Error(`Undefined variable: ${name}`);
}

function setVariable(scope: Scope, name: string, value: Value): void {
  scope.variables.set(name, value);
}

function evaluateExpression(expr: Expression, scope: Scope): Value {
  switch (expr.type) {
    case 'NumberLiteral':
      return expr.value;

    case 'Identifier':
      return lookupVariable(scope, expr.name);

    case 'BinaryExpression': {
      const left = evaluateExpression(expr.left, scope);
      const right = evaluateExpression(expr.right, scope);

      if (typeof left !== 'number' || typeof right !== 'number') {
        throw new Error(`Binary operator ${expr.operator} requires numeric operands`);
      }

      switch (expr.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '%': return left % right;
        case '<': return left < right ? 1 : 0;
        case '>': return left > right ? 1 : 0;
        case '<=': return left <= right ? 1 : 0;
        case '>=': return left >= right ? 1 : 0;
        case '==': return left === right ? 1 : 0;
        case '!=': return left !== right ? 1 : 0;
        case '&&': return left && right ? 1 : 0;
        case '||': return left || right ? 1 : 0;
      }
    }

    case 'UnaryExpression': {
      const arg = evaluateExpression(expr.argument, scope);
      if (typeof arg !== 'number') {
        throw new Error(`Unary operator ${expr.operator} requires numeric operand`);
      }
      switch (expr.operator) {
        case '-': return -arg;
        case '!': return arg ? 0 : 1;
      }
    }

    case 'CalcExpression':
      return evaluateExpression(expr.expression, scope);

    case 'FunctionCall':
      return evaluateFunctionCall(expr, scope);

    default:
      throw new Error(`Unknown expression type: ${(expr as Expression).type}`);
  }
}

function evaluateFunctionCall(call: FunctionCall, scope: Scope): Value {
  const fn = lookupVariable(scope, call.name);

  // Check if it's a stdlib function
  if (typeof fn === 'function') {
    const args = call.args.map((arg) => evaluateExpression(arg, scope));
    return (fn as (...args: number[]) => number)(...args as number[]);
  }

  // Check if it's a user-defined function
  if (typeof fn === 'object' && fn !== null && 'type' in fn && fn.type === 'UserFunction') {
    const userFn = fn as UserFunction;
    const args = call.args.map((arg) => evaluateExpression(arg, scope));

    if (args.length !== userFn.params.length) {
      throw new Error(
        `Function ${call.name} expects ${userFn.params.length} arguments, got ${args.length}`
      );
    }

    const fnScope = createScope(scope);
    userFn.params.forEach((param, i) => {
      setVariable(fnScope, param, args[i]);
    });

    const result = evaluateStatements(userFn.body, fnScope);
    // Return as PathSegment if it looks like a path (contains path-like content)
    if (result) {
      return { type: 'PathSegment' as const, value: result };
    }
    return result;
  }

  throw new Error(`${call.name} is not a function`);
}

function evaluatePathArg(arg: PathArg, scope: Scope): string {
  switch (arg.type) {
    case 'NumberLiteral':
      return String(arg.value);

    case 'Identifier': {
      const value = lookupVariable(scope, arg.name);
      if (typeof value === 'number') {
        return String(value);
      }
      if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'PathSegment') {
        return value.value;
      }
      throw new Error(`Variable ${arg.name} cannot be used as path argument`);
    }

    case 'CalcExpression': {
      const value = evaluateExpression(arg.expression, scope);
      if (typeof value !== 'number') {
        throw new Error('calc() must evaluate to a number');
      }
      return String(value);
    }

    case 'FunctionCall': {
      const value = evaluateFunctionCall(arg, scope);
      if (typeof value === 'number') {
        return String(value);
      }
      if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'PathSegment') {
        return value.value;
      }
      throw new Error(`Function ${arg.name} did not return a valid path value`);
    }

    default:
      throw new Error(`Unknown path argument type: ${(arg as PathArg).type}`);
  }
}

function evaluatePathCommand(cmd: PathCommand, scope: Scope): string {
  // Empty command means it's a statement-level function call
  if (cmd.command === '') {
    const args = cmd.args.map((arg) => evaluatePathArg(arg, scope));
    return args.join(' ');
  }
  const args = cmd.args.map((arg) => evaluatePathArg(arg, scope));
  return cmd.command + (args.length > 0 ? ' ' + args.join(' ') : '');
}

function evaluateStatement(stmt: Statement, scope: Scope): string {
  switch (stmt.type) {
    case 'LetDeclaration': {
      const value = evaluateExpression(stmt.value, scope);
      setVariable(scope, stmt.name, value);
      return '';
    }

    case 'ForLoop': {
      const start = evaluateExpression(stmt.start, scope);
      const end = evaluateExpression(stmt.end, scope);

      if (typeof start !== 'number' || typeof end !== 'number') {
        throw new Error('for loop range must be numeric');
      }

      // Guard against infinite loops
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new Error('for loop range must be finite (got Infinity or NaN)');
      }

      const MAX_ITERATIONS = 10000;
      const ascending = start <= end;
      // Inclusive ranges: both start and end are included
      const iterations = ascending ? (end - start + 1) : (start - end + 1);
      if (iterations > MAX_ITERATIONS) {
        throw new Error(`for loop would run ${iterations} iterations (max ${MAX_ITERATIONS})`);
      }

      const results: string[] = [];
      if (ascending) {
        for (let i = start; i <= end; i++) {
          const loopScope = createScope(scope);
          setVariable(loopScope, stmt.variable, i);
          results.push(evaluateStatements(stmt.body, loopScope));
        }
      } else {
        // Descending range
        for (let i = start; i >= end; i--) {
          const loopScope = createScope(scope);
          setVariable(loopScope, stmt.variable, i);
          results.push(evaluateStatements(stmt.body, loopScope));
        }
      }
      return results.filter(Boolean).join(' ');
    }

    case 'IfStatement': {
      const condition = evaluateExpression(stmt.condition, scope);
      const isTruthy = typeof condition === 'number' ? condition !== 0 : Boolean(condition);

      if (isTruthy) {
        return evaluateStatements(stmt.consequent, createScope(scope));
      } else if (stmt.alternate) {
        return evaluateStatements(stmt.alternate, createScope(scope));
      }
      return '';
    }

    case 'FunctionDefinition': {
      const fn: UserFunction = {
        type: 'UserFunction',
        params: stmt.params,
        body: stmt.body,
      };
      setVariable(scope, stmt.name, fn);
      return '';
    }

    case 'PathCommand':
      return evaluatePathCommand(stmt, scope);

    default:
      throw new Error(`Unknown statement type: ${(stmt as Statement).type}`);
  }
}

function evaluateStatements(stmts: Statement[], scope: Scope): string {
  const results: string[] = [];
  for (const stmt of stmts) {
    const result = evaluateStatement(stmt, scope);
    if (result) {
      results.push(result);
    }
  }
  return results.join(' ');
}

export function evaluate(program: Program): string {
  const scope = createScope();
  return evaluateStatements(program.body, scope);
}

// Re-export annotated evaluator and formatter
export { evaluateAnnotated, type AnnotatedOutput, type AnnotatedLine } from './annotated';
export { formatAnnotated, type FormatOptions } from './formatter';
