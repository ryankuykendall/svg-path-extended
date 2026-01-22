import { describe, it, expect } from 'vitest';
import { parse, extractComments, parseWithComments } from '../src/parser';

describe('Parser', () => {
  describe('path commands', () => {
    it('parses simple path commands with numbers', () => {
      const ast = parse('M 10 20');
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]).toMatchObject({
        type: 'PathCommand',
        command: 'M',
        args: [
          { type: 'NumberLiteral', value: 10 },
          { type: 'NumberLiteral', value: 20 },
        ],
      });
    });

    it('parses multiple path commands', () => {
      const ast = parse('M 0 0 L 10 20 Z');
      expect(ast.body).toHaveLength(3);
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'M' });
      expect(ast.body[1]).toMatchObject({ type: 'PathCommand', command: 'L' });
      expect(ast.body[2]).toMatchObject({ type: 'PathCommand', command: 'Z' });
    });

    it('parses path commands with identifiers', () => {
      const ast = parse('M x y');
      expect(ast.body[0]).toMatchObject({
        type: 'PathCommand',
        command: 'M',
        args: [
          { type: 'Identifier', name: 'x' },
          { type: 'Identifier', name: 'y' },
        ],
      });
    });

    it('parses path commands with calc()', () => {
      const ast = parse('L calc(x + 10) calc(y * 2)');
      expect(ast.body[0]).toMatchObject({
        type: 'PathCommand',
        command: 'L',
      });
      expect(ast.body[0].type === 'PathCommand' && ast.body[0].args[0]).toMatchObject({
        type: 'CalcExpression',
      });
    });

    it('parses lowercase path commands', () => {
      const ast = parse('m 10 20 l 5 5');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'm' });
      expect(ast.body[1]).toMatchObject({ type: 'PathCommand', command: 'l' });
    });

    it('parses H (horizontal line)', () => {
      const ast = parse('H 50');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'H' });
    });

    it('parses V (vertical line)', () => {
      const ast = parse('V 50');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'V' });
    });

    it('parses C (cubic bezier)', () => {
      const ast = parse('C 10 20 30 40 50 60');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'C' });
      expect(ast.body[0].type === 'PathCommand' && ast.body[0].args).toHaveLength(6);
    });

    it('parses S (smooth cubic)', () => {
      const ast = parse('S 30 40 50 60');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'S' });
    });

    it('parses Q (quadratic bezier)', () => {
      const ast = parse('Q 25 50 50 0');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'Q' });
    });

    it('parses T (smooth quadratic)', () => {
      const ast = parse('T 50 0');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'T' });
    });

    it('parses A (arc)', () => {
      const ast = parse('A 25 25 0 1 1 50 50');
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'A' });
      expect(ast.body[0].type === 'PathCommand' && ast.body[0].args).toHaveLength(7);
    });
  });

  describe('comments', () => {
    it('parses code with line comments', () => {
      const ast = parse('// This is a comment\nM 10 20');
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]).toMatchObject({ type: 'PathCommand', command: 'M' });
    });

    it('parses code with inline comments', () => {
      const ast = parse('M 10 20 // move to 10,20\nL 30 40');
      expect(ast.body).toHaveLength(2);
    });

    it('parses code with multiple comments', () => {
      const ast = parse(`
        // First comment
        let x = 10; // inline
        // Another comment
        M x 0
      `);
      expect(ast.body).toHaveLength(2);
    });
  });

  describe('let declarations', () => {
    it('parses simple let declaration', () => {
      const ast = parse('let x = 10;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        name: 'x',
        value: { type: 'NumberLiteral', value: 10 },
      });
    });

    it('parses let with expression', () => {
      const ast = parse('let x = 10 + 5;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        name: 'x',
        value: {
          type: 'BinaryExpression',
          operator: '+',
        },
      });
    });
  });

  describe('angle units', () => {
    it('parses number with deg suffix', () => {
      const ast = parse('let x = 45deg;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        name: 'x',
        value: { type: 'NumberLiteral', value: 45, unit: 'deg' },
      });
    });

    it('parses number with rad suffix', () => {
      const ast = parse('let x = 1.5rad;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        name: 'x',
        value: { type: 'NumberLiteral', value: 1.5, unit: 'rad' },
      });
    });

    it('parses negative angle with deg suffix', () => {
      const ast = parse('let x = -45deg;');
      // Negative angles are parsed as UnaryExpression('-', NumberLiteral)
      // which is semantically equivalent
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        name: 'x',
        value: {
          type: 'UnaryExpression',
          operator: '-',
          argument: { type: 'NumberLiteral', value: 45, unit: 'deg' },
        },
      });
    });

    it('parses plain number without unit', () => {
      const ast = parse('let x = 45;');
      const decl = ast.body[0];
      expect(decl.type === 'LetDeclaration' && decl.value).toMatchObject({
        type: 'NumberLiteral',
        value: 45,
      });
      // unit should be undefined
      if (decl.type === 'LetDeclaration' && decl.value.type === 'NumberLiteral') {
        expect(decl.value.unit).toBeUndefined();
      }
    });

    it('parses angle in function call', () => {
      const ast = parse('M sin(90deg) 0');
      const cmd = ast.body[0];
      if (cmd.type === 'PathCommand') {
        expect(cmd.args[0]).toMatchObject({
          type: 'FunctionCall',
          name: 'sin',
          args: [{ type: 'NumberLiteral', value: 90, unit: 'deg' }],
        });
      }
    });
  });

  describe('expressions', () => {
    it('parses arithmetic with correct precedence', () => {
      const ast = parse('let x = 1 + 2 * 3;');
      const expr = ast.body[0];
      expect(expr.type === 'LetDeclaration' && expr.value).toMatchObject({
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'NumberLiteral', value: 1 },
        right: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'NumberLiteral', value: 2 },
          right: { type: 'NumberLiteral', value: 3 },
        },
      });
    });

    it('parses function calls', () => {
      const ast = parse('M sin(0) cos(0)');
      expect(ast.body[0].type === 'PathCommand' && ast.body[0].args[0]).toMatchObject({
        type: 'FunctionCall',
        name: 'sin',
        args: [{ type: 'NumberLiteral', value: 0 }],
      });
    });

    it('parses nested function calls', () => {
      const ast = parse('let x = max(min(a, b), c);');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        value: {
          type: 'FunctionCall',
          name: 'max',
        },
      });
    });

    it('parses comparison operators', () => {
      const ops = ['<', '>', '<=', '>=', '==', '!='];
      for (const op of ops) {
        const ast = parse(`let x = 1 ${op} 2;`);
        expect(ast.body[0]).toMatchObject({
          type: 'LetDeclaration',
          value: { type: 'BinaryExpression', operator: op },
        });
      }
    });

    it('parses logical and operator', () => {
      const ast = parse('let x = 1 && 2;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        value: { type: 'BinaryExpression', operator: '&&' },
      });
    });

    it('parses logical or operator', () => {
      const ast = parse('let x = 1 || 2;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        value: { type: 'BinaryExpression', operator: '||' },
      });
    });

    it('parses unary minus', () => {
      const ast = parse('let x = -5;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        value: { type: 'UnaryExpression', operator: '-' },
      });
    });

    it('parses unary not', () => {
      const ast = parse('let x = !1;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        value: { type: 'UnaryExpression', operator: '!' },
      });
    });

    it('parses division and modulo', () => {
      const ast = parse('let x = 10 / 3;');
      expect(ast.body[0]).toMatchObject({
        type: 'LetDeclaration',
        value: { type: 'BinaryExpression', operator: '/' },
      });

      const ast2 = parse('let x = 10 % 3;');
      expect(ast2.body[0]).toMatchObject({
        type: 'LetDeclaration',
        value: { type: 'BinaryExpression', operator: '%' },
      });
    });
  });

  describe('control flow', () => {
    it('parses for loop', () => {
      const ast = parse('for (i in 0..5) { M i 0 }');
      expect(ast.body[0]).toMatchObject({
        type: 'ForLoop',
        variable: 'i',
        start: { type: 'NumberLiteral', value: 0 },
        end: { type: 'NumberLiteral', value: 5 },
      });
    });

    it('parses if statement', () => {
      const ast = parse('if (x > 0) { M 10 10 }');
      expect(ast.body[0]).toMatchObject({
        type: 'IfStatement',
        condition: {
          type: 'BinaryExpression',
          operator: '>',
        },
      });
    });

    it('parses if-else statement', () => {
      const ast = parse('if (x > 0) { M 10 10 } else { M 0 0 }');
      const stmt = ast.body[0];
      expect(stmt.type === 'IfStatement' && stmt.alternate).not.toBeNull();
    });

    it('parses if with calc() in condition', () => {
      const ast = parse('if (calc(x % 2) == 0) { M 10 10 }');
      expect(ast.body[0]).toMatchObject({
        type: 'IfStatement',
        condition: {
          type: 'BinaryExpression',
          operator: '==',
          left: { type: 'CalcExpression' },
        },
      });
    });

    it('parses if with calc() on both sides', () => {
      const ast = parse('if (calc(a + b) > calc(c * 2)) { M 10 10 }');
      expect(ast.body[0]).toMatchObject({
        type: 'IfStatement',
        condition: {
          type: 'BinaryExpression',
          operator: '>',
          left: { type: 'CalcExpression' },
          right: { type: 'CalcExpression' },
        },
      });
    });
  });

  describe('function definitions', () => {
    it('parses function definition', () => {
      const ast = parse('fn square(x) { M x x }');
      expect(ast.body[0]).toMatchObject({
        type: 'FunctionDefinition',
        name: 'square',
        params: ['x'],
      });
    });

    it('parses function with multiple params', () => {
      const ast = parse('fn add(a, b, c) { M a b }');
      expect(ast.body[0]).toMatchObject({
        type: 'FunctionDefinition',
        params: ['a', 'b', 'c'],
      });
    });
  });

  describe('source locations', () => {
    it('captures location for for loops', () => {
      const ast = parse('for (i in 0..5) { M i 0 }');
      const forLoop = ast.body[0];
      expect(forLoop.type).toBe('ForLoop');
      if (forLoop.type === 'ForLoop') {
        expect(forLoop.loc).toBeDefined();
        expect(forLoop.loc?.line).toBe(1);
        expect(forLoop.loc?.column).toBe(1);
      }
    });

    it('captures location for for loops on later lines', () => {
      const ast = parse('M 0 0\nfor (i in 0..5) { M i 0 }');
      const forLoop = ast.body[1];
      expect(forLoop.type).toBe('ForLoop');
      if (forLoop.type === 'ForLoop') {
        expect(forLoop.loc?.line).toBe(2);
        expect(forLoop.loc?.column).toBe(1);
      }
    });

    it('captures location for path commands', () => {
      const ast = parse('M 10 20');
      const cmd = ast.body[0];
      expect(cmd.type).toBe('PathCommand');
      if (cmd.type === 'PathCommand') {
        expect(cmd.loc).toBeDefined();
        expect(cmd.loc?.line).toBe(1);
      }
    });

    it('captures location for function calls at statement level', () => {
      const ast = parse('circle(50, 50, 25)');
      const cmd = ast.body[0];
      expect(cmd.type).toBe('PathCommand');
      if (cmd.type === 'PathCommand') {
        expect(cmd.loc).toBeDefined();
        expect(cmd.loc?.line).toBe(1);
      }
    });

    it('captures location for function calls in path arguments', () => {
      const ast = parse('M sin(0) cos(0)');
      const cmd = ast.body[0];
      if (cmd.type === 'PathCommand') {
        const arg0 = cmd.args[0];
        if (arg0.type === 'FunctionCall') {
          expect(arg0.loc).toBeDefined();
          expect(arg0.loc?.line).toBe(1);
        }
      }
    });
  });

  describe('comment extraction', () => {
    it('extracts single line comment', () => {
      const comments = extractComments('// Hello world');
      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe('// Hello world');
      expect(comments[0].loc.line).toBe(1);
    });

    it('extracts multiple comments', () => {
      const input = `// First comment
M 0 0
// Second comment
L 10 20`;
      const comments = extractComments(input);
      expect(comments).toHaveLength(2);
      expect(comments[0].text).toBe('// First comment');
      expect(comments[0].loc.line).toBe(1);
      expect(comments[1].text).toBe('// Second comment');
      expect(comments[1].loc.line).toBe(3);
    });

    it('extracts inline comments', () => {
      const input = 'M 0 0 // move to origin';
      const comments = extractComments(input);
      expect(comments).toHaveLength(1);
      expect(comments[0].text).toBe('// move to origin');
      expect(comments[0].loc.column).toBe(7);
    });

    it('parseWithComments returns both AST and comments', () => {
      const input = `// Draw a line
M 0 0
L 10 20 // end point`;
      const result = parseWithComments(input);
      expect(result.program.body).toHaveLength(2);
      expect(result.comments).toHaveLength(2);
      expect(result.comments[0].text).toBe('// Draw a line');
      expect(result.comments[1].text).toBe('// end point');
    });
  });
});
