import { describe, it, expect } from 'vitest';
import { compileWithContext } from '../src';

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
      const result = compileWithContext('M 10 20 L 30 40');
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
      `);
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
});
