import { describe, it, expect } from 'vitest';
import { compileAnnotated } from '../src';

describe('Annotated Output', () => {
  describe('basic path commands', () => {
    it('outputs each path command on its own line', () => {
      const result = compileAnnotated('M 0 0 L 10 20 Z');
      const lines = result.split('\n').filter(l => l.trim());
      expect(lines).toContain('M 0 0');
      expect(lines).toContain('L 10 20');
      expect(lines).toContain('Z');
    });

    it('preserves path command values', () => {
      const result = compileAnnotated('M 100 200');
      expect(result).toContain('M 100 200');
    });
  });

  describe('comments', () => {
    it('preserves single line comments', () => {
      const result = compileAnnotated('// This is a comment\nM 0 0');
      expect(result).toContain('// This is a comment');
    });

    it('preserves multiple comments', () => {
      const result = compileAnnotated(`// First
M 0 0
// Second
L 10 20`);
      expect(result).toContain('// First');
      expect(result).toContain('// Second');
    });

    it('preserves inline comments', () => {
      const result = compileAnnotated('M 0 0 // start point');
      expect(result).toContain('// start point');
    });
  });

  describe('for loops', () => {
    it('annotates simple for loop', () => {
      const result = compileAnnotated('for (i in 0..3) { M i 0 }');
      expect(result).toContain('//--- for (i in 0..3) from line 1');
      expect(result).toContain('//--- iteration 0');
      expect(result).toContain('//--- iteration 1');
      expect(result).toContain('//--- iteration 2');
    });

    it('shows correct line number for loop', () => {
      const result = compileAnnotated(`M 0 0
for (i in 0..2) { L i 0 }`);
      expect(result).toContain('from line 2');
    });

    it('truncates long loops', () => {
      const result = compileAnnotated('for (i in 0..20) { M i 0 }');
      expect(result).toContain('//--- iteration 0');
      expect(result).toContain('//--- iteration 1');
      expect(result).toContain('//--- iteration 2');
      expect(result).toContain('... 14 more iterations ...');
      expect(result).toContain('//--- iteration 17');
      expect(result).toContain('//--- iteration 18');
      expect(result).toContain('//--- iteration 19');
      // Should NOT contain middle iterations
      expect(result).not.toContain('//--- iteration 10');
    });

    it('shows all iterations for short loops', () => {
      const result = compileAnnotated('for (i in 0..5) { M i 0 }');
      expect(result).toContain('//--- iteration 0');
      expect(result).toContain('//--- iteration 1');
      expect(result).toContain('//--- iteration 2');
      expect(result).toContain('//--- iteration 3');
      expect(result).toContain('//--- iteration 4');
      expect(result).not.toContain('more iterations');
    });
  });

  describe('function calls', () => {
    it('annotates stdlib function calls', () => {
      const result = compileAnnotated('circle(50, 50, 25)');
      expect(result).toContain('//--- circle(50, 50, 25) called from line 1');
    });

    it('shows correct line number for function calls', () => {
      // Note: Function calls need to be separate statements (not after path commands)
      // because otherwise they're parsed as path arguments
      const result = compileAnnotated(`// Setup
circle(100, 100, 50)`);
      expect(result).toContain('from line 2');
    });

    it('annotates user-defined function calls', () => {
      const result = compileAnnotated(`fn square(x, y, s) {
  M x y
  L calc(x + s) y
  L calc(x + s) calc(y + s)
  L x calc(y + s)
  Z
}
square(10, 10, 50)`);
      expect(result).toContain('//--- square(10, 10, 50) called from line');
      expect(result).toContain('M 10 10');
      expect(result).toContain('L 60 10');
    });
  });

  describe('nested structures', () => {
    it('handles nested loops', () => {
      const result = compileAnnotated(`
for (i in 0..2) {
  for (j in 0..2) {
    M i j
  }
}`);
      // Should have outer loop annotation
      expect(result).toContain('//--- for (i in 0..2)');
      // Should have inner loop annotations
      expect(result).toContain('//--- for (j in 0..2)');
    });

    it('handles function calls inside loops', () => {
      const result = compileAnnotated(`
for (i in 0..3) {
  circle(calc(i * 50), 50, 20)
}`);
      expect(result).toContain('//--- for (i in 0..3)');
      expect(result).toContain('//--- circle');
    });
  });

  describe('variables and expressions', () => {
    it('evaluates variables in output', () => {
      const result = compileAnnotated(`
let x = 100;
let y = 200;
M x y`);
      expect(result).toContain('M 100 200');
    });

    it('evaluates calc expressions', () => {
      const result = compileAnnotated('M calc(10 + 20) calc(5 * 3)');
      expect(result).toContain('M 30 15');
    });
  });

  describe('if statements', () => {
    it('only shows executed branch', () => {
      const result = compileAnnotated(`
let x = 10;
if (x > 5) {
  M 100 100
} else {
  M 0 0
}`);
      expect(result).toContain('M 100 100');
      expect(result).not.toContain('M 0 0');
    });
  });

  describe('complex examples', () => {
    it('handles spiral example', () => {
      const result = compileAnnotated(`
// Spiral pattern
M 100 100
for (i in 1..5) {
  let angle = calc(i * 0.5);
  let r = calc(i * 10);
  L calc(100 + r) calc(100 + r)
}`);
      expect(result).toContain('// Spiral pattern');
      expect(result).toContain('M 100 100');
      expect(result).toContain('//--- for (i in 1..5)');
      expect(result).toContain('//--- iteration 1');
    });

    it('handles steps function', () => {
      // User function called as separate statement
      const result = compileAnnotated(`
fn steps(count, tread, riser) {
  for (i in 0..count) {
    h tread
    v riser
  }
}
steps(3, 20, 10)`);
      expect(result).toContain('//--- steps(3, 20, 10)');
      expect(result).toContain('//--- for (i in 0..3)');
      expect(result).toContain('h 20');
      expect(result).toContain('v 10');
    });
  });
});
