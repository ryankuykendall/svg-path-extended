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
import { stdlib, contextAwareFunctions } from '../stdlib';
import {
  type PathContext,
  type Point,
  type CommandHistoryEntry,
  createPathContext,
  updateContextForCommand,
  contextToObject,
} from './context';

export type Value = number | string | PathSegment | UserFunction | ContextObject | PathWithResult;

/**
 * Represents an object value that supports property access (like ctx)
 */
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
      return String(expr.value) + (expr.unit || '');
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

function evaluateExpression(expr: Expression, scope: Scope): Value {
  switch (expr.type) {
    case 'NumberLiteral':
      return convertAngleUnit(expr.value, expr.unit);

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

// Check if an expression looks like it's intended for math log (natural logarithm)
function isMathLogCandidate(arg: Expression): boolean {
  // Plain number literal without unit (like log(1), log(2.5)) → math log
  if (arg.type === 'NumberLiteral' && !arg.unit) {
    return true;
  }
  // Function call to known math functions that return numbers → math log
  // e.g., log(E()), log(sqrt(2))
  if (arg.type === 'FunctionCall' && arg.name in stdlib) {
    return true;
  }
  // Everything else (90deg, ctx.position.x, variables, expressions) → debug log
  return false;
}

function evaluateFunctionCall(call: FunctionCall, scope: Scope): Value {
  // Special handling for log() function - distinguish between debug log and math log
  // Math log: single arg that is a plain number or math function call (log(1), log(E()))
  // Debug log: everything else (log(ctx), log(90deg), log("msg"), log(x, y))
  if (call.name === 'log' && scope.evalState) {
    // Only use math log for clear math-log-like calls
    if (call.args.length === 1 && isMathLogCandidate(call.args[0])) {
      const argValue = evaluateExpression(call.args[0], scope);
      if (typeof argValue === 'number') {
        // It's a numeric value - use math log (natural logarithm)
        const fn = stdlib[call.name as keyof typeof stdlib];
        if (fn && typeof fn === 'function') {
          return (fn as (x: number) => number)(argValue);
        }
      }
    }

    // Debug log handling
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

    scope.evalState!.logs.push({ line: lineNumber, parts });
    return { type: 'PathSegment' as const, value: '' };  // Empty path segment
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

/**
 * Evaluate a context-aware function that needs access to path context
 */
function evaluateContextAwareFunction(name: string, args: Value[], scope: Scope): Value {
  const ctx = scope.evalState!.pathContext;

  switch (name) {
    case 'polarPoint': {
      // polarPoint(angle, distance) → ContextObject with {x, y}
      const [angle, distance] = args as [number, number];
      return {
        type: 'ContextObject' as const,
        value: {
          x: ctx.position.x + Math.cos(angle) * distance,
          y: ctx.position.y + Math.sin(angle) * distance,
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
      // arcFromCenter(cx, cy, radius, startAngle, endAngle, clockwise) → PathWithResult
      const [cx, cy, radius, startAngle, endAngle, clockwise] = args as number[];

      // Calculate start/end points
      const startX = cx + radius * Math.cos(startAngle);
      const startY = cy + radius * Math.sin(startAngle);
      const endX = cx + radius * Math.cos(endAngle);
      const endY = cy + radius * Math.sin(endAngle);

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
