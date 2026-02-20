import { describe, it, expect } from 'vitest';
import { compile, parse, compileAnnotated } from '../src';
import { compilePath } from './helpers';

describe('Path Blocks', () => {
  describe('parser', () => {
    it('parses a basic path block expression', () => {
      const ast = parse('let p = @{ v 20 h 20 };');
      expect(ast.body).toHaveLength(1);
      expect(ast.body[0].type).toBe('LetDeclaration');
      const letDecl = ast.body[0] as { type: string; value: { type: string; body: unknown[] } };
      expect(letDecl.value.type).toBe('PathBlockExpression');
      expect(letDecl.value.body).toHaveLength(2);
    });

    it('parses path block with control flow', () => {
      const ast = parse('let p = @{ for (i in 0..3) { v 10 } };');
      expect(ast.body).toHaveLength(1);
      const letDecl = ast.body[0] as { type: string; value: { type: string; body: unknown[] } };
      expect(letDecl.value.type).toBe('PathBlockExpression');
    });

    it('parses path block followed by method call', () => {
      const ast = parse('let p = @{ v 20 }.draw();');
      // Should parse as PathBlockExpression followed by .draw() postfix
      expect(ast.body).toHaveLength(1);
    });

    it('parses path block with variables', () => {
      const ast = parse('let p = @{ let d = 10; v d h d };');
      expect(ast.body).toHaveLength(1);
    });
  });

  describe('definition', () => {
    it('creates a PathBlockValue from simple commands', () => {
      const result = compile('let p = @{ v 20 h 20 }; log(p);');
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].parts[0].value).toContain('PathBlock');
    });

    it('captures relative path commands without emitting', () => {
      const result = compilePath('let p = @{ v 20 h 20 }; M 0 0');
      // Only M 0 0 should be emitted, not the path block contents
      expect(result).toBe('M 0 0');
    });

    it('supports variables inside path block', () => {
      const result = compile('let p = @{ let d = 10; v d h d }; log(p.endPoint);');
      expect(result.logs[0].parts[0].value).toContain('10');
    });

    it('supports control flow inside path block', () => {
      const result = compile(`
        let p = @{
          for (i in 0..2) {
            v 10
          }
        };
        log(p.endPoint);
      `);
      // 3 iterations of v 10 → endPoint should be (0, 30)
      expect(result.logs[0].parts[0].value).toContain('30');
    });

    it('reads outer variables', () => {
      const result = compile(`
        let size = 20;
        let p = @{ v size h size };
        log(p.endPoint);
      `);
      expect(result.logs[0].parts[0].value).toContain('20');
    });

    it('supports context-aware functions inside path block', () => {
      // arcFromPolarOffset works with the block's temporary PathContext
      const result = compile(`
        let p = @{
          v 20
          arcFromPolarOffset(1pi, 20, -0.5pi)
          h 20
        };
        log(p.endPoint);
      `);
      // Should compute endpoint based on relative path + arc + h 20
      expect(result.logs).toHaveLength(1);
    });
  });

  describe('properties', () => {
    it('length returns total path length', () => {
      const result = compile('let p = @{ v 20 h 30 }; log(p.length);');
      // v 20 = 20 units, h 30 = 30 units → total = 50
      expect(result.logs[0].parts[0].value).toBe('50');
    });

    it('startPoint is always (0, 0)', () => {
      const result = compile('let p = @{ v 20 h 30 }; log(p.startPoint);');
      expect(result.logs[0].parts[0].value).toBe('Point(0, 0)');
    });

    it('endPoint reflects final position', () => {
      const result = compile('let p = @{ v 20 h 30 }; log(p.endPoint);');
      expect(result.logs[0].parts[0].value).toBe('Point(30, 20)');
    });

    it('endPoint.x and endPoint.y are accessible', () => {
      const result = compile('let p = @{ h 10 v 5 }; log(p.endPoint.x, p.endPoint.y);');
      expect(result.logs[0].parts[0].value).toBe('10');
      expect(result.logs[0].parts[1].value).toBe('5');
    });

    it('vertices returns array of Points', () => {
      const result = compile('let p = @{ v 20 h 30 }; log(p.vertices.length);');
      // vertices: (0,0), (0,20), (30,20) → 3 unique vertices
      expect(result.logs[0].parts[0].value).toBe('3');
    });

    it('subPathCount returns 1 for simple path', () => {
      const result = compile('let p = @{ v 20 h 30 }; log(p.subPathCount);');
      expect(result.logs[0].parts[0].value).toBe('1');
    });

    it('subPathCount returns 2 with m command', () => {
      const result = compile('let p = @{ v 20 m 10 0 h 30 }; log(p.subPathCount);');
      expect(result.logs[0].parts[0].value).toBe('2');
    });

    it('subPathCommands returns structured command list', () => {
      const result = compile(`
        let p = @{ v 20 h 30 };
        log(p.subPathCommands.length);
      `);
      expect(result.logs[0].parts[0].value).toBe('2');
    });

    it('subPathCommands entries have command, args, start, end', () => {
      const result = compile(`
        let p = @{ v 20 };
        let cmd = p.subPathCommands[0];
        log(cmd.command, cmd.start, cmd.end);
      `);
      expect(result.logs[0].parts[0].value).toBe('v');
      expect(result.logs[0].parts[1].value).toBe('Point(0, 0)');
      expect(result.logs[0].parts[2].value).toBe('Point(0, 20)');
    });
  });

  describe('draw()', () => {
    it('emits relative path commands at current cursor', () => {
      const result = compilePath(`
        let p = @{ v 20 h 20 };
        M 10 10
        p.draw()
      `);
      expect(result).toBe('M 10 10 v 20 h 20');
    });

    it('advances cursor position', () => {
      const result = compilePath(`
        let p = @{ v 20 h 20 };
        M 10 10
        p.draw()
        l 5 5
      `);
      // After draw(), cursor is at (30, 30) relative to (10, 10)
      // l 5 5 continues from that position
      expect(result).toBe('M 10 10 v 20 h 20 l 5 5');
    });

    it('can be called multiple times', () => {
      const result = compilePath(`
        let p = @{ v 20 h 20 };
        M 10 10
        p.draw()
        M 50 50
        p.draw()
      `);
      expect(result).toBe('M 10 10 v 20 h 20 M 50 50 v 20 h 20');
    });

    it('returns a ProjectedPathValue', () => {
      const result = compile(`
        let p = @{ v 20 h 20 };
        M 10 10
        let proj = p.draw();
        log(proj.startPoint, proj.endPoint);
      `);
      expect(result.logs[0].parts[0].value).toBe('Point(10, 10)');
      expect(result.logs[0].parts[1].value).toBe('Point(30, 30)');
    });

    it('works inside for loop', () => {
      const result = compilePath(`
        let p = @{ v 10 h 10 };
        for (i in 0..2) {
          M calc(i * 30) 0
          p.draw()
        }
      `);
      expect(result).toBe('M 0 0 v 10 h 10 M 30 0 v 10 h 10 M 60 0 v 10 h 10');
    });

    it('works with layers', () => {
      const result = compile(
        "define default PathLayer('main') ${ stroke: black; }\n" +
        'let p = @{ v 20 h 20 };\n' +
        'M 10 10\n' +
        'p.draw()'
      );
      expect(result.layers[0].data).toBe('M 10 10 v 20 h 20');
    });
  });

  describe('project()', () => {
    it('computes absolute coordinates without emitting', () => {
      const result = compile(`
        let p = @{ v 20 h 30 };
        let proj = p.project(10, 10);
        log(proj.startPoint, proj.endPoint);
      `);
      expect(result.logs[0].parts[0].value).toBe('Point(10, 10)');
      expect(result.logs[0].parts[1].value).toBe('Point(40, 30)');
    });

    it('does not emit path commands', () => {
      const result = compilePath(`
        let p = @{ v 20 h 30 };
        let proj = p.project(10, 10);
        M 0 0
      `);
      expect(result).toBe('M 0 0');
    });

    it('does not affect cursor position', () => {
      const result = compilePath(`
        let p = @{ v 20 h 30 };
        M 10 10
        let proj = p.project(50, 50);
        l 5 5
      `);
      // project() doesn't move cursor, so l 5 5 continues from (10, 10)
      expect(result).toBe('M 10 10 l 5 5');
    });

    it('projected path has correct length', () => {
      const result = compile(`
        let p = @{ v 20 h 30 };
        let proj = p.project(10, 10);
        log(proj.length);
      `);
      expect(result.logs[0].parts[0].value).toBe('50');
    });

    it('projected path has correct vertices', () => {
      const result = compile(`
        let p = @{ v 20 h 30 };
        let proj = p.project(10, 10);
        log(proj.vertices.length);
      `);
      expect(result.logs[0].parts[0].value).toBe('3');
    });
  });

  describe('restrictions', () => {
    it('rejects absolute path commands', () => {
      expect(() => compilePath('let p = @{ V 20 };')).toThrow(/Absolute path command.*not allowed.*path blocks/);
    });

    it('rejects uppercase M', () => {
      expect(() => compilePath('let p = @{ M 10 20 };')).toThrow(/Absolute path command.*not allowed.*path blocks/);
    });

    it('rejects layer definitions inside path block', () => {
      expect(() => compilePath("let p = @{ define PathLayer('x') ${ stroke: red; } };"))
        .toThrow(/Layer definitions.*not allowed.*path blocks/);
    });

    it('rejects layer apply blocks inside path block', () => {
      expect(() => compilePath(
        "define PathLayer('x') ${ stroke: red; }\n" +
        "let p = @{ layer('x').apply { v 10 } };"
      )).toThrow(/Layer apply blocks.*not allowed.*path blocks/);
    });

    it('rejects text statements inside path block', () => {
      expect(() => compilePath(
        'let p = @{ text(0, 0)`hello` };'
      )).toThrow(/Text statements.*not allowed.*path blocks/);
    });

    it('rejects nested path blocks', () => {
      expect(() => compilePath('let p = @{ let inner = @{ v 10 }; };')).toThrow(/nest.*path blocks/);
    });

    it('rejects draw() inside path block', () => {
      expect(() => compilePath(`
        let p = @{ v 20 };
        let q = @{ p.draw() };
      `)).toThrow(/Cannot call .draw\(\) inside a path block/);
    });

    it('rejects project() inside path block', () => {
      expect(() => compilePath(`
        let p = @{ v 20 };
        let q = @{ p.project(0, 0); };
      `)).toThrow(/Cannot call .project\(\) inside a path block/);
    });

    it('allows z (closePath)', () => {
      const result = compile('let p = @{ v 20 h 20 z }; log(p.endPoint);');
      // z returns to subpath start (0, 0)
      expect(result.logs[0].parts[0].value).toBe('Point(0, 0)');
    });

    it('allows lowercase m for subpath', () => {
      const result = compile('let p = @{ v 20 m 10 0 h 20 }; log(p.subPathCount);');
      expect(result.logs[0].parts[0].value).toBe('2');
    });
  });

  describe('first-class values', () => {
    it('can be passed as function argument', () => {
      const result = compilePath(`
        fn drawAt(path, x, y) {
          M x y
          path.draw()
        }
        let p = @{ v 20 h 20 };
        drawAt(p, 10, 10)
      `);
      expect(result).toBe('M 10 10 v 20 h 20');
    });

    it('can be returned from function', () => {
      const result = compilePath(`
        fn makeLine(dx, dy) {
          return @{ l dx dy };
        }
        let p = makeLine(30, 40);
        M 0 0
        p.draw()
      `);
      expect(result).toBe('M 0 0 l 30 40');
    });

    it('can reference other PathBlock properties', () => {
      const result = compile(`
        let p1 = @{ v 20 };
        let p2 = @{ h p1.length };
        log(p2.endPoint);
      `);
      // p1.length is 20, so p2 does h 20 → endPoint (20, 0)
      expect(result.logs[0].parts[0].value).toBe('Point(20, 0)');
    });
  });

  describe('annotated output', () => {
    it('handles path block definition silently', () => {
      const output = compileAnnotated('let p = @{ v 20 h 20 };');
      // Path block definition should not produce output
      expect(output.trim()).toBe('');
    });

    it('shows draw() output with function call annotation', () => {
      const output = compileAnnotated(`
        let p = @{ v 20 h 20 };
        M 10 10
        p.draw()
      `);
      expect(output).toContain('M 10 10');
      expect(output).toContain('//--- p.draw() called from line');
      expect(output).toContain('  v 20');
      expect(output).toContain('  h 20');
    });

    it('shows draw() annotation in for loops', () => {
      const output = compileAnnotated(`
        let shape = @{ v 10 h 10 v -10 z };
        for (i in 0..1) {
          M calc(i * 20) 0
          shape.draw()
        }
      `);
      expect(output).toContain('//--- shape.draw() called from line');
      expect(output).toContain('v 10');
    });

    it('shows draw() annotation in let assignments', () => {
      const output = compileAnnotated(`
        let shape = @{ v 20 h 20 };
        M 10 10
        let proj = shape.draw();
      `);
      expect(output).toContain('//--- shape.draw() called from line');
      expect(output).toContain('v 20');
    });
  });
});
