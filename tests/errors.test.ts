import { describe, it, expect } from 'vitest';
import { compile, parse } from '../src';

describe('Parse errors', () => {
  describe('invalid syntax', () => {
    it('throws on unclosed parenthesis in calc', () => {
      expect(() => compile('M calc(10 + 5 0')).toThrow();
    });

    it('throws on unclosed brace in for loop', () => {
      expect(() => compile('for (i in 0..5) { M i 0')).toThrow();
    });

    it('throws on unclosed brace in if statement', () => {
      expect(() => compile('if (x > 0) { M 10 10')).toThrow();
    });

    it('throws on unclosed brace in function definition', () => {
      expect(() => compile('fn test() { M 0 0')).toThrow();
    });

    it('throws on missing semicolon in let declaration', () => {
      expect(() => compile('let x = 10 M x 0')).toThrow();
    });

    it('throws on invalid operator', () => {
      expect(() => compile('let x = 10 @ 5;')).toThrow();
    });

    it('throws on empty calc expression', () => {
      expect(() => compile('M calc() 0')).toThrow();
    });
  });

  describe('reserved words', () => {
    it('throws when using let as variable name', () => {
      expect(() => compile('let let = 10;')).toThrow();
    });

    it('throws when using for as variable name', () => {
      expect(() => compile('let for = 10;')).toThrow();
    });

    it('throws when using if as variable name', () => {
      expect(() => compile('let if = 10;')).toThrow();
    });

    it('throws when using fn as variable name', () => {
      expect(() => compile('let fn = 10;')).toThrow();
    });

    it('throws when using calc as variable name', () => {
      expect(() => compile('let calc = 10;')).toThrow();
    });
  });

  describe('error messages include location', () => {
    it('includes line number in error', () => {
      try {
        compile('let x = 10;\nlet y = @;');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toMatch(/line 2/i);
      }
    });

    it('includes column number in error', () => {
      try {
        compile('let x = @;');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toMatch(/column/i);
      }
    });
  });
});

describe('Runtime errors', () => {
  describe('undefined variables', () => {
    it('throws on undefined variable in path command', () => {
      expect(() => compile('M x 0')).toThrow(/[Uu]ndefined variable.*x/);
    });

    it('throws on undefined variable in calc expression', () => {
      expect(() => compile('M calc(x + 10) 0')).toThrow(/[Uu]ndefined variable.*x/);
    });

    it('throws on undefined variable in function call', () => {
      expect(() => compile('circle(x, 100, 50)')).toThrow(/[Uu]ndefined variable.*x/);
    });

    it('throws on undefined function', () => {
      expect(() => compile('unknownFunc(10, 20)')).toThrow(/[Uu]ndefined/);
    });
  });

  describe('type errors', () => {
    it('throws on non-numeric operand to binary operator', () => {
      expect(() => compile('let s = circle(50, 50, 25); let x = calc(s + 1);')).toThrow(/numeric/i);
    });

    it('throws on non-numeric operand to unary operator', () => {
      expect(() => compile('let s = circle(50, 50, 25); let x = calc(-s);')).toThrow(/numeric/i);
    });
  });

  describe('function argument errors', () => {
    it('throws on wrong argument count for user function (too few)', () => {
      expect(() => compile('fn add(a, b) { M calc(a + b) 0 } add(1)')).toThrow(/expects 2 arguments.*got 1/i);
    });

    it('throws on wrong argument count for user function (too many)', () => {
      expect(() => compile('fn single(a) { M a 0 } single(1, 2, 3)')).toThrow(/expects 1 argument.*got 3/i);
    });
  });

  describe('for loop errors', () => {
    it('throws on non-numeric range start', () => {
      expect(() => compile('let s = circle(50, 50, 25); for (i in s..10) { M i 0 }')).toThrow(/numeric/i);
    });

    it('throws on non-numeric range end', () => {
      expect(() => compile('let s = circle(50, 50, 25); for (i in 0..s) { M i 0 }')).toThrow(/numeric/i);
    });
  });
});

describe('Edge cases', () => {
  describe('empty constructs', () => {
    it('handles single-value range', () => {
      // 0..0 is inclusive: just 0 (1 iteration)
      expect(compile('for (i in 0..0) { M i 0 }')).toBe('M 0 0');
    });

    it('handles single-value range with same start and end', () => {
      // 5..5 is inclusive: just 5 (1 iteration)
      expect(compile('for (i in 5..5) { M i 0 }')).toBe('M 5 0');
    });

    it('handles empty if body when condition is false', () => {
      expect(compile('let x = 0; if (x > 0) { M 10 10 }')).toBe('');
    });
  });

  describe('numeric edge cases', () => {
    it('handles very large numbers', () => {
      const result = compile('M 999999999 999999999');
      expect(result).toBe('M 999999999 999999999');
    });

    it('handles very small decimals', () => {
      const result = compile('M 0.0001 0.0001');
      expect(result).toBe('M 0.0001 0.0001');
    });

    it('handles negative zero', () => {
      const result = compile('M calc(0 * -1) 0');
      expect(result).toBe('M 0 0');
    });
  });

  describe('division and modulo', () => {
    it('handles division', () => {
      expect(compile('M calc(10 / 2) 0')).toBe('M 5 0');
    });

    it('handles modulo', () => {
      expect(compile('M calc(10 % 3) 0')).toBe('M 1 0');
    });

    it('handles division by zero (returns Infinity)', () => {
      const result = compile('M calc(10 / 0) 0');
      expect(result).toContain('Infinity');
    });

    it('handles modulo by zero (returns NaN)', () => {
      const result = compile('M calc(10 % 0) 0');
      expect(result).toContain('NaN');
    });
  });

  describe('angle unit mismatches', () => {
    it('throws when adding deg to plain number', () => {
      expect(() => compile('M calc(90deg + 5) 0')).toThrow(/Cannot add.*angle unit/);
    });

    it('throws when subtracting plain number from deg', () => {
      expect(() => compile('M calc(90deg - 5) 0')).toThrow(/Cannot subtract.*angle unit/);
    });

    it('throws when adding plain number to deg (reversed order)', () => {
      expect(() => compile('M calc(5 + 90deg) 0')).toThrow(/Cannot add.*angle unit/);
    });

    it('throws when adding deg to negative plain number', () => {
      expect(() => compile('M calc(90deg + -5) 0')).toThrow(/Cannot add.*angle unit/);
    });

    it('allows adding deg to deg', () => {
      const result = compile('M calc(90deg + 5deg) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows adding rad to rad', () => {
      const result = compile('M calc(1rad + 0.5rad) 0');
      expect(result).toBe('M 1.5 0');
    });

    it('allows multiplying deg by plain number', () => {
      const result = compile('M calc(45deg * 2) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows dividing deg by plain number', () => {
      const result = compile('M calc(90deg / 2) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows adding negative deg to deg', () => {
      const result = compile('M calc(-45deg + 90deg) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows function result plus plain number (no unit tracking through functions)', () => {
      // sin(90deg) returns 1 (dimensionless), so adding 0.5 is valid
      const result = compile('M calc(sin(90deg) + 0.5) 0');
      expect(result).toBe('M 1.5 0');
    });
  });
});
