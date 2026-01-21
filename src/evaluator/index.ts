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
  MemberExpression,
} from '../parser/ast';
import { stdlib } from '../stdlib';
import {
  type PathContext,
  type Point,
  type CommandHistoryEntry,
  createPathContext,
  updateContextForCommand,
  contextToObject,
} from './context';

export type Value = number | string | PathSegment | UserFunction | ContextObject;

/**
 * Represents an object value that supports property access (like ctx)
 */
export interface ContextObject {
  type: 'ContextObject';
  value: Record<string, unknown>;
}

/**
 * Represents a single log entry with metadata
 */
export interface LogEntry {
  line: number | null;
  parts: LogPart[];
}

/**
 * A single part of a log entry (either a label string or a labeled value)
 */
export interface LogPart {
  type: 'string' | 'value';
  label?: string;  // For values: the expression that was logged (e.g., "ctx.position")
  value: string;   // The stringified value
}

/**
 * Convert an Expression AST node to its source text representation
 */
function expressionToSource(expr: Expression): string {
  switch (expr.type) {
    case 'NumberLiteral':
      return String(expr.value);
    case 'StringLiteral':
      return `"${expr.value}"`;
    case 'Identifier':
      return expr.name;
    case 'MemberExpression':
      return `${expressionToSource(expr.object)}.${expr.property}`;
    case 'FunctionCall':
      return `${expr.name}(${expr.args.map(expressionToSource).join(', ')})`;
    case 'CalcExpression':
      return `calc(${expressionToSource(expr.expression)})`;
    case 'BinaryExpression':
      return `(${expressionToSource(expr.left)} ${expr.operator} ${expressionToSource(expr.right)})`;
    case 'UnaryExpression':
      return `${expr.operator}${expressionToSource(expr.argument)}`;
    default:
      return '?';
  }
}

export interface PathSegment {
  type: 'PathSegment';
  value: string;
}

export interface UserFunction {
  type: 'UserFunction';
  params: string[];
  body: Statement[];
}

/**
 * Evaluation state for context-aware evaluation
 */
export interface EvaluationState {
  pathContext: PathContext;
  logs: LogEntry[];
}

export interface Scope {
  variables: Map<string, Value>;
  parent: Scope | null;
  evalState?: EvaluationState;  // Shared across all scopes during evaluation
}

function createScope(parent: Scope | null = null): Scope {
  return {
    variables: new Map(),
    parent,
    evalState: parent?.evalState,  // Inherit evaluation state from parent
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

    case 'StringLiteral':
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

    case 'MemberExpression':
      return evaluateMemberExpression(expr, scope);

    default:
      throw new Error(`Unknown expression type: ${(expr as Expression).type}`);
  }
}

function evaluateMemberExpression(expr: MemberExpression, scope: Scope): Value {
  const obj = evaluateExpression(expr.object, scope);

  // Handle ContextObject property access
  if (typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'ContextObject') {
    const contextObj = obj as ContextObject;
    const propValue = contextObj.value[expr.property];

    if (propValue === undefined) {
      throw new Error(`Property '${expr.property}' does not exist on context object`);
    }

    // If the property is an object (like position or start), wrap it as ContextObject
    if (typeof propValue === 'object' && propValue !== null && !Array.isArray(propValue)) {
      return { type: 'ContextObject' as const, value: propValue as Record<string, unknown> };
    }

    // If it's a number, return it directly
    if (typeof propValue === 'number') {
      return propValue;
    }

    // If it's an array (like commands), wrap it as ContextObject
    if (Array.isArray(propValue)) {
      return { type: 'ContextObject' as const, value: { length: propValue.length, items: propValue } };
    }

    throw new Error(`Cannot access property '${expr.property}' of type ${typeof propValue}`);
  }

  throw new Error(`Cannot access property '${expr.property}' on non-object value`);
}

function evaluateFunctionCall(call: FunctionCall, scope: Scope): Value {
  // Special handling for log() function
  if (call.name === 'log' && scope.evalState) {
    const lineNumber = call.loc?.line ?? null;
    const parts: LogPart[] = [];

    for (const arg of call.args) {
      const value = evaluateExpression(arg, scope);

      // String literals are displayed directly without a label
      if (arg.type === 'StringLiteral') {
        parts.push({
          type: 'string',
          value: arg.value,
        });
      } else {
        // Non-string expressions get a label showing what was logged
        const label = expressionToSource(arg);
        let stringValue: string;

        if (typeof value === 'object' && value !== null && 'type' in value) {
          const typed = value as { type: string; value?: unknown };
          if (typed.type === 'ContextObject' && typed.value) {
            stringValue = JSON.stringify(typed.value, null, 2);
          } else if (typed.type === 'PathSegment') {
            stringValue = (typed as PathSegment).value;
          } else {
            stringValue = String(value);
          }
        } else if (typeof value === 'number') {
          stringValue = String(value);
        } else if (typeof value === 'string') {
          stringValue = value;
        } else {
          stringValue = String(value);
        }

        parts.push({
          type: 'value',
          label,
          value: stringValue,
        });
      }
    }

    scope.evalState.logs.push({ line: lineNumber, parts });
    return { type: 'PathSegment' as const, value: '' };  // Empty path segment
  }

  const fn = lookupVariable(scope, call.name);

  // Check if it's a stdlib function
  if (typeof fn === 'function') {
    const args = call.args.map((arg) => evaluateExpression(arg, scope));
    const result = (fn as (...args: number[]) => number)(...args as number[]);

    // If stdlib function returns a PathSegment, track its commands
    if (typeof result === 'object' && result !== null && 'type' in result) {
      const typed = result as { type: string; value?: string };
      if (typed.type === 'PathSegment' && typed.value && scope.evalState) {
        parseAndTrackPathString(typed.value, scope);
      }
    }

    return result;
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

    case 'MemberExpression': {
      const value = evaluateMemberExpression(arg, scope);
      if (typeof value === 'number') {
        return String(value);
      }
      throw new Error(`Member expression did not evaluate to a number`);
    }

    default:
      throw new Error(`Unknown path argument type: ${(arg as PathArg).type}`);
  }
}

/**
 * Get numeric arguments from path args for context tracking
 */
function getNumericArgs(args: PathArg[], scope: Scope): number[] {
  const numericArgs: number[] = [];
  for (const arg of args) {
    if (arg.type === 'NumberLiteral') {
      numericArgs.push(arg.value);
    } else if (arg.type === 'Identifier') {
      const value = lookupVariable(scope, arg.name);
      if (typeof value === 'number') {
        numericArgs.push(value);
      }
    } else if (arg.type === 'CalcExpression') {
      const value = evaluateExpression(arg.expression, scope);
      if (typeof value === 'number') {
        numericArgs.push(value);
      }
    } else if (arg.type === 'MemberExpression') {
      const value = evaluateMemberExpression(arg, scope);
      if (typeof value === 'number') {
        numericArgs.push(value);
      }
    } else if (arg.type === 'FunctionCall') {
      const value = evaluateFunctionCall(arg, scope);
      if (typeof value === 'number') {
        numericArgs.push(value);
      }
      // PathSegments don't contribute to numeric args for context tracking
    }
  }
  return numericArgs;
}

/**
 * Update the ctx variable in scope with current context state
 */
function updateCtxVariable(scope: Scope): void {
  if (scope.evalState) {
    // Find the root scope to update ctx
    let rootScope = scope;
    while (rootScope.parent) {
      rootScope = rootScope.parent;
    }
    rootScope.variables.set('ctx', {
      type: 'ContextObject' as const,
      value: contextToObject(scope.evalState.pathContext),
    });
  }
}

function evaluatePathCommand(cmd: PathCommand, scope: Scope): string {
  // Empty command means it's a statement-level function call
  if (cmd.command === '') {
    const args = cmd.args.map((arg) => evaluatePathArg(arg, scope));
    return args.join(' ');
  }

  // Get string args for output
  const stringArgs = cmd.args.map((arg) => evaluatePathArg(arg, scope));
  const result = cmd.command + (stringArgs.length > 0 ? ' ' + stringArgs.join(' ') : '');

  // Update path context if tracking is enabled
  if (scope.evalState && cmd.command !== '') {
    const numericArgs = getNumericArgs(cmd.args, scope);
    updateContextForCommand(scope.evalState.pathContext, cmd.command, numericArgs);
    updateCtxVariable(scope);
  }

  return result;
}

/**
 * Parse a path string and update context for each command found.
 * Used for tracking context when stdlib functions return path strings.
 */
function parseAndTrackPathString(pathStr: string, scope: Scope): void {
  if (!scope.evalState) return;

  // Parse path commands from string: M 10 20 L 30 40 A 5 5 0 1 1 50 50 etc.
  const commandRegex = /([MLHVCSQTAZmlhvcsqtaz])\s*([\d\s.,-]*)/g;
  let match;

  while ((match = commandRegex.exec(pathStr)) !== null) {
    const command = match[1];
    const argsStr = match[2].trim();

    // Parse numeric arguments
    const args: number[] = [];
    if (argsStr) {
      const numMatches = argsStr.match(/-?[\d.]+/g);
      if (numMatches) {
        for (const num of numMatches) {
          args.push(parseFloat(num));
        }
      }
    }

    updateContextForCommand(scope.evalState.pathContext, command, args);
  }

  updateCtxVariable(scope);
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

/**
 * Result of context-aware evaluation
 */
export interface EvaluateWithContextResult {
  path: string;
  context: PathContext;
  logs: LogEntry[];
}

/**
 * Evaluate a program with path context tracking
 * Returns the path string, final context state, and any log() outputs
 */
export function evaluateWithContext(program: Program): EvaluateWithContextResult {
  const pathContext = createPathContext();
  const logs: LogEntry[] = [];
  const evalState: EvaluationState = { pathContext, logs };

  const scope = createScope();
  scope.evalState = evalState;

  // Initialize ctx variable
  scope.variables.set('ctx', {
    type: 'ContextObject' as const,
    value: contextToObject(pathContext),
  });

  // Note: log() is handled specially in evaluateFunctionCall, not registered here

  const path = evaluateStatements(program.body, scope);

  return {
    path,
    context: pathContext,
    logs,
  };
}

// Re-export types from context module
export type { PathContext, Point, CommandHistoryEntry } from './context';

// Re-export annotated evaluator and formatter
export { evaluateAnnotated, type AnnotatedOutput, type AnnotatedLine } from './annotated';
export { formatAnnotated, type FormatOptions } from './formatter';
