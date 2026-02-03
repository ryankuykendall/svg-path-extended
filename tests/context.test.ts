import { describe, it, expect } from 'vitest';
import { compileWithContext } from '../src';

// Helper to check if two numbers are approximately equal
function approxEqual(a: number, b: number, epsilon = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

describe('Path Context Tracking', () => {
  describe('position tracking', () => {
    it('tracks position for M (absolute moveto)', () => {
      const result = compileWithContext('M 10 20');
      expect(result.context.position).toEqual({ x: 10, y: 20 });
      expect(result.context.start).toEqual({ x: 10, y: 20 }); // M sets subpath start
    });

    it('tracks position for m (relative moveto)', () => {
      const result = compileWithContext('M 10 20 m 5 5');
      expect(result.context.position).toEqual({ x: 15, y: 25 });
      expect(result.context.start).toEqual({ x: 15, y: 25 }); // m also sets subpath start
    });

    it('tracks position for L (absolute lineto)', () => {
      const result = compileWithContext('M 0 0 L 30 40');
      expect(result.context.position).toEqual({ x: 30, y: 40 });
    });

    it('tracks position for l (relative lineto)', () => {
      const result = compileWithContext('M 10 10 l 5 5');
      expect(result.context.position).toEqual({ x: 15, y: 15 });
    });

    it('tracks position for H (absolute horizontal)', () => {
      const result = compileWithContext('M 10 20 H 50');
      expect(result.context.position).toEqual({ x: 50, y: 20 });
    });

    it('tracks position for h (relative horizontal)', () => {
      const result = compileWithContext('M 10 20 h 15');
      expect(result.context.position).toEqual({ x: 25, y: 20 });
    });

    it('tracks position for V (absolute vertical)', () => {
      const result = compileWithContext('M 10 20 V 50');
      expect(result.context.position).toEqual({ x: 10, y: 50 });
    });

    it('tracks position for v (relative vertical)', () => {
      const result = compileWithContext('M 10 20 v 15');
      expect(result.context.position).toEqual({ x: 10, y: 35 });
    });

    it('tracks position for Z (closepath)', () => {
      const result = compileWithContext('M 10 20 L 50 50 Z');
      expect(result.context.position).toEqual({ x: 10, y: 20 }); // Returns to start
    });

    it('tracks position for z (closepath lowercase)', () => {
      const result = compileWithContext('M 10 20 L 50 50 z');
      expect(result.context.position).toEqual({ x: 10, y: 20 }); // Returns to start
    });
  });

  describe('curve position tracking', () => {
    it('tracks position for C (cubic bezier)', () => {
      const result = compileWithContext('M 0 0 C 10 10 20 20 30 40');
      expect(result.context.position).toEqual({ x: 30, y: 40 }); // End point
    });

    it('tracks position for c (relative cubic)', () => {
      const result = compileWithContext('M 10 10 c 5 5 10 10 15 20');
      expect(result.context.position).toEqual({ x: 25, y: 30 }); // 10+15, 10+20
    });

    it('tracks position for S (smooth cubic)', () => {
      const result = compileWithContext('M 0 0 C 10 10 20 20 30 30 S 50 50 60 70');
      expect(result.context.position).toEqual({ x: 60, y: 70 });
    });

    it('tracks position for Q (quadratic bezier)', () => {
      const result = compileWithContext('M 0 0 Q 10 10 20 30');
      expect(result.context.position).toEqual({ x: 20, y: 30 });
    });

    it('tracks position for q (relative quadratic)', () => {
      const result = compileWithContext('M 10 10 q 5 5 10 20');
      expect(result.context.position).toEqual({ x: 20, y: 30 }); // 10+10, 10+20
    });

    it('tracks position for T (smooth quadratic)', () => {
      const result = compileWithContext('M 0 0 Q 10 10 20 20 T 40 50');
      expect(result.context.position).toEqual({ x: 40, y: 50 });
    });
  });

  describe('arc position tracking', () => {
    it('tracks position for A (absolute arc)', () => {
      const result = compileWithContext('M 0 0 A 25 25 0 1 1 50 50');
      expect(result.context.position).toEqual({ x: 50, y: 50 });
    });

    it('tracks position for a (relative arc)', () => {
      const result = compileWithContext('M 10 10 a 25 25 0 1 1 30 40');
      expect(result.context.position).toEqual({ x: 40, y: 50 }); // 10+30, 10+40
    });
  });

  describe('command history', () => {
    it('records commands with start and end positions', () => {
      const result = compileWithContext('M 10 20 L 30 40', { trackHistory: true });
      expect(result.context.commands).toHaveLength(2);

      // First command: M 10 20
      expect(result.context.commands[0].command).toBe('M');
      expect(result.context.commands[0].args).toEqual([10, 20]);
      expect(result.context.commands[0].start).toEqual({ x: 0, y: 0 });
      expect(result.context.commands[0].end).toEqual({ x: 10, y: 20 });

      // Second command: L 30 40
      expect(result.context.commands[1].command).toBe('L');
      expect(result.context.commands[1].args).toEqual([30, 40]);
      expect(result.context.commands[1].start).toEqual({ x: 10, y: 20 });
      expect(result.context.commands[1].end).toEqual({ x: 30, y: 40 });
    });

    it('records commands in loops', () => {
      const result = compileWithContext(`
        M 0 0
        for (i in 1..3) {
          L calc(i * 10) calc(i * 10)
        }
      `, { trackHistory: true });
      expect(result.context.commands).toHaveLength(4); // M + 3 L commands
      expect(result.context.position).toEqual({ x: 30, y: 30 });
    });
  });

  describe('ctx variable access', () => {
    it('accesses ctx.position.x', () => {
      const result = compileWithContext('M 10 20 L calc(ctx.position.x + 5) ctx.position.y');
      expect(result.path).toBe('M 10 20 L 15 20');
    });

    it('accesses ctx.position.y', () => {
      const result = compileWithContext('M 10 20 L ctx.position.x calc(ctx.position.y + 5)');
      expect(result.path).toBe('M 10 20 L 10 25');
    });

    it('accesses ctx.start after M', () => {
      const result = compileWithContext('M 10 20 L 50 50 L ctx.start.x ctx.start.y');
      expect(result.path).toBe('M 10 20 L 50 50 L 10 20');
    });

    it('uses ctx in calc expressions', () => {
      const result = compileWithContext(`
        M 100 100
        L 150 150
        L calc(ctx.position.x + 10) calc(ctx.position.y + 20)
      `);
      expect(result.path).toBe('M 100 100 L 150 150 L 160 170');
    });

    it('ctx updates after each command', () => {
      const result = compileWithContext(`
        M 0 0
        L 10 10
        L calc(ctx.position.x * 2) calc(ctx.position.y * 2)
        L calc(ctx.position.x + 5) calc(ctx.position.y + 5)
      `);
      // M 0 0 -> ctx.position = (0,0)
      // L 10 10 -> ctx.position = (10,10)
      // L calc(10*2) calc(10*2) -> L 20 20, ctx.position = (20,20)
      // L calc(20+5) calc(20+5) -> L 25 25
      expect(result.path).toBe('M 0 0 L 10 10 L 20 20 L 25 25');
    });
  });

  describe('log() function', () => {
    it('captures log output with line numbers and labels', () => {
      const result = compileWithContext(`
        M 10 20
        log(ctx)
      `);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].line).toBe(3);
      expect(result.logs[0].parts).toHaveLength(1);
      expect(result.logs[0].parts[0].type).toBe('value');
      expect(result.logs[0].parts[0].label).toBe('ctx');
      expect(result.logs[0].parts[0].value).toContain('"position"');
      expect(result.logs[0].parts[0].value).toContain('"x": 10');
      expect(result.logs[0].parts[0].value).toContain('"y": 20');
    });

    it('captures multiple log calls', () => {
      const result = compileWithContext(`
        M 10 20
        log(ctx)
        L 30 40
        log(ctx)
      `);
      expect(result.logs).toHaveLength(2);
    });

    it('logs specific properties with labels', () => {
      const result = compileWithContext(`
        M 10 20
        log(ctx.position)
      `);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].parts[0].label).toBe('ctx.position');
      const parsed = JSON.parse(result.logs[0].parts[0].value);
      expect(parsed).toEqual({ x: 10, y: 20 });
    });

    it('logs numeric values with labels', () => {
      const result = compileWithContext(`
        M 10 20
        log(ctx.position.x)
      `);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].parts[0].label).toBe('ctx.position.x');
      expect(result.logs[0].parts[0].value).toBe('10');
    });

    it('logs string literals without labels', () => {
      const result = compileWithContext(`
        M 10 20
        log("position:", ctx.position)
      `);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].parts).toHaveLength(2);
      expect(result.logs[0].parts[0].type).toBe('string');
      expect(result.logs[0].parts[0].value).toBe('position:');
      expect(result.logs[0].parts[1].type).toBe('value');
      expect(result.logs[0].parts[1].label).toBe('ctx.position');
    });

    it('supports multiple arguments with mixed types', () => {
      const result = compileWithContext(`
        M 10 20
        log("x =", ctx.position.x, "y =", ctx.position.y)
      `);
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].parts).toHaveLength(4);
      expect(result.logs[0].parts[0]).toEqual({ type: 'string', value: 'x =' });
      expect(result.logs[0].parts[1]).toEqual({ type: 'value', label: 'ctx.position.x', value: '10' });
      expect(result.logs[0].parts[2]).toEqual({ type: 'string', value: 'y =' });
      expect(result.logs[0].parts[3]).toEqual({ type: 'value', label: 'ctx.position.y', value: '20' });
    });

    it('does not add to path output', () => {
      const result = compileWithContext('M 10 20 log(ctx) L 30 40');
      expect(result.path).toBe('M 10 20 L 30 40');
    });
  });

  describe('context in control flow', () => {
    it('tracks position in if statements', () => {
      const result = compileWithContext(`
        M 10 20
        if (1) {
          L 30 40
        }
        L ctx.position.x ctx.position.y
      `);
      expect(result.path).toBe('M 10 20 L 30 40 L 30 40');
    });

    it('tracks position in loops', () => {
      const result = compileWithContext(`
        M 0 0
        for (i in 1..3) {
          l 10 10
        }
      `);
      // Each l 10 10 moves relative to current position
      expect(result.context.position).toEqual({ x: 30, y: 30 });
    });

    it('uses ctx in loop body', () => {
      const result = compileWithContext(`
        M 0 0
        for (i in 1..3) {
          L calc(ctx.position.x + 10) calc(ctx.position.y + i * 10)
        }
      `);
      // i=1: L 10 10 (0+10, 0+10)
      // i=2: L 20 30 (10+10, 10+20)
      // i=3: L 30 60 (20+10, 30+30)
      expect(result.path).toBe('M 0 0 L 10 10 L 20 30 L 30 60');
    });
  });

  describe('context with user functions', () => {
    it('tracks position through function calls', () => {
      // Note: Using if block to force statement separation, as function calls
      // after path commands can be parsed as path arguments
      const result = compileWithContext(`
        fn myLine(dx, dy) {
          l dx dy
        }
        M 0 0
        if (1) { myLine(10, 20) }
        L ctx.position.x ctx.position.y
      `);
      expect(result.path).toBe('M 0 0 l 10 20 L 10 20');
      expect(result.context.position).toEqual({ x: 10, y: 20 });
    });
  });

  describe('edge cases', () => {
    it('handles empty program', () => {
      const result = compileWithContext('');
      expect(result.path).toBe('');
      expect(result.context.position).toEqual({ x: 0, y: 0 });
      expect(result.context.commands).toHaveLength(0);
    });

    it('handles only variable declarations', () => {
      const result = compileWithContext('let x = 10;');
      expect(result.path).toBe('');
      expect(result.context.position).toEqual({ x: 0, y: 0 });
    });

    it('handles variables in path commands', () => {
      const result = compileWithContext(`
        let x = 100;
        let y = 200;
        M x y
      `);
      expect(result.context.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('angle units', () => {
    it('converts deg to radians', () => {
      const result = compileWithContext(`
        M 100 100
        log(90deg)
      `);
      expect(result.logs).toHaveLength(1);
      const value = parseFloat(result.logs[0].parts[0].value);
      expect(approxEqual(value, Math.PI / 2)).toBe(true);
    });

    it('keeps rad as-is', () => {
      const result = compileWithContext(`
        M 100 100
        log(1.5rad)
      `);
      expect(result.logs).toHaveLength(1);
      const value = parseFloat(result.logs[0].parts[0].value);
      expect(approxEqual(value, 1.5)).toBe(true);
    });

    it('plain number stays unchanged', () => {
      // Use a variable to force debug log (plain log(1.5) is treated as math log)
      const result = compileWithContext(`
        M 100 100
        let x = 1.5;
        log(x)
      `);
      expect(result.logs).toHaveLength(1);
      const value = parseFloat(result.logs[0].parts[0].value);
      expect(approxEqual(value, 1.5)).toBe(true);
    });

    it('supports angle arithmetic in calc - addition', () => {
      const result = compileWithContext(`
        M 100 100
        let sum = calc(90deg + 90deg);
        log(sum)
      `);
      expect(result.logs).toHaveLength(1);
      const value = parseFloat(result.logs[0].parts[0].value);
      expect(approxEqual(value, Math.PI)).toBe(true); // 180deg = π
    });

    it('supports angle arithmetic in calc - multiplication', () => {
      const result = compileWithContext(`
        M 100 100
        let doubled = calc(45deg * 2);
        log(doubled)
      `);
      expect(result.logs).toHaveLength(1);
      const value = parseFloat(result.logs[0].parts[0].value);
      expect(approxEqual(value, Math.PI / 2)).toBe(true); // 90deg = π/2
    });

    it('supports angle arithmetic in calc - division', () => {
      const result = compileWithContext(`
        M 100 100
        let halved = calc(90deg / 2);
        log(halved)
      `);
      expect(result.logs).toHaveLength(1);
      const value = parseFloat(result.logs[0].parts[0].value);
      expect(approxEqual(value, Math.PI / 4)).toBe(true); // 45deg = π/4
    });

    it('supports mixing deg with radians in calc', () => {
      // 90deg (π/2) + PI()/2 (π/2) = π
      const result = compileWithContext(`
        M 100 100
        let mixed = calc(90deg + PI() / 2);
        log(mixed)
      `);
      expect(result.logs).toHaveLength(1);
      const value = parseFloat(result.logs[0].parts[0].value);
      expect(approxEqual(value, Math.PI)).toBe(true);
    });

    it('works with deg in path command calc', () => {
      // cos(90deg) = 0, sin(90deg) = 1
      const result = compileWithContext(`
        M calc(100 + cos(90deg) * 50) calc(100 + sin(90deg) * 50)
      `);
      expect(result.context.position.x).toBeCloseTo(100, 5);
      expect(result.context.position.y).toBeCloseTo(150, 5);
    });
  });

  describe('polarPoint', () => {
    it('calculates point at 0 radians', () => {
      const result = compileWithContext(`
        M 100 100
        let pt = polarPoint(0, 50);
        L pt.x pt.y
      `);
      expect(result.context.position.x).toBeCloseTo(150, 5);
      expect(result.context.position.y).toBeCloseTo(100, 5);
    });

    it('calculates point at 90deg', () => {
      const result = compileWithContext(`
        M 100 100
        let pt = polarPoint(90deg, 50);
        L pt.x pt.y
      `);
      expect(result.context.position.x).toBeCloseTo(100, 5);
      expect(result.context.position.y).toBeCloseTo(150, 5);
    });

    it('calculates point at 45deg', () => {
      const result = compileWithContext(`
        M 100 100
        let pt = polarPoint(45deg, 50);
        L pt.x pt.y
      `);
      const sqrt2over2 = Math.SQRT2 / 2;
      expect(result.context.position.x).toBeCloseTo(100 + 50 * sqrt2over2, 5);
      expect(result.context.position.y).toBeCloseTo(100 + 50 * sqrt2over2, 5);
    });
  });

  describe('polarOffset', () => {
    it('returns relative offset at 0 radians', () => {
      const result = compileWithContext(`
        M 100 100
        let off = polarOffset(0, 50);
        log(off.dx)
        log(off.dy)
      `);
      expect(result.logs).toHaveLength(2);
      expect(parseFloat(result.logs[0].parts[0].value)).toBeCloseTo(50, 5);
      expect(parseFloat(result.logs[1].parts[0].value)).toBeCloseTo(0, 5);
    });

    it('returns relative offset at 90deg', () => {
      const result = compileWithContext(`
        M 100 100
        let off = polarOffset(90deg, 50);
        log(off.dx)
        log(off.dy)
      `);
      expect(result.logs).toHaveLength(2);
      expect(parseFloat(result.logs[0].parts[0].value)).toBeCloseTo(0, 5);
      expect(parseFloat(result.logs[1].parts[0].value)).toBeCloseTo(50, 5);
    });

    it('can be used with current position for relative movement', () => {
      const result = compileWithContext(`
        M 50 50
        let off = polarOffset(45deg, 50);
        L calc(ctx.position.x + off.dx) calc(ctx.position.y + off.dy)
      `);
      const sqrt2over2 = Math.SQRT2 / 2;
      expect(result.context.position.x).toBeCloseTo(50 + 50 * sqrt2over2, 5);
      expect(result.context.position.y).toBeCloseTo(50 + 50 * sqrt2over2, 5);
    });

    it('is independent of current position', () => {
      // polarOffset should return the same dx/dy regardless of position
      const result1 = compileWithContext(`
        M 0 0
        let off = polarOffset(0, 30);
        log(off.dx)
      `);
      const result2 = compileWithContext(`
        M 100 200
        let off = polarOffset(0, 30);
        log(off.dx)
      `);
      expect(parseFloat(result1.logs[0].parts[0].value)).toBeCloseTo(30, 5);
      expect(parseFloat(result2.logs[0].parts[0].value)).toBeCloseTo(30, 5);
    });
  });

  describe('polarMove', () => {
    it('generates L command by default', () => {
      const result = compileWithContext(`
        M 100 100
        polarMove(0, 50)
      `);
      expect(result.path).toContain('L 150 100');
      expect(result.context.position.x).toBeCloseTo(150, 5);
    });

    it('generates M command when isMoveTo=1', () => {
      const result = compileWithContext(`
        M 100 100
        polarMove(0, 50, 1)
      `);
      expect(result.path).toContain('M 150 100');
    });

    it('updates lastTangent', () => {
      const result = compileWithContext(`
        M 100 100
        polarMove(90deg, 50)
        log(ctx.lastTangent)
      `);
      expect(result.logs).toHaveLength(1);
      const tangent = parseFloat(result.logs[0].parts[0].value);
      expect(tangent).toBeCloseTo(Math.PI / 2, 5);
    });
  });

  describe('polarLine', () => {
    it('always generates L command', () => {
      const result = compileWithContext(`
        M 100 100
        polarLine(0, 50)
      `);
      expect(result.path).toContain('L 150 100');
    });

    it('updates position and lastTangent', () => {
      const result = compileWithContext(`
        M 100 100
        polarLine(45deg, 50)
        log(ctx.lastTangent)
      `);
      expect(result.logs).toHaveLength(1);
      const tangent = parseFloat(result.logs[0].parts[0].value);
      expect(tangent).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('arcFromCenter', () => {
    it('draws arc clockwise', () => {
      const result = compileWithContext(`
        arcFromCenter(100, 100, 50, 0, 90deg, 1)
      `);
      // Should draw line to (150, 100) then arc to (100, 150)
      // Uses L (not M) to keep path continuous
      expect(result.path).toContain('L 150 100');
      expect(result.path).toContain('A 50 50');
      expect(result.context.position.x).toBeCloseTo(100, 5);
      expect(result.context.position.y).toBeCloseTo(150, 5);
    });

    it('draws arc counter-clockwise', () => {
      const result = compileWithContext(`
        arcFromCenter(100, 100, 50, 0, -90deg, 0)
      `);
      // Should draw line to (150, 100) then arc to (100, 50)
      // Uses L (not M) to keep path continuous
      expect(result.path).toContain('L 150 100');
      expect(result.context.position.x).toBeCloseTo(100, 5);
      expect(result.context.position.y).toBeCloseTo(50, 5);
    });

    it('returns correct tangent angle', () => {
      const result = compileWithContext(`
        let arc = arcFromCenter(100, 100, 50, 0, 90deg, 1);
        log(arc.angle)
      `);
      expect(result.logs).toHaveLength(1);
      const angle = parseFloat(result.logs[0].parts[0].value);
      // For clockwise arc ending at 90deg, tangent is 90deg + 90deg = 180deg = π
      expect(angle).toBeCloseTo(Math.PI, 5);
    });

    it('sets lastTangent in context', () => {
      const result = compileWithContext(`
        arcFromCenter(100, 100, 50, 0, 90deg, 1)
        log(ctx.lastTangent)
      `);
      expect(result.logs).toHaveLength(1);
      const tangent = parseFloat(result.logs[0].parts[0].value);
      expect(tangent).toBeCloseTo(Math.PI, 5);
    });

    it('uses relative coordinates from current position', () => {
      // Start at (50, 50), center offset (30, 30) means center at (80, 80)
      // Arc with radius 20 from 0 to 90deg clockwise
      // Start: (80 + 20, 80) = (100, 80)
      // End: (80, 80 + 20) = (80, 100)
      const result = compileWithContext(`
        M 50 50
        arcFromCenter(30, 30, 20, 0, 90deg, 1)
      `);
      // Uses L (not M) to keep path continuous
      expect(result.path).toContain('L 100 80');
      expect(result.context.position.x).toBeCloseTo(80, 5);
      expect(result.context.position.y).toBeCloseTo(100, 5);
    });

    it('closes path to original M position with Z (not arc start)', () => {
      // This test verifies the fix for the original issue:
      // arcFromCenter now emits L (not M), so Z closes to the original M position
      // Previously, M commands in arcFromCenter would reset ctx.start, causing
      // Z to close to the wrong position
      const result = compileWithContext(`
        M 10 10
        L 90 10
        arcFromCenter(0, 10, 10, -90deg, 0, 1)
        L 90 90
        arcFromCenter(-10, 0, 10, 0, 90deg, 1)
        L 10 90
        arcFromCenter(0, -10, 10, 90deg, 180deg, 1)
        L 10 10
        Z
      `);
      // Z should close back to the original M position (10, 10)
      expect(result.context.position.x).toBeCloseTo(10, 5);
      expect(result.context.position.y).toBeCloseTo(10, 5);
      // Path should not contain multiple M commands (only the initial one)
      const mCount = (result.path.match(/M /g) || []).length;
      expect(mCount).toBe(1);
    });
  });

  describe('arcFromPolarOffset', () => {
    it('draws arc clockwise with positive angleOfArc', () => {
      // Start at (0, 0), center direction = 0 (right), radius = 50
      // Center is at (50, 0)
      // Current position is at angle π from center (left side)
      // angleOfArc = 90deg clockwise → endAngle = π + 90deg = 3π/2
      // End position: (50 + 50*cos(3π/2), 0 + 50*sin(3π/2)) = (50, -50)
      const result = compileWithContext(`
        arcFromPolarOffset(0, 50, 90deg)
      `);
      expect(result.path).toContain('A 50 50');
      expect(result.path).not.toContain('L'); // Should only emit A, not L
      expect(result.context.position.x).toBeCloseTo(50, 5);
      expect(result.context.position.y).toBeCloseTo(-50, 5);
    });

    it('draws arc counter-clockwise with negative angleOfArc', () => {
      // Start at (0, 0), center direction = 0 (right), radius = 50
      // Center is at (50, 0)
      // angleOfArc = -90deg counter-clockwise → endAngle = π - 90deg = π/2
      // End position: (50 + 50*cos(π/2), 0 + 50*sin(π/2)) = (50, 50)
      const result = compileWithContext(`
        arcFromPolarOffset(0, 50, -90deg)
      `);
      expect(result.path).toContain('A 50 50');
      expect(result.context.position.x).toBeCloseTo(50, 5);
      expect(result.context.position.y).toBeCloseTo(50, 5);
    });

    it('handles large arc (angleOfArc > 180deg)', () => {
      const result = compileWithContext(`
        arcFromPolarOffset(0, 50, 270deg)
      `);
      // largeArc flag should be 1 for angles > π
      expect(result.path).toMatch(/A 50 50 0 1/);
    });

    it('returns correct tangent angle for clockwise arc', () => {
      const result = compileWithContext(`
        let arc = arcFromPolarOffset(0, 50, 90deg);
        log(arc.angle)
      `);
      expect(result.logs).toHaveLength(1);
      const angle = parseFloat(result.logs[0].parts[0].value);
      // For CW arc: tangent = endAngle + π/2 = 3π/2 + π/2 = 2π ≈ 0
      expect(Math.cos(angle)).toBeCloseTo(1, 5); // angle ≈ 0 or 2π
      expect(Math.sin(angle)).toBeCloseTo(0, 5);
    });

    it('sets lastTangent in context', () => {
      const result = compileWithContext(`
        arcFromPolarOffset(0, 50, 90deg)
        log(ctx.lastTangent)
      `);
      expect(result.logs).toHaveLength(1);
      const tangent = parseFloat(result.logs[0].parts[0].value);
      // Same as returned angle
      expect(Math.cos(tangent)).toBeCloseTo(1, 5);
      expect(Math.sin(tangent)).toBeCloseTo(0, 5);
    });

    it('works with tangentLine chaining', () => {
      // Start at (0, 0), arc to (50, -50) with tangent pointing right (angle ≈ 0)
      // tangentLine(30) should go 30px right: (80, -50)
      const result = compileWithContext(`
        arcFromPolarOffset(0, 50, 90deg)
        tangentLine(30)
      `);
      expect(result.context.position.x).toBeCloseTo(80, 5);
      expect(result.context.position.y).toBeCloseTo(-50, 5);
    });

    it('emits only A command (no M or L)', () => {
      const result = compileWithContext(`
        arcFromPolarOffset(0, 50, 90deg)
      `);
      // Path should only be "A ..." with no M or L
      expect(result.path).toMatch(/^A /);
      expect(result.path).not.toContain('M');
      expect(result.path).not.toContain('L');
    });

    it('works with center in different direction', () => {
      // Center direction = 90deg (down in SVG coords), radius = 50
      // Center is at (0, 50)
      // Current position (0, 0) is at angle -π/2 from center (top)
      // startAngle = 90deg + 180deg = 270deg = -π/2
      // For CW 90deg arc: endAngle = -π/2 + π/2 = 0
      // End position: (0 + 50*cos(0), 50 + 50*sin(0)) = (50, 50)
      const result = compileWithContext(`
        arcFromPolarOffset(90deg, 50, 90deg)
      `);
      expect(result.context.position.x).toBeCloseTo(50, 5);
      expect(result.context.position.y).toBeCloseTo(50, 5);
    });
  });

  describe('tangentLine', () => {
    it('continues in tangent direction after polarLine', () => {
      const result = compileWithContext(`
        M 100 100
        polarLine(0, 50)
        tangentLine(30)
      `);
      // After polarLine(0, 50), position is (150, 100), tangent is 0
      // tangentLine(30) should go to (180, 100)
      expect(result.context.position.x).toBeCloseTo(180, 5);
      expect(result.context.position.y).toBeCloseTo(100, 5);
    });

    it('throws if no lastTangent', () => {
      expect(() => {
        compileWithContext(`
          M 100 100
          tangentLine(30)
        `);
      }).toThrow('tangentLine requires a previous arc or polar command');
    });

    it('works after arcFromCenter', () => {
      const result = compileWithContext(`
        arcFromCenter(100, 100, 50, 0, 90deg, 1)
        tangentLine(30)
      `);
      // After arc, position is (100, 150), tangent is π (pointing left)
      // tangentLine(30) should go 30px left: (70, 150)
      expect(result.context.position.x).toBeCloseTo(70, 5);
      expect(result.context.position.y).toBeCloseTo(150, 5);
    });
  });

  describe('tangentArc', () => {
    it('creates smooth continuation with positive sweep', () => {
      const result = compileWithContext(`
        M 50 100
        polarLine(0, 50)
        tangentArc(20, 90deg)
      `);
      // After polarLine, position is (100, 100), tangent is 0 (pointing right)
      // tangentArc with positive sweep curves "down" (clockwise)
      // Center is at (100, 120) - 20px below current position
      // End point after 90deg sweep should be around (120, 120)
      expect(result.context.position.x).toBeCloseTo(120, 5);
      expect(result.context.position.y).toBeCloseTo(120, 5);
    });

    it('handles negative sweepAngle (counter-clockwise)', () => {
      const result = compileWithContext(`
        M 50 100
        polarLine(0, 50)
        tangentArc(20, -90deg)
      `);
      // tangentArc with negative sweep curves "up" (counter-clockwise)
      // Center is at (100, 80) - 20px above current position
      // End point after -90deg sweep should be around (120, 80)
      expect(result.context.position.x).toBeCloseTo(120, 5);
      expect(result.context.position.y).toBeCloseTo(80, 5);
    });

    it('updates lastTangent for chaining', () => {
      const result = compileWithContext(`
        M 50 100
        polarLine(0, 50)
        tangentArc(20, 90deg)
        log(ctx.lastTangent)
      `);
      expect(result.logs).toHaveLength(1);
      const tangent = parseFloat(result.logs[0].parts[0].value);
      // After 90deg clockwise turn from heading right, new tangent should be down (π/2)
      expect(tangent).toBeCloseTo(Math.PI / 2, 5);
    });

    it('throws if no lastTangent', () => {
      expect(() => {
        compileWithContext(`
          M 100 100
          tangentArc(20, 90deg)
        `);
      }).toThrow('tangentArc requires a previous arc or polar command');
    });
  });

  describe('tangent function chaining', () => {
    it('chains multiple tangent operations', () => {
      const result = compileWithContext(`
        M 20 100
        polarLine(0, 40)
        tangentArc(30, 90deg)
        tangentLine(20)
        tangentArc(30, -90deg)
        tangentLine(40)
      `);
      // This creates a path that:
      // 1. Goes right 40px: (60, 100)
      // 2. Turns right (90deg), curving down: (90, 130)
      // 3. Goes down 20px: (90, 150)
      // 4. Turns left (-90deg), continuing down then right: (120, 180)
      // 5. Goes right 40px: (160, 180)
      // Verify the chaining works and produces valid output
      expect(result.context.position.x).toBeCloseTo(160, 0);
      expect(result.context.position.y).toBeCloseTo(180, 0);
      expect(result.path).toContain('A'); // Should contain arc commands
    });

    it('chains arcFromCenter with tangentLine', () => {
      const result = compileWithContext(`
        arcFromCenter(50, 50, 30, 0, 90deg, 1)
        tangentLine(40)
        tangentLine(40)
      `);
      // After arc, tangent points left (π)
      // Two tangentLines of 40 each should move 80px left total
      expect(result.context.position.x).toBeCloseTo(50 - 80, 5);
      expect(result.context.position.y).toBeCloseTo(80, 5);
    });
  });
});
