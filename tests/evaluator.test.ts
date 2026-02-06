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

    it('evaluates H (horizontal line)', () => {
      expect(compile('H 50')).toBe('H 50');
    });

    it('evaluates V (vertical line)', () => {
      expect(compile('V 50')).toBe('V 50');
    });

    it('evaluates C (cubic bezier)', () => {
      expect(compile('C 10 20 30 40 50 60')).toBe('C 10 20 30 40 50 60');
    });

    it('evaluates S (smooth cubic)', () => {
      expect(compile('S 30 40 50 60')).toBe('S 30 40 50 60');
    });

    it('evaluates Q (quadratic bezier)', () => {
      expect(compile('Q 25 50 50 0')).toBe('Q 25 50 50 0');
    });

    it('evaluates T (smooth quadratic)', () => {
      expect(compile('T 50 0')).toBe('T 50 0');
    });

    it('evaluates A (arc)', () => {
      expect(compile('A 25 25 0 1 1 50 50')).toBe('A 25 25 0 1 1 50 50');
    });

    it('evaluates lowercase relative commands', () => {
      expect(compile('m 10 20 l 30 40 h 10 v 10')).toBe('m 10 20 l 30 40 h 10 v 10');
    });
  });

  describe('comments', () => {
    it('ignores line comments', () => {
      expect(compile('// This is a comment\nM 10 20')).toBe('M 10 20');
    });

    it('ignores inline comments', () => {
      expect(compile('M 10 20 // move to point\nL 30 40')).toBe('M 10 20 L 30 40');
    });

    it('handles multiple comments', () => {
      expect(compile(`
        // First comment
        let x = 10; // define x
        // Another comment
        M x 0
      `)).toBe('M 10 0');
    });
  });

  describe('operators', () => {
    describe('comparison operators', () => {
      it('evaluates less than', () => {
        expect(compile('if (1 < 2) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (2 < 1) { M 1 0 }')).toBe('');
      });

      it('evaluates greater than', () => {
        expect(compile('if (2 > 1) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (1 > 2) { M 1 0 }')).toBe('');
      });

      it('evaluates less than or equal', () => {
        expect(compile('if (1 <= 2) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (2 <= 2) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (3 <= 2) { M 1 0 }')).toBe('');
      });

      it('evaluates greater than or equal', () => {
        expect(compile('if (2 >= 1) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (2 >= 2) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (1 >= 2) { M 1 0 }')).toBe('');
      });

      it('evaluates equal', () => {
        expect(compile('if (2 == 2) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (1 == 2) { M 1 0 }')).toBe('');
      });

      it('evaluates not equal', () => {
        expect(compile('if (1 != 2) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (2 != 2) { M 1 0 }')).toBe('');
      });
    });

    describe('logical operators', () => {
      it('evaluates logical and', () => {
        expect(compile('if (1 && 1) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (1 && 0) { M 1 0 }')).toBe('');
        expect(compile('if (0 && 1) { M 1 0 }')).toBe('');
      });

      it('evaluates logical or', () => {
        expect(compile('if (1 || 0) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (0 || 1) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (0 || 0) { M 1 0 }')).toBe('');
      });

      it('evaluates compound logical expressions', () => {
        expect(compile('if ((1 > 0) && (2 > 1)) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if ((1 > 2) || (2 > 1)) { M 1 0 }')).toBe('M 1 0');
      });
    });

    describe('unary operators', () => {
      it('evaluates unary minus', () => {
        expect(compile('let x = -5; M x 0')).toBe('M -5 0');
        expect(compile('M calc(-10) 0')).toBe('M -10 0');
      });

      it('evaluates unary not', () => {
        expect(compile('if (!0) { M 1 0 }')).toBe('M 1 0');
        expect(compile('if (!1) { M 1 0 }')).toBe('');
      });
    });

    describe('arithmetic operators', () => {
      it('evaluates subtraction', () => {
        expect(compile('M calc(10 - 3) 0')).toBe('M 7 0');
      });

      it('evaluates division', () => {
        expect(compile('M calc(10 / 2) 0')).toBe('M 5 0');
      });

      it('evaluates modulo', () => {
        expect(compile('M calc(10 % 3) 0')).toBe('M 1 0');
      });

      it('evaluates complex expressions', () => {
        expect(compile('M calc(2 + 3 * 4 - 6 / 2) 0')).toBe('M 11 0');
      });
    });
  });

  describe('variable scoping', () => {
    it('shadows variables in for loop', () => {
      // 0..3 is inclusive: 0, 1, 2, 3
      const result = compile('let i = 100; for (i in 0..3) { M i 0 } M i 0');
      expect(result).toBe('M 0 0 M 1 0 M 2 0 M 3 0 M 100 0');
    });

    it('shadows variables in function scope', () => {
      const result = compile('let x = 100; fn f(x) { M x 0 } f(5) M x 0');
      expect(result).toBe('M 5 0 M 100 0');
    });

    it('inner scope does not affect outer scope', () => {
      const result = compile('let x = 10; if (1) { let x = 20; M x 0 } M x 0');
      expect(result).toBe('M 20 0 M 10 0');
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
    describe('trigonometric', () => {
      it('evaluates sin', () => {
        expect(compile('M calc(sin(0)) 0')).toBe('M 0 0');
      });

      it('evaluates cos', () => {
        expect(compile('M calc(cos(0)) 0')).toBe('M 1 0');
      });

      it('evaluates tan', () => {
        expect(compile('M calc(tan(0)) 0')).toBe('M 0 0');
      });

      it('evaluates asin', () => {
        expect(compile('M calc(asin(0)) 0')).toBe('M 0 0');
      });

      it('evaluates acos', () => {
        const result = compile('M calc(acos(1)) 0');
        expect(result).toBe('M 0 0');
      });

      it('evaluates atan', () => {
        expect(compile('M calc(atan(0)) 0')).toBe('M 0 0');
      });

      it('evaluates atan2', () => {
        expect(compile('M calc(atan2(0, 1)) 0')).toBe('M 0 0');
      });
    });

    describe('hyperbolic', () => {
      it('evaluates sinh', () => {
        expect(compile('M calc(sinh(0)) 0')).toBe('M 0 0');
      });

      it('evaluates cosh', () => {
        expect(compile('M calc(cosh(0)) 0')).toBe('M 1 0');
      });

      it('evaluates tanh', () => {
        expect(compile('M calc(tanh(0)) 0')).toBe('M 0 0');
      });
    });

    describe('exponential and logarithmic', () => {
      it('evaluates exp', () => {
        expect(compile('M calc(exp(0)) 0')).toBe('M 1 0');
      });

      it('evaluates log (natural)', () => {
        expect(compile('M calc(log(1)) 0')).toBe('M 0 0');
      });

      it('evaluates log10', () => {
        expect(compile('M calc(log10(10)) 0')).toBe('M 1 0');
      });

      it('evaluates log2', () => {
        expect(compile('M calc(log2(8)) 0')).toBe('M 3 0');
      });

      it('evaluates pow', () => {
        expect(compile('M calc(pow(2, 3)) 0')).toBe('M 8 0');
      });

      it('evaluates sqrt', () => {
        expect(compile('M calc(sqrt(16)) 0')).toBe('M 4 0');
      });

      it('evaluates cbrt', () => {
        expect(compile('M calc(cbrt(27)) 0')).toBe('M 3 0');
      });
    });

    describe('rounding', () => {
      it('evaluates floor', () => {
        expect(compile('M calc(floor(3.7)) 0')).toBe('M 3 0');
      });

      it('evaluates ceil', () => {
        expect(compile('M calc(ceil(3.2)) 0')).toBe('M 4 0');
      });

      it('evaluates round', () => {
        expect(compile('M calc(round(3.5)) 0')).toBe('M 4 0');
        expect(compile('M calc(round(3.4)) 0')).toBe('M 3 0');
      });

      it('evaluates trunc', () => {
        expect(compile('M calc(trunc(3.9)) 0')).toBe('M 3 0');
        expect(compile('M calc(trunc(-3.9)) 0')).toBe('M -3 0');
      });
    });

    describe('utility', () => {
      it('evaluates abs', () => {
        expect(compile('M calc(abs(-10)) 0')).toBe('M 10 0');
      });

      it('evaluates sign', () => {
        expect(compile('M calc(sign(-10)) calc(sign(10))')).toBe('M -1 1');
        expect(compile('M calc(sign(0)) 0')).toBe('M 0 0');
      });

      it('evaluates min/max', () => {
        expect(compile('M calc(min(10, 5)) calc(max(10, 5))')).toBe('M 5 10');
      });
    });

    describe('constants', () => {
      it('evaluates PI', () => {
        const result = compile('M calc(PI()) 0');
        expect(result).toContain('3.14159');
      });

      it('evaluates E', () => {
        const result = compile('M calc(E()) 0');
        expect(result).toContain('2.718');
      });

      it('evaluates TAU', () => {
        const result = compile('M calc(TAU()) 0');
        expect(result).toContain('6.28318');
      });
    });

    describe('interpolation and clamping', () => {
      it('evaluates lerp', () => {
        expect(compile('M calc(lerp(0, 100, 0.5)) 0')).toBe('M 50 0');
        expect(compile('M calc(lerp(0, 100, 0)) 0')).toBe('M 0 0');
        expect(compile('M calc(lerp(0, 100, 1)) 0')).toBe('M 100 0');
      });

      it('evaluates clamp', () => {
        expect(compile('M calc(clamp(15, 0, 10)) 0')).toBe('M 10 0');
        expect(compile('M calc(clamp(-5, 0, 10)) 0')).toBe('M 0 0');
        expect(compile('M calc(clamp(5, 0, 10)) 0')).toBe('M 5 0');
      });

      it('evaluates map', () => {
        expect(compile('M calc(map(5, 0, 10, 0, 100)) 0')).toBe('M 50 0');
        expect(compile('M calc(map(0, 0, 10, 0, 100)) 0')).toBe('M 0 0');
        expect(compile('M calc(map(10, 0, 10, 0, 100)) 0')).toBe('M 100 0');
      });
    });

    describe('angle conversions', () => {
      it('evaluates deg (radians to degrees)', () => {
        const result = compile('M calc(deg(PI())) 0');
        expect(result).toBe('M 180 0');
      });

      it('evaluates rad (degrees to radians)', () => {
        const result = compile('M calc(rad(180)) 0');
        expect(result).toContain('3.14159');
      });
    });

    describe('random', () => {
      it('evaluates random (returns number between 0 and 1)', () => {
        const result = compile('M calc(random()) 0');
        const match = result.match(/M ([\d.]+) 0/);
        expect(match).not.toBeNull();
        const value = parseFloat(match![1]);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      });

      it('evaluates randomRange (returns number in range)', () => {
        const result = compile('M calc(randomRange(10, 20)) 0');
        const match = result.match(/M ([\d.]+) 0/);
        expect(match).not.toBeNull();
        const value = parseFloat(match![1]);
        expect(value).toBeGreaterThanOrEqual(10);
        expect(value).toBeLessThan(20);
      });
    });
  });

  describe('stdlib path functions', () => {
    it('evaluates circle', () => {
      const result = compile('circle(50, 50, 25)');
      expect(result).toContain('M 25 50');
      expect(result).toContain('A 25 25');
    });

    it('evaluates arc', () => {
      const result = compile('arc(10, 10, 0, 1, 1, 50, 50)');
      expect(result).toBe('A 10 10 0 1 1 50 50');
    });

    it('evaluates rect', () => {
      const result = compile('rect(0, 0, 100, 50)');
      expect(result).toBe('M 0 0 L 100 0 L 100 50 L 0 50 Z');
    });

    it('evaluates roundRect', () => {
      const result = compile('roundRect(10, 10, 80, 60, 10)');
      expect(result).toContain('M 20 10'); // Start with radius offset
      expect(result).toContain('Q'); // Quadratic curves for corners
      expect(result).toContain('Z');
    });

    it('evaluates roundRect with large radius (clamped)', () => {
      // radius is clamped to half the smaller dimension
      const result = compile('roundRect(0, 0, 40, 20, 50)');
      expect(result).toContain('Q');
      expect(result).toContain('Z');
    });

    it('evaluates polygon', () => {
      const result = compile('polygon(50, 50, 25, 4)');
      expect(result).toContain('M');
      expect(result).toContain('L');
      expect(result).toContain('Z');
    });

    it('evaluates polygon with different side counts', () => {
      // Triangle
      const triangle = compile('polygon(50, 50, 25, 3)');
      expect(triangle.match(/L/g)?.length).toBe(2);

      // Hexagon
      const hexagon = compile('polygon(50, 50, 25, 6)');
      expect(hexagon.match(/L/g)?.length).toBe(5);
    });

    it('evaluates star', () => {
      const result = compile('star(50, 50, 30, 15, 5)');
      expect(result).toContain('M');
      expect(result).toContain('L');
      expect(result).toContain('Z');
      // 5-pointed star has 10 L commands (alternating outer/inner points)
      expect(result.match(/L/g)?.length).toBe(9);
    });

    it('evaluates line', () => {
      const result = compile('line(10, 20, 30, 40)');
      expect(result).toBe('M 10 20 L 30 40');
    });

    it('evaluates quadratic', () => {
      const result = compile('quadratic(0, 0, 50, 100, 100, 0)');
      expect(result).toBe('M 0 0 Q 50 100 100 0');
    });

    it('evaluates cubic', () => {
      const result = compile('cubic(0, 0, 25, 100, 75, 100, 100, 0)');
      expect(result).toBe('M 0 0 C 25 100 75 100 100 0');
    });

    it('evaluates moveTo', () => {
      const result = compile('moveTo(50, 100)');
      expect(result).toBe('M 50 100');
    });

    it('evaluates lineTo', () => {
      const result = compile('lineTo(50, 100)');
      expect(result).toBe('L 50 100');
    });

    it('evaluates closePath', () => {
      const result = compile('closePath()');
      expect(result).toBe('Z');
    });

    it('combines multiple path functions', () => {
      const result = compile('moveTo(0, 0) lineTo(100, 0) lineTo(100, 100) closePath()');
      expect(result).toBe('M 0 0 L 100 0 L 100 100 Z');
    });
  });

  describe('for loops', () => {
    it('evaluates simple for loop', () => {
      // 0..3 is inclusive: 0, 1, 2, 3
      expect(compile('for (i in 0..3) { L i 0 }')).toBe('L 0 0 L 1 0 L 2 0 L 3 0');
    });

    it('evaluates for loop with calc', () => {
      // 0..3 is inclusive: 0, 1, 2, 3
      expect(compile('for (i in 0..3) { L calc(i * 10) 0 }')).toBe('L 0 0 L 10 0 L 20 0 L 30 0');
    });

    it('evaluates nested for loops', () => {
      // 0..2 is inclusive: 0, 1, 2 (3 values each = 9 total)
      const result = compile('for (i in 0..2) { for (j in 0..2) { M i j } }');
      expect(result).toBe('M 0 0 M 0 1 M 0 2 M 1 0 M 1 1 M 1 2 M 2 0 M 2 1 M 2 2');
    });

    it('throws error for infinite loop range (Infinity)', () => {
      expect(() => compile('let n = calc(1/0); for (i in 0..n) { M i 0 }')).toThrow('finite');
    });

    it('throws error for NaN loop range', () => {
      expect(() => compile('let n = calc(0/0); for (i in 0..n) { M i 0 }')).toThrow('finite');
    });

    it('throws error for excessive iterations', () => {
      expect(() => compile('for (i in 0..20000) { M i 0 }')).toThrow('max');
    });

    it('allows reasonable iteration count', () => {
      // 0..100 is inclusive: 101 iterations (0 through 100)
      const result = compile('for (i in 0..100) { M i 0 }');
      expect(result).toContain('M 0 0');
      expect(result).toContain('M 99 0');
      expect(result).toContain('M 100 0');
    });

    it('evaluates descending for loop', () => {
      // 3..0 is inclusive descending: 3, 2, 1, 0
      expect(compile('for (i in 3..0) { M i 0 }')).toBe('M 3 0 M 2 0 M 1 0 M 0 0');
    });

    it('evaluates descending for loop with larger range', () => {
      // 10..8 is inclusive descending: 10, 9, 8
      expect(compile('for (i in 10..8) { M i 0 }')).toBe('M 10 0 M 9 0 M 8 0');
    });

    it('evaluates descending for loop with negative values', () => {
      // 2..-2 is inclusive descending: 2, 1, 0, -1, -2
      expect(compile('for (i in 2..-2) { M i 0 }')).toBe('M 2 0 M 1 0 M 0 0 M -1 0 M -2 0');
    });

    it('evaluates ascending for loop with negative values', () => {
      // -2..2 is inclusive ascending: -2, -1, 0, 1, 2
      expect(compile('for (i in -2..2) { M i 0 }')).toBe('M -2 0 M -1 0 M 0 0 M 1 0 M 2 0');
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

    it('evaluates if with calc() in condition', () => {
      expect(compile('let x = 4; if (calc(x % 2) == 0) { M 1 0 } else { M 0 0 }')).toBe('M 1 0');
      expect(compile('let x = 3; if (calc(x % 2) == 0) { M 1 0 } else { M 0 0 }')).toBe('M 0 0');
    });

    it('evaluates if with calc() on both sides', () => {
      expect(compile('let a = 5; let b = 3; if (calc(a + b) > calc(b * 2)) { M 1 0 }')).toBe('M 1 0');
    });

    it('evaluates complex calc() in loop condition', () => {
      // 0..4 is inclusive: 0, 1, 2, 3, 4. Even values: 0, 2, 4
      const result = compile(`
        for (i in 0..4) {
          if (calc(i % 2) == 0) { M i 0 }
        }
      `);
      expect(result).toBe('M 0 0 M 2 0 M 4 0');
    });

    it('evaluates calc() in if after path command', () => {
      const result = compile(`
        for (i in 1..5) {
          v 20
          if (calc(i % 2) == 0) {
            h -10
          } else {
            h 10
          }
        }
      `);
      expect(result).toContain('v 20');
      expect(result).toContain('h');
    });

    it('evaluates calc() in if after M command', () => {
      const result = compile(`
        M 0 0
        if (calc(5 % 2) == 1) { L 10 10 }
      `);
      expect(result).toBe('M 0 0 L 10 10');
    });

    it('evaluates calc() in if after L command', () => {
      const result = compile(`
        M 0 0
        L 10 10
        if (calc(4 / 2) == 2) { L 20 20 }
      `);
      expect(result).toBe('M 0 0 L 10 10 L 20 20');
    });

    it('evaluates fingerJoint pattern', () => {
      const result = compile(`
        fn fingerJoint(thickness, height, fingers) {
          let fingerHeight = calc(height / fingers);
          for (i in 1..fingers) {
            v fingerHeight
            if (calc(i % 2) == 0) {
              h calc(thickness * -1)
            } else {
              h thickness
            }
          }
        }
        M 0 0
        fingerJoint(10, 100, 5)
      `);
      expect(result).toContain('M 0 0');
      expect(result).toContain('v 20');
      expect(result).toContain('h 10');
      expect(result).toContain('h -10');
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

  describe('return statements', () => {
    it('returns a computed value from a function', () => {
      const result = compile(`
        fn double(x) {
          return calc(x * 2);
        }
        M double(5) 0
      `);
      expect(result).toBe('M 10 0');
    });

    it('returns a value usable in expressions', () => {
      const result = compile(`
        fn mpi(radians) {
          return calc(PI() * radians);
        }
        M mpi(0.5) 0
      `);
      // PI() * 0.5 ≈ 1.5707963...
      expect(result).toMatch(/^M 1\.570796\d* 0$/);
    });

    it('early return stops execution of remaining statements', () => {
      const result = compile(`
        fn test() {
          return 42;
          M 999 999
        }
        M test() 0
      `);
      expect(result).toBe('M 42 0');
    });

    it('functions without explicit return use implicit path accumulation', () => {
      const result = compile(`
        fn square() {
          M 0 0
          L 10 0
          L 10 10
          L 0 10
          Z
        }
        square()
      `);
      expect(result).toBe('M 0 0 L 10 0 L 10 10 L 0 10 Z');
    });

    it('return in path context works correctly', () => {
      const result = compile(`
        fn halfPi() {
          return calc(PI() / 2);
        }
        M halfPi() 0
      `);
      // PI()/2 ≈ 1.5707963...
      expect(result).toMatch(/^M 1\.570796\d* 0$/);
    });

    it('return value can be assigned to a variable', () => {
      const result = compile(`
        fn triple(x) {
          return calc(x * 3);
        }
        let y = triple(10);
        M y 0
      `);
      expect(result).toBe('M 30 0');
    });

    it('return value can be used in calc expression', () => {
      const result = compile(`
        fn add(a, b) {
          return calc(a + b);
        }
        M calc(add(3, 4) * 2) 0
      `);
      expect(result).toBe('M 14 0');
    });

    it('nested function calls with return work correctly', () => {
      const result = compile(`
        fn square(x) {
          return calc(x * x);
        }
        fn sumOfSquares(a, b) {
          return calc(square(a) + square(b));
        }
        M sumOfSquares(3, 4) 0
      `);
      // 3*3 + 4*4 = 9 + 16 = 25
      expect(result).toBe('M 25 0');
    });

    it('return inside conditional works correctly', () => {
      const result = compile(`
        fn absValue(x) {
          if (x < 0) {
            return calc(x * -1);
          }
          return x;
        }
        M absValue(-5) absValue(3)
      `);
      expect(result).toBe('M 5 3');
    });

    it('return inside loop exits function immediately', () => {
      const result = compile(`
        fn findFirst() {
          for (i in 1..10) {
            if (i == 3) {
              return i;
            }
          }
          return 0;
        }
        M findFirst() 0
      `);
      expect(result).toBe('M 3 0');
    });
  });

  describe('toFixed option', () => {
    it('rounds decimals to specified precision', () => {
      expect(compile('M calc(10/3) calc(20/7)', { toFixed: 2 })).toBe('M 3.33 2.86');
    });

    it('rounds to 0 decimal places', () => {
      expect(compile('M calc(10/3) calc(20/7)', { toFixed: 0 })).toBe('M 3 3');
    });

    it('rounds to 4 decimal places', () => {
      expect(compile('M calc(10/3) 0', { toFixed: 4 })).toBe('M 3.3333 0');
    });

    it('does not modify integers', () => {
      expect(compile('M 100 200', { toFixed: 2 })).toBe('M 100 200');
    });

    it('preserves arc flags as integers', () => {
      expect(compile('A 25 25 0 1 1 50 50', { toFixed: 2 })).toBe('A 25 25 0 1 1 50 50');
    });

    it('handles negative decimals', () => {
      expect(compile('M calc(-10/3) calc(-20/7)', { toFixed: 2 })).toBe('M -3.33 -2.86');
    });

    it('does not round when option not provided', () => {
      const result = compile('M calc(10/3) 0');
      expect(result).toBe(`M ${10/3} 0`);
    });

    it('works with stdlib functions', () => {
      const result = compile('circle(100, 100, calc(100/3))', { toFixed: 2 });
      // All decimals should have at most 2 decimal places
      const numbers = result.match(/-?\d+\.?\d*/g) || [];
      for (const num of numbers) {
        if (num.includes('.')) {
          const decimals = num.split('.')[1];
          expect(decimals.length).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  describe('variable reassignment', () => {
    it('reassigns a variable', () => {
      expect(compile('let x = 10; x = 20; M x 0')).toBe('M 20 0');
    });

    it('reassigns variable inside if block (updates outer scope)', () => {
      expect(compile('let x = 10; if (1) { x = 20; } M x 0')).toBe('M 20 0');
    });

    it('reassigns with expression', () => {
      expect(compile('let x = 10; x = calc(x + 5); M x 0')).toBe('M 15 0');
    });

    it('reassigns inside for loop (updates outer scope)', () => {
      expect(compile('let sum = 0; for (i in 1..3) { sum = calc(sum + i); } M sum 0')).toBe('M 6 0');
    });

    it('let in block still shadows (does not affect outer)', () => {
      expect(compile('let x = 10; if (1) { let x = 20; M x 0 } M x 0')).toBe('M 20 0 M 10 0');
    });

    it('reassigns closest scope variable', () => {
      expect(compile('let x = 10; if (1) { let x = 20; x = 30; M x 0 } M x 0')).toBe('M 30 0 M 10 0');
    });

    it('throws on assigning to undeclared variable', () => {
      expect(() => compile('x = 10;')).toThrow('Cannot assign to undeclared variable: x');
    });

    it('reassigns with modulus operator', () => {
      expect(compile('let x = 5; if (1) { x = calc(x % 3); } M x 0')).toBe('M 2 0');
    });
  });
});
