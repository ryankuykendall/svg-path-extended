import { describe, it, expect } from 'vitest';
import { compile } from '../src';

describe('Evaluator', () => {
  describe('path commands', () => {
    it('evaluates simple path commands', () => {
      expect(compile('M 10 20')).toBe('M 10 20');
    });

    it('evaluates multiple path commands', () => {
      expect(compile('M 0 0 L 10 20 Z')).toBe('M 0 0 L 10 20 Z');
    });

    it('evaluates negative numbers', () => {
      expect(compile('M -10 -20')).toBe('M -10 -20');
    });

    it('evaluates decimal numbers', () => {
      expect(compile('M 10.5 20.75')).toBe('M 10.5 20.75');
    });
  });

  describe('variables', () => {
    it('evaluates variable references', () => {
      expect(compile('let x = 10; M x 20')).toBe('M 10 20');
    });

    it('evaluates multiple variables', () => {
      expect(compile('let x = 10; let y = 20; M x y')).toBe('M 10 20');
    });

    it('evaluates variable with expression', () => {
      expect(compile('let x = 10 + 5; M x 0')).toBe('M 15 0');
    });
  });

  describe('calc expressions', () => {
    it('evaluates calc with addition', () => {
      expect(compile('M calc(10 + 5) 0')).toBe('M 15 0');
    });

    it('evaluates calc with multiplication', () => {
      expect(compile('M calc(10 * 2) 0')).toBe('M 20 0');
    });

    it('evaluates calc with variables', () => {
      expect(compile('let x = 10; M calc(x + 5) 0')).toBe('M 15 0');
    });

    it('respects operator precedence', () => {
      expect(compile('M calc(2 + 3 * 4) 0')).toBe('M 14 0');
    });

    it('evaluates nested parentheses', () => {
      expect(compile('M calc((2 + 3) * 4) 0')).toBe('M 20 0');
    });
  });

  describe('stdlib math functions', () => {
    it('evaluates sin', () => {
      expect(compile('M calc(sin(0)) 0')).toBe('M 0 0');
    });

    it('evaluates cos', () => {
      expect(compile('M calc(cos(0)) 0')).toBe('M 1 0');
    });

    it('evaluates abs', () => {
      expect(compile('M calc(abs(-10)) 0')).toBe('M 10 0');
    });

    it('evaluates sqrt', () => {
      expect(compile('M calc(sqrt(16)) 0')).toBe('M 4 0');
    });

    it('evaluates min/max', () => {
      expect(compile('M calc(min(10, 5)) calc(max(10, 5))')).toBe('M 5 10');
    });

    it('evaluates lerp', () => {
      expect(compile('M calc(lerp(0, 100, 0.5)) 0')).toBe('M 50 0');
    });

    it('evaluates clamp', () => {
      expect(compile('M calc(clamp(15, 0, 10)) 0')).toBe('M 10 0');
    });
  });

  describe('stdlib path functions', () => {
    it('evaluates circle', () => {
      const result = compile('circle(50, 50, 25)');
      expect(result).toContain('M 25 50');
      expect(result).toContain('A 25 25');
    });

    it('evaluates rect', () => {
      const result = compile('rect(0, 0, 100, 50)');
      expect(result).toBe('M 0 0 L 100 0 L 100 50 L 0 50 Z');
    });

    it('evaluates polygon', () => {
      const result = compile('polygon(50, 50, 25, 4)');
      expect(result).toContain('M');
      expect(result).toContain('L');
      expect(result).toContain('Z');
    });
  });

  describe('for loops', () => {
    it('evaluates simple for loop', () => {
      expect(compile('for (i in 0..3) { L i 0 }')).toBe('L 0 0 L 1 0 L 2 0');
    });

    it('evaluates for loop with calc', () => {
      expect(compile('for (i in 0..3) { L calc(i * 10) 0 }')).toBe('L 0 0 L 10 0 L 20 0');
    });

    it('evaluates nested for loops', () => {
      const result = compile('for (i in 0..2) { for (j in 0..2) { M i j } }');
      expect(result).toBe('M 0 0 M 0 1 M 1 0 M 1 1');
    });
  });

  describe('if statements', () => {
    it('evaluates if true', () => {
      expect(compile('let x = 1; if (x > 0) { M 10 10 }')).toBe('M 10 10');
    });

    it('evaluates if false', () => {
      expect(compile('let x = 0; if (x > 0) { M 10 10 }')).toBe('');
    });

    it('evaluates if-else', () => {
      expect(compile('let x = 0; if (x > 0) { M 10 10 } else { M 0 0 }')).toBe('M 0 0');
    });
  });

  describe('function definitions', () => {
    it('evaluates user function', () => {
      expect(compile('fn double(x) { M calc(x * 2) 0 } double(5)')).toBe('M 10 0');
    });

    it('evaluates function with multiple params', () => {
      expect(compile('fn add(a, b) { M calc(a + b) 0 } add(3, 7)')).toBe('M 10 0');
    });

    it('evaluates function called multiple times', () => {
      expect(compile('fn point(x) { M x 0 } point(1) point(2) point(3)')).toBe('M 1 0 M 2 0 M 3 0');
    });
  });
});
