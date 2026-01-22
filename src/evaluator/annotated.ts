// Annotated evaluator - produces human-readable output with comments and annotations
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
  Comment,
} from '../parser/ast';
import { stdlib } from '../stdlib';
import { createPathContext, contextToObject, type PathContext } from './context';

// Types for annotated output
export type AnnotatedLine =
  | { type: 'comment'; text: string }
  | { type: 'path_command'; command: string; args: string; line?: number }
  | { type: 'loop_start'; variable: string; start: number; end: number; line: number }
  | { type: 'iteration'; index: number }
  | { type: 'iteration_skip'; count: number }
  | { type: 'loop_end' }
  | { type: 'function_call'; name: string; args: string; line: number }
  | { type: 'function_call_end' };

export interface AnnotatedOutput {
  lines: AnnotatedLine[];
}

// Value types (same as main evaluator)
export type Value = number | string | PathSegment | UserFunction | ContextObject;

export interface PathSegment {
  type: 'PathSegment';
  value: string;
}

export interface ContextObject {
  type: 'ContextObject';
  value: Record<string, unknown>;
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
  if (name in stdlib) {
    return stdlib[name as keyof typeof stdlib] as unknown as Value;
  }
  throw new Error(`Undefined variable: ${name}`);
}

function setVariable(scope: Scope, name: string, value: Value): void {
  scope.variables.set(name, value);
}

// Context for annotated evaluation
interface AnnotatedContext {
  output: AnnotatedLine[];
  comments: Comment[];
  currentOffset: number;
  indentLevel: number;
}

function emitCommentsUpTo(ctx: AnnotatedContext, targetOffset: number): void {
  while (ctx.comments.length > 0 && ctx.comments[0].loc.offset < targetOffset) {
    const comment = ctx.comments.shift()!;
    ctx.output.push({ type: 'comment', text: comment.text });
  }
}

// Helper to format error messages with line numbers
function formatError(message: string, line?: number): string {
  if (line !== undefined && line > 0) {
    return `Line ${line}: ${message}`;
  }
  return message;
}

function evaluateExpression(expr: Expression, scope: Scope): Value {
  const line = (expr as { loc?: { line: number } }).loc?.line;

  switch (expr.type) {
    case 'NumberLiteral':
      return expr.value;

    case 'Identifier':
      return lookupVariable(scope, expr.name);

    case 'BinaryExpression': {
      const left = evaluateExpression(expr.left, scope);
      const right = evaluateExpression(expr.right, scope);

      if (typeof left !== 'number' || typeof right !== 'number') {
        throw new Error(formatError(`Binary operator ${expr.operator} requires numeric operands`, line));
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
        throw new Error(formatError(`Unary operator ${expr.operator} requires numeric operand`, line));
      }
      switch (expr.operator) {
        case '-': return -arg;
        case '!': return arg ? 0 : 1;
      }
    }

    case 'CalcExpression':
      return evaluateExpression(expr.expression, scope);

    case 'FunctionCall':
      return evaluateFunctionCall(expr, scope, null); // No context for nested calls

    case 'StringLiteral':
      return expr.value;

    case 'MemberExpression':
      return evaluateMemberExpression(expr, scope);

    default:
      throw new Error(formatError(`Unknown expression type: ${(expr as Expression).type}`, line));
  }
}

function evaluateMemberExpression(expr: MemberExpression, scope: Scope): Value {
  const line = (expr as { loc?: { line: number } }).loc?.line;
  const obj = evaluateExpression(expr.object, scope);

  // Handle ContextObject property access
  if (typeof obj === 'object' && obj !== null && 'type' in obj && obj.type === 'ContextObject') {
    const contextObj = obj as ContextObject;
    const propValue = contextObj.value[expr.property];

    if (propValue === undefined) {
      throw new Error(formatError(`Property '${expr.property}' does not exist on context object`, line));
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

    throw new Error(formatError(`Cannot access property '${expr.property}' of type ${typeof propValue}`, line));
  }

  throw new Error(formatError(`Cannot access property '${expr.property}' on non-object value`, line));
}

function evaluateFunctionCall(call: FunctionCall, scope: Scope, ctx: AnnotatedContext | null): Value {
  // Special handling for log() function - just evaluate args and return empty
  if (call.name === 'log') {
    // Evaluate args to check for errors, but don't produce output in annotated mode
    call.args.forEach((arg) => evaluateExpression(arg, scope));
    return { type: 'PathSegment' as const, value: '' };
  }

  const fn = lookupVariable(scope, call.name);

  if (typeof fn === 'function') {
    const args = call.args.map((arg) => evaluateExpression(arg, scope));
    return (fn as (...args: number[]) => number)(...args as number[]);
  }

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

    // For annotated output, evaluate with context if available
    if (ctx) {
      const argsStr = args.map(a => String(a)).join(', ');
      ctx.output.push({
        type: 'function_call',
        name: call.name,
        args: argsStr,
        line: call.loc?.line ?? 0,
      });
      ctx.indentLevel++;
      evaluateStatementsAnnotated(userFn.body, fnScope, ctx);
      ctx.indentLevel--;
      ctx.output.push({ type: 'function_call_end' });
      return 0; // Return value not used for annotated output
    }

    const results: string[] = [];
    for (const stmt of userFn.body) {
      const result = evaluateStatementPlain(stmt, fnScope);
      if (result) results.push(result);
    }
    const resultStr = results.join(' ');
    if (resultStr) {
      return { type: 'PathSegment' as const, value: resultStr };
    }
    return resultStr;
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
      const value = evaluateFunctionCall(arg, scope, null);
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

// Plain evaluation (no annotations) for nested contexts
function evaluateStatementPlain(stmt: Statement, scope: Scope): string {
  switch (stmt.type) {
    case 'Comment':
      return '';

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

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new Error('for loop range must be finite');
      }

      const MAX_ITERATIONS = 10000;
      const ascending = start <= end;
      const iterations = ascending ? (end - start + 1) : (start - end + 1);
      if (iterations > MAX_ITERATIONS) {
        throw new Error(`for loop would run ${iterations} iterations (max ${MAX_ITERATIONS})`);
      }

      const results: string[] = [];
      if (ascending) {
        for (let i = start; i <= end; i++) {
          const loopScope = createScope(scope);
          setVariable(loopScope, stmt.variable, i);
          for (const bodyStmt of stmt.body) {
            const result = evaluateStatementPlain(bodyStmt, loopScope);
            if (result) results.push(result);
          }
        }
      } else {
        for (let i = start; i >= end; i--) {
          const loopScope = createScope(scope);
          setVariable(loopScope, stmt.variable, i);
          for (const bodyStmt of stmt.body) {
            const result = evaluateStatementPlain(bodyStmt, loopScope);
            if (result) results.push(result);
          }
        }
      }
      return results.join(' ');
    }

    case 'IfStatement': {
      const condition = evaluateExpression(stmt.condition, scope);
      const isTruthy = typeof condition === 'number' ? condition !== 0 : Boolean(condition);

      if (isTruthy) {
        const results: string[] = [];
        for (const bodyStmt of stmt.consequent) {
          const result = evaluateStatementPlain(bodyStmt, createScope(scope));
          if (result) results.push(result);
        }
        return results.join(' ');
      } else if (stmt.alternate) {
        const results: string[] = [];
        for (const bodyStmt of stmt.alternate) {
          const result = evaluateStatementPlain(bodyStmt, createScope(scope));
          if (result) results.push(result);
        }
        return results.join(' ');
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

    case 'PathCommand': {
      if (stmt.command === '') {
        const args = stmt.args.map((arg) => evaluatePathArg(arg, scope));
        return args.join(' ');
      }
      const args = stmt.args.map((arg) => evaluatePathArg(arg, scope));
      return stmt.command + (args.length > 0 ? ' ' + args.join(' ') : '');
    }

    default:
      throw new Error(`Unknown statement type: ${(stmt as Statement).type}`);
  }
}

// Annotated evaluation
function evaluateStatementAnnotated(stmt: Statement, scope: Scope, ctx: AnnotatedContext): void {
  // Emit any comments that appear before this statement
  if (stmt.type !== 'Comment' && 'loc' in stmt && stmt.loc) {
    emitCommentsUpTo(ctx, stmt.loc.offset);
  }

  switch (stmt.type) {
    case 'Comment':
      // Comments are handled via emitCommentsUpTo
      break;

    case 'LetDeclaration': {
      const value = evaluateExpression(stmt.value, scope);
      setVariable(scope, stmt.name, value);
      break;
    }

    case 'ForLoop': {
      const start = evaluateExpression(stmt.start, scope);
      const end = evaluateExpression(stmt.end, scope);

      if (typeof start !== 'number' || typeof end !== 'number') {
        throw new Error('for loop range must be numeric');
      }

      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new Error('for loop range must be finite');
      }

      const MAX_ITERATIONS = 10000;
      const ascending = start <= end;
      const totalIterations = ascending ? (end - start + 1) : (start - end + 1);
      if (totalIterations > MAX_ITERATIONS) {
        throw new Error(`for loop would run ${totalIterations} iterations (max ${MAX_ITERATIONS})`);
      }

      ctx.output.push({
        type: 'loop_start',
        variable: stmt.variable,
        start: start,
        end: end,
        line: stmt.loc?.line ?? 0,
      });

      ctx.indentLevel++;

      // Loop truncation: show first 3, skip, last 3 if > 10 iterations
      const TRUNCATE_THRESHOLD = 10;
      const SHOW_COUNT = 3;

      // Build iteration values array (handles both ascending and descending)
      const iterValues: number[] = [];
      if (ascending) {
        for (let i = start; i <= end; i++) iterValues.push(i);
      } else {
        for (let i = start; i >= end; i--) iterValues.push(i);
      }

      for (let iterIndex = 0; iterIndex < iterValues.length; iterIndex++) {
        const i = iterValues[iterIndex];

        // Determine if we should show this iteration
        const isFirstFew = iterIndex < SHOW_COUNT;
        const isLastFew = iterIndex >= totalIterations - SHOW_COUNT;
        const shouldShow = totalIterations <= TRUNCATE_THRESHOLD || isFirstFew || isLastFew;

        // Emit skip message when transitioning
        if (totalIterations > TRUNCATE_THRESHOLD && iterIndex === SHOW_COUNT) {
          const skipCount = totalIterations - (SHOW_COUNT * 2);
          ctx.output.push({ type: 'iteration_skip', count: skipCount });
        }

        if (shouldShow) {
          ctx.output.push({ type: 'iteration', index: i });

          const loopScope = createScope(scope);
          setVariable(loopScope, stmt.variable, i);

          for (const bodyStmt of stmt.body) {
            evaluateStatementAnnotated(bodyStmt, loopScope, ctx);
          }
        } else {
          // Still need to evaluate for side effects (variable assignments, etc.)
          const loopScope = createScope(scope);
          setVariable(loopScope, stmt.variable, i);
          for (const bodyStmt of stmt.body) {
            evaluateStatementPlain(bodyStmt, loopScope);
          }
        }
      }

      ctx.indentLevel--;
      ctx.output.push({ type: 'loop_end' });
      break;
    }

    case 'IfStatement': {
      const condition = evaluateExpression(stmt.condition, scope);
      const isTruthy = typeof condition === 'number' ? condition !== 0 : Boolean(condition);

      if (isTruthy) {
        for (const bodyStmt of stmt.consequent) {
          evaluateStatementAnnotated(bodyStmt, createScope(scope), ctx);
        }
      } else if (stmt.alternate) {
        for (const bodyStmt of stmt.alternate) {
          evaluateStatementAnnotated(bodyStmt, createScope(scope), ctx);
        }
      }
      break;
    }

    case 'FunctionDefinition': {
      const fn: UserFunction = {
        type: 'UserFunction',
        params: stmt.params,
        body: stmt.body,
      };
      setVariable(scope, stmt.name, fn);
      // Function definitions don't produce output
      break;
    }

    case 'PathCommand': {
      if (stmt.command === '') {
        // Statement-level function call
        const funcCall = stmt.args[0] as FunctionCall;
        const fn = lookupVariable(scope, funcCall.name);

        if (typeof fn === 'function') {
          // Stdlib function - evaluate and emit result
          const args = funcCall.args.map((arg) => evaluateExpression(arg, scope));
          const result = (fn as (...args: number[]) => number)(...args as number[]);
          if (typeof result === 'object' && result !== null && 'type' in result && (result as PathSegment).type === 'PathSegment') {
            // Split path segment into individual commands for better formatting
            const pathStr = (result as PathSegment).value;
            const argsStr = args.map(a => String(a)).join(', ');
            ctx.output.push({
              type: 'function_call',
              name: funcCall.name,
              args: argsStr,
              line: funcCall.loc?.line ?? 0,
            });
            ctx.indentLevel++;
            // Emit the path data as individual path commands
            emitPathString(pathStr, ctx);
            ctx.indentLevel--;
            ctx.output.push({ type: 'function_call_end' });
          } else if (typeof result === 'string') {
            const argsStr = args.map(a => String(a)).join(', ');
            ctx.output.push({
              type: 'function_call',
              name: funcCall.name,
              args: argsStr,
              line: funcCall.loc?.line ?? 0,
            });
            ctx.indentLevel++;
            emitPathString(result, ctx);
            ctx.indentLevel--;
            ctx.output.push({ type: 'function_call_end' });
          }
        } else if (typeof fn === 'object' && fn !== null && 'type' in fn && fn.type === 'UserFunction') {
          // User-defined function
          evaluateFunctionCall(funcCall, scope, ctx);
        }
      } else {
        // Regular path command
        const args = stmt.args.map((arg) => evaluatePathArg(arg, scope));
        ctx.output.push({
          type: 'path_command',
          command: stmt.command,
          args: args.join(' '),
          line: stmt.loc?.line,
        });
      }
      break;
    }

    default:
      throw new Error(`Unknown statement type: ${(stmt as Statement).type}`);
  }
}

// Helper to emit a path string as individual commands
function emitPathString(pathStr: string, ctx: AnnotatedContext): void {
  // Simple parsing: split on command letters
  const commandRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;
  while ((match = commandRegex.exec(pathStr)) !== null) {
    const command = match[1];
    const args = match[2].trim();
    ctx.output.push({
      type: 'path_command',
      command,
      args,
    });
  }
}

function evaluateStatementsAnnotated(stmts: Statement[], scope: Scope, ctx: AnnotatedContext): void {
  for (const stmt of stmts) {
    evaluateStatementAnnotated(stmt, scope, ctx);
  }
}

export function evaluateAnnotated(program: Program, comments: Comment[]): AnnotatedOutput {
  const scope = createScope();

  // Initialize ctx variable with a path context (note: positions won't be accurate in annotated mode)
  const pathContext = createPathContext();
  scope.variables.set('ctx', {
    type: 'ContextObject' as const,
    value: contextToObject(pathContext),
  });

  const ctx: AnnotatedContext = {
    output: [],
    comments: [...comments], // Copy to avoid mutating original
    currentOffset: 0,
    indentLevel: 0,
  };

  evaluateStatementsAnnotated(program.body, scope, ctx);

  // Emit any remaining comments
  while (ctx.comments.length > 0) {
    const comment = ctx.comments.shift()!;
    ctx.output.push({ type: 'comment', text: comment.text });
  }

  return { lines: ctx.output };
}
