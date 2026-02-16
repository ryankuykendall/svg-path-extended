import { describe, it, expect } from 'vitest';
import { parse, compile } from '../src';
import { compilePath } from './helpers';

describe('Parse errors', () => {
  describe('invalid syntax', () => {
    it('throws on unclosed parenthesis in calc', () => {
      expect(() => compilePath('M calc(10 + 5 0')).toThrow();
    });

    it('throws on unclosed brace in for loop', () => {
      expect(() => compilePath('for (i in 0..5) { M i 0')).toThrow();
    });

    it('throws on unclosed brace in if statement', () => {
      expect(() => compilePath('if (x > 0) { M 10 10')).toThrow();
    });

    it('throws on unclosed brace in function definition', () => {
      expect(() => compilePath('fn test() { M 0 0')).toThrow();
    });

    it('throws on missing semicolon in let declaration', () => {
      expect(() => compilePath('let x = 10 M x 0')).toThrow();
    });

    it('throws on invalid operator', () => {
      expect(() => compilePath('let x = 10 @ 5;')).toThrow();
    });

    it('throws on empty calc expression', () => {
      expect(() => compilePath('M calc() 0')).toThrow();
    });
  });

  describe('reserved words', () => {
    it('throws when using let as variable name', () => {
      expect(() => compilePath('let let = 10;')).toThrow();
    });

    it('throws when using for as variable name', () => {
      expect(() => compilePath('let for = 10;')).toThrow();
    });

    it('throws when using if as variable name', () => {
      expect(() => compilePath('let if = 10;')).toThrow();
    });

    it('throws when using fn as variable name', () => {
      expect(() => compilePath('let fn = 10;')).toThrow();
    });

    it('throws when using calc as variable name', () => {
      expect(() => compilePath('let calc = 10;')).toThrow();
    });
  });

  describe('error messages include location', () => {
    it('includes line number in error', () => {
      try {
        compilePath('let x = 10;\nlet y = @;');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toMatch(/line 2/i);
      }
    });

    it('includes column number in error', () => {
      try {
        compilePath('let x = @;');
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
      expect(() => compilePath('M x 0')).toThrow(/[Uu]ndefined variable.*x/);
    });

    it('throws on undefined variable in calc expression', () => {
      expect(() => compilePath('M calc(x + 10) 0')).toThrow(/[Uu]ndefined variable.*x/);
    });

    it('throws on undefined variable in function call', () => {
      expect(() => compilePath('circle(x, 100, 50)')).toThrow(/[Uu]ndefined variable.*x/);
    });

    it('throws on undefined function', () => {
      expect(() => compilePath('unknownFunc(10, 20)')).toThrow(/[Uu]ndefined/);
    });
  });

  describe('type errors', () => {
    it('throws on non-numeric operand to binary operator', () => {
      expect(() => compilePath('let s = circle(50, 50, 25); let x = calc(s + 1);')).toThrow(/numeric/i);
    });

    it('throws on non-numeric operand to unary operator', () => {
      expect(() => compilePath('let s = circle(50, 50, 25); let x = calc(-s);')).toThrow(/numeric/i);
    });
  });

  describe('function argument errors', () => {
    it('throws on wrong argument count for user function (too few)', () => {
      expect(() => compilePath('fn add(a, b) { M calc(a + b) 0 } add(1)')).toThrow(/expects 2 arguments.*got 1/i);
    });

    it('throws on wrong argument count for user function (too many)', () => {
      expect(() => compilePath('fn single(a) { M a 0 } single(1, 2, 3)')).toThrow(/expects 1 argument.*got 3/i);
    });
  });

  describe('for loop errors', () => {
    it('throws on non-numeric range start', () => {
      expect(() => compilePath('let s = circle(50, 50, 25); for (i in s..10) { M i 0 }')).toThrow(/numeric/i);
    });

    it('throws on non-numeric range end', () => {
      expect(() => compilePath('let s = circle(50, 50, 25); for (i in 0..s) { M i 0 }')).toThrow(/numeric/i);
    });
  });
});

describe('Null errors', () => {
  it('null in arithmetic throws descriptive error', () => {
    expect(() => compilePath('let x = null; let y = calc(x + 1);')).toThrow(/null.*arithmetic/i);
  });

  it('null in path argument throws descriptive error', () => {
    expect(() => compilePath('let x = null; M x 0')).toThrow(/null.*path argument/i);
  });

  it('unary operator on null throws', () => {
    expect(() => compilePath('let x = null; let y = calc(-x);')).toThrow(/null/i);
  });
});

describe('Array errors', () => {
  it('index out of bounds throws', () => {
    expect(() => compilePath('let list = [1, 2]; M list[5] 0')).toThrow(/out of bounds/i);
  });

  it('index on non-array throws', () => {
    expect(() => compilePath('let x = 5; M x[0] 0')).toThrow(/array/i);
  });

  it('non-numeric index throws', () => {
    expect(() => compilePath('let list = [1, 2]; let k = "foo"; M list[k] 0')).toThrow(/number/i);
  });

  it('unknown method throws', () => {
    expect(() => compilePath('let list = [1, 2]; let x = list.foo();')).toThrow(/unknown.*method/i);
  });

  it('for-each over non-array throws', () => {
    expect(() => compilePath('let x = 5; for (i in x) { M i 0 }')).toThrow(/array/i);
  });

  it('push with wrong arg count throws', () => {
    expect(() => compilePath('let list = []; list.push(1, 2);')).toThrow(/1 argument/i);
  });

  it('pop with wrong arg count throws', () => {
    expect(() => compilePath('let list = [1]; let x = list.pop(1);')).toThrow(/0 arguments/i);
  });

  it('method on non-array throws', () => {
    expect(() => compilePath('let x = 5; x.push(1);')).toThrow(/non-array/i);
  });
});

describe('Edge cases', () => {
  describe('empty constructs', () => {
    it('handles single-value range', () => {
      // 0..0 is inclusive: just 0 (1 iteration)
      expect(compilePath('for (i in 0..0) { M i 0 }')).toBe('M 0 0');
    });

    it('handles single-value range with same start and end', () => {
      // 5..5 is inclusive: just 5 (1 iteration)
      expect(compilePath('for (i in 5..5) { M i 0 }')).toBe('M 5 0');
    });

    it('handles empty if body when condition is false', () => {
      expect(compilePath('let x = 0; if (x > 0) { M 10 10 }')).toBe('');
    });
  });

  describe('numeric edge cases', () => {
    it('handles very large numbers', () => {
      const result = compilePath('M 999999999 999999999');
      expect(result).toBe('M 999999999 999999999');
    });

    it('handles very small decimals', () => {
      const result = compilePath('M 0.0001 0.0001');
      expect(result).toBe('M 0.0001 0.0001');
    });

    it('handles negative zero', () => {
      const result = compilePath('M calc(0 * -1) 0');
      expect(result).toBe('M 0 0');
    });
  });

  describe('division and modulo', () => {
    it('handles division', () => {
      expect(compilePath('M calc(10 / 2) 0')).toBe('M 5 0');
    });

    it('handles modulo', () => {
      expect(compilePath('M calc(10 % 3) 0')).toBe('M 1 0');
    });

    it('handles division by zero (returns Infinity)', () => {
      const result = compilePath('M calc(10 / 0) 0');
      expect(result).toContain('Infinity');
    });

    it('handles modulo by zero (returns NaN)', () => {
      const result = compilePath('M calc(10 % 0) 0');
      expect(result).toContain('NaN');
    });
  });

  describe('angle unit mismatches', () => {
    it('throws when adding deg to plain number', () => {
      expect(() => compilePath('M calc(90deg + 5) 0')).toThrow(/Cannot add.*angle unit/);
    });

    it('throws when subtracting plain number from deg', () => {
      expect(() => compilePath('M calc(90deg - 5) 0')).toThrow(/Cannot subtract.*angle unit/);
    });

    it('throws when adding plain number to deg (reversed order)', () => {
      expect(() => compilePath('M calc(5 + 90deg) 0')).toThrow(/Cannot add.*angle unit/);
    });

    it('throws when adding deg to negative plain number', () => {
      expect(() => compilePath('M calc(90deg + -5) 0')).toThrow(/Cannot add.*angle unit/);
    });

    it('allows adding deg to deg', () => {
      const result = compilePath('M calc(90deg + 5deg) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows adding rad to rad', () => {
      const result = compilePath('M calc(1rad + 0.5rad) 0');
      expect(result).toBe('M 1.5 0');
    });

    it('allows multiplying deg by plain number', () => {
      const result = compilePath('M calc(45deg * 2) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows dividing deg by plain number', () => {
      const result = compilePath('M calc(90deg / 2) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows adding negative deg to deg', () => {
      const result = compilePath('M calc(-45deg + 90deg) 0');
      expect(result).toMatch(/^M [\d.]+ 0$/);
    });

    it('allows function result plus plain number (no unit tracking through functions)', () => {
      // sin(90deg) returns 1 (dimensionless), so adding 0.5 is valid
      const result = compilePath('M calc(sin(90deg) + 0.5) 0');
      expect(result).toBe('M 1.5 0');
    });
  });

  describe('style block errors', () => {
    it('throws when using << with non-style-block left operand', () => {
      expect(() => compile('let x = 5 << \${ stroke: red; };')).toThrow();
    });

    it('throws when using << with non-style-block right operand', () => {
      expect(() => compile('let s = \${ stroke: red; }; let x = s << 5;')).toThrow();
    });

    it('throws when layer definition style is not a style block', () => {
      expect(() => compile(`
        let x = 5;
        define PathLayer('test') x
        layer('test').apply { M 0 0 }
      `)).toThrow();
    });

    it('throws when accessing non-existent property on style block', () => {
      expect(() => compile(`
        let s = \${ stroke: red; };
        let x = s.nonExistent;
      `)).toThrow();
    });
  });
});
