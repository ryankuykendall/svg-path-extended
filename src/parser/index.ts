import Parsimmon from 'parsimmon';
import type {
  Program,
  Statement,
  Expression,
  PathArg,
  NumberLiteral,
  StringLiteral,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  CalcExpression,
  FunctionCall,
  MemberExpression,
  PathCommand,
  LetDeclaration,
  AssignmentStatement,
  ForLoop,
  IfStatement,
  FunctionDefinition,
  ReturnStatement,
  SourceLocation,
  Comment,
} from './ast';

const P = Parsimmon;

// Helper to convert Parsimmon Index to SourceLocation
function indexToLoc(index: Parsimmon.Index): SourceLocation {
  return {
    line: index.line,
    column: index.column,
    offset: index.offset,
  };
}

// Path command letters (cannot be used as identifiers in path context)
const PATH_COMMANDS = 'MLHVCSQTAZmlhvcsqtaz';

// Whitespace and comments (// line comments)
const optWhitespace = P.regexp(/(?:\s|\/\/[^\n]*)*/);

// Lexer helpers
function token<T>(parser: Parsimmon.Parser<T>): Parsimmon.Parser<T> {
  return parser.skip(optWhitespace);
}

function word(str: string): Parsimmon.Parser<string> {
  return token(P.string(str));
}

function keyword(str: string): Parsimmon.Parser<string> {
  return token(P.regexp(new RegExp(str + '(?![a-zA-Z0-9_])')));
}

// Number literal: 123, 45.67, -89, .5, optionally with angle unit suffix (deg/rad/pi)
// Uses negative lookahead to avoid consuming '.' when followed by '..' (range operator)
const numberLiteral: Parsimmon.Parser<NumberLiteral> = token(
  P.regexp(/-?(?:\d+(?:\.(?!\.))\d*|\.\d+|\d+)(deg|rad|pi)?/)
).map((str) => {
  const match = str.match(/^(-?(?:\d+(?:\.\d*)?|\.\d+|\d+))(deg|rad|pi)?$/);
  return {
    type: 'NumberLiteral' as const,
    value: parseFloat(match![1]),
    unit: match![2] as 'deg' | 'rad' | 'pi' | undefined,
  };
});

// String literal: "hello" or 'hello'
// Supports escape sequences: \n, \t, \\, \", \'
const stringLiteral: Parsimmon.Parser<StringLiteral> = token(
  P.alt(
    P.regexp(/"(?:[^"\\]|\\.)*"/).map((str) => str.slice(1, -1)),
    P.regexp(/'(?:[^'\\]|\\.)*'/).map((str) => str.slice(1, -1))
  )
).map((value) => ({
  type: 'StringLiteral' as const,
  value: value
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\'),
}));

// Identifier: x, myVar, _private (for general use)
const identifier: Parsimmon.Parser<Identifier> = token(
  P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/)
).map((name) => ({
  type: 'Identifier' as const,
  name,
}));

// Reserved words that cannot be identifiers
const reservedWords = ['let', 'for', 'in', 'if', 'else', 'fn', 'calc', 'log', 'return'];

// Context-aware functions that should be parsed as statements, not path arguments
// These functions require path context and produce path output
const contextAwareFunctionNames = [
  'polarPoint',
  'polarOffset',
  'polarMove',
  'polarLine',
  'arcFromCenter',
  'tangentLine',
  'tangentArc',
];

const nonReservedIdentifier: Parsimmon.Parser<Identifier> = identifier.chain((id) =>
  reservedWords.includes(id.name)
    ? P.fail(`Reserved word: ${id.name}`)
    : P.succeed(id)
);

// Identifier that is NOT a path command letter (for path arguments)
const nonPathCommandIdentifier: Parsimmon.Parser<Identifier> = token(
  P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/)
).chain((name) => {
  if (name.length === 1 && PATH_COMMANDS.includes(name)) {
    return P.fail(`Path command letter cannot be used as identifier: ${name}`);
  }
  if (reservedWords.includes(name)) {
    return P.fail(`Reserved word: ${name}`);
  }
  return P.succeed({ type: 'Identifier' as const, name });
});

// Property access: chains .property after a base expression
// Returns either the base or a MemberExpression chain
function withMemberAccess(base: Parsimmon.Parser<Expression>): Parsimmon.Parser<Expression> {
  return base.chain((baseExpr) =>
    P.seq(P.string('.'), token(P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/)))
      .many()
      .map((properties) =>
        properties.reduce<Expression>(
          (obj, [, prop]) => ({
            type: 'MemberExpression' as const,
            object: obj,
            property: prop,
          }),
          baseExpr
        )
      )
  );
}

// Member expression for path arguments (base cannot be path command letter or context-aware function call)
// Type is narrowed to Identifier | MemberExpression to satisfy PathArg
const pathMemberExpression: Parsimmon.Parser<Identifier | MemberExpression> =
  // First check: fail if this is a context-aware function followed by '('
  P.lookahead(
    P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/).chain((name) => {
      if (contextAwareFunctionNames.includes(name)) {
        // Peek ahead to check if followed by '(' (with optional whitespace)
        return P.regexp(/\s*\(/).map(() => 'function-call').or(P.succeed('not-function-call'));
      }
      return P.succeed('not-context-aware');
    }).chain((result) => {
      if (result === 'function-call') {
        return P.fail('context-aware function call');
      }
      return P.succeed(null);
    })
  ).then(
    nonPathCommandIdentifier.chain((baseExpr) =>
      P.seq(P.string('.'), token(P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/)))
        .many()
        .map((properties) =>
          properties.reduce<Identifier | MemberExpression>(
            (obj, [, prop]) => ({
              type: 'MemberExpression' as const,
              object: obj,
              property: prop,
            }),
            baseExpr
          )
        )
    )
  );

// Expression parser with operator precedence
const expression: Parsimmon.Parser<Expression> = P.lazy(() => orExpression);

// Operators by precedence (lowest to highest)
const orExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  andExpression.chain((first) =>
    P.seq(word('||'), andExpression)
      .many()
      .map((rest) =>
        rest.reduce<Expression>(
          (left, [op, right]) => ({
            type: 'BinaryExpression',
            operator: op as BinaryExpression['operator'],
            left,
            right,
          }),
          first
        )
      )
  )
);

const andExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  equalityExpression.chain((first) =>
    P.seq(word('&&'), equalityExpression)
      .many()
      .map((rest) =>
        rest.reduce<Expression>(
          (left, [op, right]) => ({
            type: 'BinaryExpression',
            operator: op as BinaryExpression['operator'],
            left,
            right,
          }),
          first
        )
      )
  )
);

const equalityExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  comparisonExpression.chain((first) =>
    P.seq(P.alt(word('=='), word('!=')), comparisonExpression)
      .many()
      .map((rest) =>
        rest.reduce<Expression>(
          (left, [op, right]) => ({
            type: 'BinaryExpression',
            operator: op as BinaryExpression['operator'],
            left,
            right,
          }),
          first
        )
      )
  )
);

const comparisonExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  additiveExpression.chain((first) =>
    P.seq(
      P.alt(word('<='), word('>='), word('<'), word('>')),
      additiveExpression
    )
      .many()
      .map((rest) =>
        rest.reduce<Expression>(
          (left, [op, right]) => ({
            type: 'BinaryExpression',
            operator: op as BinaryExpression['operator'],
            left,
            right,
          }),
          first
        )
      )
  )
);

const additiveExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  multiplicativeExpression.chain((first) =>
    P.seq(P.alt(word('+'), word('-')), multiplicativeExpression)
      .many()
      .map((rest) =>
        rest.reduce<Expression>(
          (left, [op, right]) => ({
            type: 'BinaryExpression',
            operator: op as BinaryExpression['operator'],
            left,
            right,
          }),
          first
        )
      )
  )
);

const multiplicativeExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  unaryExpression.chain((first) =>
    P.seq(P.alt(word('*'), word('/'), word('%')), unaryExpression)
      .many()
      .map((rest) =>
        rest.reduce<Expression>(
          (left, [op, right]) => ({
            type: 'BinaryExpression',
            operator: op as BinaryExpression['operator'],
            left,
            right,
          }),
          first
        )
      )
  )
);

const unaryExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  P.alt(
    P.seq(P.alt(word('-'), word('!')), unaryExpression).map(
      ([op, arg]): UnaryExpression => ({
        type: 'UnaryExpression',
        operator: op as UnaryExpression['operator'],
        argument: arg,
      })
    ),
    primaryExpression
  )
);

// Function call: name(arg1, arg2, ...)
const functionCall: Parsimmon.Parser<FunctionCall> = P.seqMap(
  P.index,
  token(P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/)),
  P.string('(').skip(optWhitespace),
  P.sepBy(P.lazy(() => expression), word(',')),
  word(')'),
  (startIndex, name, _open, args, _close) => ({
    type: 'FunctionCall' as const,
    name,
    args,
    loc: indexToLoc(startIndex),
  })
);

// Primary expression: number, string, calc, identifier (with optional property access), function call, or parenthesized expression
const primaryExpression: Parsimmon.Parser<Expression> = P.lazy(() =>
  P.alt(
    numberLiteral,
    stringLiteral,
    calcExpression,
    functionCall,
    withMemberAccess(nonReservedIdentifier),
    P.seq(word('('), expression, word(')')).map(([, expr]) => expr)
  )
);

// calc(expression)
const calcExpression: Parsimmon.Parser<CalcExpression> = P.seqMap(
  keyword('calc'),
  P.string('(').skip(optWhitespace),
  expression,
  word(')'),
  (_calc, _open, expr, _close) => ({
    type: 'CalcExpression' as const,
    expression: expr,
  })
);

// Function call for path arguments (must check it's not a path command or reserved word)
// Uses lookahead to reject context-aware functions WITHOUT consuming input
const pathFunctionCall: Parsimmon.Parser<FunctionCall> = P.seqMap(
  // First, use lookahead to check if this is a context-aware function (fail early without consuming)
  P.lookahead(
    P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/).chain((name) => {
      if (contextAwareFunctionNames.includes(name)) {
        return P.fail('context-aware function');
      }
      return P.succeed(name);
    })
  ),
  P.index,
  token(P.regexp(/[a-zA-Z_][a-zA-Z0-9_]*/)).chain((name) => {
    // Reject reserved words (they start statements, not function calls in path context)
    if (reservedWords.includes(name)) {
      return P.fail(`Reserved word: ${name}`);
    }
    return P.succeed(name);
  }),
  P.string('(').skip(optWhitespace),
  P.sepBy(P.lazy(() => expression), word(',')),
  word(')'),
  (_lookahead, startIndex, name, _open, args, _close) => ({
    type: 'FunctionCall' as const,
    name,
    args,
    loc: indexToLoc(startIndex),
  })
);

// Path argument: number, identifier (non-path-command) with optional property access, calc(), or function call
const pathArg: Parsimmon.Parser<PathArg> = P.alt(
  calcExpression,
  pathFunctionCall,
  numberLiteral,
  pathMemberExpression
);

// Path command: M, L, C, A, Z, etc. followed by arguments
// Arguments stop when we see another path command letter or end of input
const pathCommand: Parsimmon.Parser<PathCommand> = P.seqMap(
  P.index,
  token(P.regexp(/[MLHVCSQTAZmlhvcsqtaz]/)),
  pathArg.many(),
  (startIndex, command, args) => ({
    type: 'PathCommand' as const,
    command,
    args,
    loc: indexToLoc(startIndex),
  })
);

// let declaration: let x = 10;
const letDeclaration: Parsimmon.Parser<LetDeclaration> = P.seqMap(
  keyword('let'),
  nonReservedIdentifier,
  word('='),
  expression,
  word(';'),
  (_let, id, _eq, value, _semi) => ({
    type: 'LetDeclaration' as const,
    name: id.name,
    value,
  })
);

// Block: { statements }
const block: Parsimmon.Parser<Statement[]> = P.lazy(() =>
  P.seq(word('{'), statement.many(), word('}')).map(([, stmts]) => stmts)
);

// Simple value for for-loop range (number or identifier, not full expression to avoid ambiguity)
const rangeValue: Parsimmon.Parser<Expression> = P.alt(
  numberLiteral,
  nonReservedIdentifier
);

// for loop: for (i in 0..10) { ... }
const forLoop: Parsimmon.Parser<ForLoop> = P.seqMap(
  P.index,
  keyword('for'),
  word('('),
  nonReservedIdentifier,
  keyword('in'),
  rangeValue,
  token(P.string('..')),
  rangeValue,
  word(')'),
  block,
  (startIndex, _for, _lp, id, _in, start, _dots, end, _rp, body) => ({
    type: 'ForLoop' as const,
    variable: id.name,
    start,
    end,
    body,
    loc: indexToLoc(startIndex),
  })
);

// if statement: if (condition) { ... } else { ... }
const ifStatement: Parsimmon.Parser<IfStatement> = P.seqMap(
  keyword('if'),
  word('('),
  expression,
  word(')'),
  block,
  P.seq(keyword('else'), P.alt(
    P.lazy(() => ifStatement).map(stmt => [stmt]),
    block
  )).map(([, b]) => b).fallback(null),
  (_if, _lp, condition, _rp, consequent, alternate) => ({
    type: 'IfStatement' as const,
    condition,
    consequent,
    alternate,
  })
);

// function definition: fn name(a, b) { ... }
const functionDefinition: Parsimmon.Parser<FunctionDefinition> = P.seqMap(
  keyword('fn'),
  nonReservedIdentifier,
  word('('),
  P.sepBy(nonReservedIdentifier, word(',')),
  word(')'),
  block,
  (_fn, id, _lp, params, _rp, body) => ({
    type: 'FunctionDefinition' as const,
    name: id.name,
    params: params.map((p) => p.name),
    body,
  })
);

// return statement: return expr;
const returnStatement: Parsimmon.Parser<ReturnStatement> = P.seqMap(
  keyword('return'),
  expression,
  word(';'),
  (_return, value, _semi) => ({
    type: 'ReturnStatement' as const,
    value,
  })
);

// Assignment statement: x = expr;
const assignmentStatement: Parsimmon.Parser<AssignmentStatement> = P.seqMap(
  nonReservedIdentifier,
  token(P.regexp(/=(?!=)/)),  // '=' NOT followed by '=' (avoids matching '==')
  expression,
  word(';'),
  (id, _eq, value, _semi) => ({
    type: 'AssignmentStatement' as const,
    name: id.name,
    value,
  })
);

// Statement-level function call (like circle(50, 50, 25))
interface FunctionCallStatement {
  type: 'FunctionCallStatement';
  call: FunctionCall;
}

const functionCallStatement: Parsimmon.Parser<PathCommand> = P.seqMap(
  functionCall,
  word(';').atMost(1),  // Optional semicolon
  (call) => ({
    type: 'PathCommand' as const,
    command: '',  // Empty command means it's a function call at statement level
    args: [call],
    loc: call.loc,
  })
);

// Statement
// Important: functionCallStatement must come BEFORE pathCommand to avoid
// 'circle(...)' being parsed as path command 'c' + 'ircle(...)'
const statement: Parsimmon.Parser<Statement> = P.alt(
  letDeclaration,
  forLoop,
  ifStatement,
  functionDefinition,
  returnStatement,
  assignmentStatement,
  functionCallStatement,
  pathCommand
);

// Program
const program: Parsimmon.Parser<Program> = optWhitespace
  .then(statement.many())
  .map((body) => ({
    type: 'Program' as const,
    body,
  }));

export function parse(input: string): Program {
  const result = program.parse(input);
  if (result.status) {
    return result.value;
  } else {
    const { index, expected } = result;
    const lines = input.slice(0, index.offset).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    throw new Error(
      `Parse error at line ${line}, column ${column}: expected ${expected.join(' or ')}`
    );
  }
}

// Extract comments from source code
// Returns array of Comment nodes with their positions
export function extractComments(input: string): Comment[] {
  const comments: Comment[] = [];
  const lines = input.split('\n');

  let offset = 0;
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    const commentMatch = line.match(/\/\/(.*)$/);

    if (commentMatch) {
      const commentStart = line.indexOf('//');
      comments.push({
        type: 'Comment',
        text: '//' + commentMatch[1],
        loc: {
          line: lineNum + 1, // 1-indexed
          column: commentStart + 1, // 1-indexed
          offset: offset + commentStart,
        },
      });
    }

    offset += line.length + 1; // +1 for newline
  }

  return comments;
}

// Parse result that includes both AST and comments
export interface ParseResultWithComments {
  program: Program;
  comments: Comment[];
}

// Parse input and extract comments separately
export function parseWithComments(input: string): ParseResultWithComments {
  return {
    program: parse(input),
    comments: extractComments(input),
  };
}

export { program, expression, pathCommand, statement };
