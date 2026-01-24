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
  ReturnStatement,
  FunctionCall,
  MemberExpression,
  Comment,
} from '../parser/ast';
import { stdlib, contextAwareFunctions } from '../stdlib';
import { createPathContext, contextToObject, updateContextForCommand, type PathContext } from './context';

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
export type Value = number | string | PathSegment | UserFunction | ContextObject | PathWithResult;

export interface PathSegment {
  type: 'PathSegment';
  value: string;
}

export interface ContextObject {
  type: 'ContextObject';
  value: Record<string, unknown>;
}

/**
 * Represents a function result that includes both path output AND a result value.
 * Used by functions like arcFromCenter that emit path and return arc info.
 */
export interface PathWithResult {
  type: 'PathWithResult';
  path: string;      // The path string to emit
  result: ContextObject;  // The result value (for assignments)
}

export interface UserFunction {
  type: 'UserFunction';
  params: string[];
  body: Statement[];
}

/**
 * Signal class used to propagate return values up the call stack.
 * Thrown by return statements and caught by function call evaluation.
 */
class ReturnSignal {
  constructor(public value: Value) {}
}

/**
 * Evaluation state for context-aware evaluation
 */
export interface EvaluationState {
  pathContext: PathContext;
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
  if (name in stdlib) {
    return stdlib[name as keyof typeof stdlib] as unknown as Value;
  }
  throw new Error(`Undefined variable: ${name}`);
}

function setVariable(scope: Scope, name: string, value: Value): void {
  scope.variables.set(name, value);
}

/**
 * Convert angle value based on unit suffix
 * - 'deg': converts degrees to radians
 * - 'rad' or undefined: returns value unchanged (radians are internal standard)
 */
function convertAngleUnit(value: number, unit?: 'deg' | 'rad'): number {
  if (unit === 'deg') {
    return value * Math.PI / 180;
  }
  return value; // rad or no unit = radians (internal standard)
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
      const value = evaluateFunctionCall(arg, scope, null);
      if (typeof value === 'number') {
        numericArgs.push(value);
      }
      // PathSegments don't contribute to numeric args for context tracking
    }
  }
  return numericArgs;
}

/**
 * Evaluate a context-aware function that needs access to path context
 */
function evaluateContextAwareFunction(name: string, args: Value[], scope: Scope): Value {
  const ctx = scope.evalState!.pathContext;

  switch (name) {
    case 'polarPoint': {
      // polarPoint(angle, distance) → ContextObject with absolute {x, y}
      const [angle, distance] = args as [number, number];
      return {
        type: 'ContextObject' as const,
        value: {
          x: ctx.position.x + Math.cos(angle) * distance,
          y: ctx.position.y + Math.sin(angle) * distance,
        },
      };
    }

    case 'polarOffset': {
      // polarOffset(angle, distance) → ContextObject with relative {dx, dy}
      const [angle, distance] = args as [number, number];
      return {
        type: 'ContextObject' as const,
        value: {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
        },
      };
    }

    case 'polarMove': {
      // polarMove(angle, distance, isMoveTo?) → PathSegment
      const [angle, distance, isMoveTo = 0] = args as number[];
      const x = ctx.position.x + Math.cos(angle) * distance;
      const y = ctx.position.y + Math.sin(angle) * distance;
      const command = isMoveTo ? 'M' : 'L';

      updateContextForCommand(ctx, command, [x, y]);
      ctx.lastTangent = angle;  // Set tangent to movement direction
      updateCtxVariable(scope);

      return { type: 'PathSegment' as const, value: `${command} ${x} ${y}` };
    }

    case 'polarLine': {
      // polarLine(angle, distance) → PathSegment (always L command)
      const [angle, distance] = args as [number, number];
      const x = ctx.position.x + Math.cos(angle) * distance;
      const y = ctx.position.y + Math.sin(angle) * distance;

      updateContextForCommand(ctx, 'L', [x, y]);
      ctx.lastTangent = angle;
      updateCtxVariable(scope);

      return { type: 'PathSegment' as const, value: `L ${x} ${y}` };
    }

    case 'arcFromCenter': {
      // arcFromCenter(dcx, dcy, radius, startAngle, endAngle, clockwise) → PathWithResult
      // dcx, dcy are relative offsets from current position to the arc center
      const [dcx, dcy, radius, startAngle, endAngle, clockwise] = args as number[];

      // Calculate absolute center from current position + offset
      const centerX = ctx.position.x + dcx;
      const centerY = ctx.position.y + dcy;

      // Calculate start/end points from center
      const startX = centerX + radius * Math.cos(startAngle);
      const startY = centerY + radius * Math.sin(startAngle);
      const endX = centerX + radius * Math.cos(endAngle);
      const endY = centerY + radius * Math.sin(endAngle);

      // Calculate arc flags
      const sweep = clockwise ? 1 : 0;
      const angleDiff = clockwise ? endAngle - startAngle : startAngle - endAngle;
      // Normalize angle difference to handle wrap-around
      const normalizedDiff = ((angleDiff % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const largeArc = normalizedDiff > Math.PI ? 1 : 0;

      // Tangent angle at endpoint (perpendicular to radius)
      const tangentAngle = clockwise ? endAngle + Math.PI / 2 : endAngle - Math.PI / 2;

      // Generate path string
      const pathStr = `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`;

      // Update context tracking
      parseAndTrackPathString(pathStr, scope);

      // Store tangent for tangentLine/tangentArc
      ctx.lastTangent = tangentAngle;
      updateCtxVariable(scope);

      // Return both path and result info
      return {
        type: 'PathWithResult' as const,
        path: pathStr,
        result: {
          type: 'ContextObject' as const,
          value: {
            point: { x: endX, y: endY },
            angle: tangentAngle,
          },
        },
      };
    }

    case 'tangentLine': {
      // tangentLine(length) → PathSegment
      const [length] = args as [number];

      if (ctx.lastTangent === undefined) {
        throw new Error('tangentLine requires a previous arc or polar command');
      }

      const x = ctx.position.x + Math.cos(ctx.lastTangent) * length;
      const y = ctx.position.y + Math.sin(ctx.lastTangent) * length;

      updateContextForCommand(ctx, 'L', [x, y]);
      // lastTangent stays the same (continuing in same direction)
      updateCtxVariable(scope);

      return { type: 'PathSegment' as const, value: `L ${x} ${y}` };
    }

    case 'tangentArc': {
      // tangentArc(radius, sweepAngle) → PathWithResult
      const [radius, sweepAngle] = args as [number, number];

      if (ctx.lastTangent === undefined) {
        throw new Error('tangentArc requires a previous arc or polar command');
      }

      // Center is perpendicular to tangent direction
      // For positive sweep (turning right on screen): center is to the right (+π/2 from heading)
      // For negative sweep (turning left on screen): center is to the left (-π/2 from heading)
      const toCenter = ctx.lastTangent + (sweepAngle >= 0 ? Math.PI / 2 : -Math.PI / 2);
      const cx = ctx.position.x + Math.cos(toCenter) * radius;
      const cy = ctx.position.y + Math.sin(toCenter) * radius;

      // Start angle is from center to current position
      const startAngle = Math.atan2(ctx.position.y - cy, ctx.position.x - cx);
      const endAngle = startAngle + sweepAngle;

      // End point
      const endX = cx + radius * Math.cos(endAngle);
      const endY = cy + radius * Math.sin(endAngle);

      // Arc flags
      const sweep = sweepAngle >= 0 ? 1 : 0;
      const largeArc = Math.abs(sweepAngle) > Math.PI ? 1 : 0;

      // New tangent at endpoint
      const newTangent = sweepAngle >= 0 ? endAngle + Math.PI / 2 : endAngle - Math.PI / 2;

      // Generate path string
      const pathStr = `A ${radius} ${radius} 0 ${largeArc} ${sweep} ${endX} ${endY}`;

      // Update context tracking
      parseAndTrackPathString(pathStr, scope);

      ctx.lastTangent = newTangent;
      updateCtxVariable(scope);

      // Return both path and result info
      return {
        type: 'PathWithResult' as const,
        path: pathStr,
        result: {
          type: 'ContextObject' as const,
          value: {
            point: { x: endX, y: endY },
            angle: newTangent,
          },
        },
      };
    }

    default:
      throw new Error(`Unknown context-aware function: ${name}`);
  }
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
      return convertAngleUnit(expr.value, expr.unit);

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

  // Check if it's a context-aware function
  if (contextAwareFunctions.has(call.name)) {
    if (!scope.evalState) {
      throw new Error(`Function '${call.name}' requires evaluation context`);
    }
    const args = call.args.map((arg) => evaluateExpression(arg, scope));
    return evaluateContextAwareFunction(call.name, args, scope);
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
      try {
        evaluateStatementsAnnotated(userFn.body, fnScope, ctx);
      } catch (e) {
        if (e instanceof ReturnSignal) {
          // Return statement encountered - return the value
          ctx.indentLevel--;
          ctx.output.push({ type: 'function_call_end' });
          return e.value;
        }
        throw e;
      }
      ctx.indentLevel--;
      ctx.output.push({ type: 'function_call_end' });
      return 0; // Return value not used for annotated output
    }

    try {
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
    } catch (e) {
      if (e instanceof ReturnSignal) {
        return e.value;
      }
      throw e;
    }
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
      if (typeof value === 'object' && value !== null && 'type' in value) {
        if (value.type === 'PathSegment') {
          return value.value;
        }
        if (value.type === 'PathWithResult') {
          // Extract path from compound result (result is stored but path is emitted)
          return (value as PathWithResult).path;
        }
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

// Plain evaluation (no annotations) for nested contexts
function evaluateStatementPlain(stmt: Statement, scope: Scope): string {
  switch (stmt.type) {
    case 'Comment':
      return '';

    case 'LetDeclaration': {
      const value = evaluateExpression(stmt.value, scope);
      // Handle PathWithResult: assign the result to variable, emit the path
      if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'PathWithResult') {
        const pwr = value as PathWithResult;
        setVariable(scope, stmt.name, pwr.result);
        return pwr.path;  // Emit the path
      }
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
      const result = stmt.command + (args.length > 0 ? ' ' + args.join(' ') : '');

      // Update path context if tracking is enabled
      if (scope.evalState && stmt.command !== '') {
        const numericArgs = getNumericArgs(stmt.args, scope);
        updateContextForCommand(scope.evalState.pathContext, stmt.command, numericArgs);
        updateCtxVariable(scope);
      }

      return result;
    }

    case 'ReturnStatement': {
      const value = evaluateExpression(stmt.value, scope);
      throw new ReturnSignal(value);
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
      // Handle PathWithResult: assign the result to variable, emit the path
      if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'PathWithResult') {
        const pwr = value as PathWithResult;
        setVariable(scope, stmt.name, pwr.result);
        // Emit the path commands
        emitPathString(pwr.path, ctx);
      } else {
        setVariable(scope, stmt.name, value);
      }
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

        // Check for context-aware functions first
        if (contextAwareFunctions.has(funcCall.name)) {
          if (!scope.evalState) {
            throw new Error(`Function '${funcCall.name}' requires evaluation context`);
          }
          const args = funcCall.args.map((arg) => evaluateExpression(arg, scope));
          const result = evaluateContextAwareFunction(funcCall.name, args, scope);
          const argsStr = args.map(a => String(a)).join(', ');
          ctx.output.push({
            type: 'function_call',
            name: funcCall.name,
            args: argsStr,
            line: funcCall.loc?.line ?? 0,
          });
          ctx.indentLevel++;
          // Extract path string from result
          let pathStr = '';
          if (typeof result === 'object' && result !== null && 'type' in result) {
            if (result.type === 'PathSegment') {
              pathStr = (result as PathSegment).value;
            } else if (result.type === 'PathWithResult') {
              pathStr = (result as PathWithResult).path;
            }
          }
          if (pathStr) {
            emitPathString(pathStr, ctx);
          }
          ctx.indentLevel--;
          ctx.output.push({ type: 'function_call_end' });
          break;
        }

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

        // Update path context if tracking is enabled
        if (scope.evalState && stmt.command !== '') {
          const numericArgs = getNumericArgs(stmt.args, scope);
          updateContextForCommand(scope.evalState.pathContext, stmt.command, numericArgs);
          updateCtxVariable(scope);
        }
      }
      break;
    }

    case 'ReturnStatement': {
      const value = evaluateExpression(stmt.value, scope);
      throw new ReturnSignal(value);
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

  // Initialize path context and evaluation state
  const pathContext = createPathContext();
  const evalState: EvaluationState = { pathContext };
  scope.evalState = evalState;

  // Initialize ctx variable with a path context
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
