import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';

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
});
