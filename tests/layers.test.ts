import { describe, it, expect } from 'vitest';
import { compile, compileWithContext } from '../src';
import { compilePath } from './helpers';

describe('Multi-Layer Support', () => {
  describe('layer definitions', () => {
    it('defines a single PathLayer', () => {
      const result = compile(`
        define PathLayer('main') {}
        layer('main').apply { M 10 20 }
      `);
      expect(result.layers).toHaveLength(1);
      expect(result.layers[0].name).toBe('main');
      expect(result.layers[0].type).toBe('path');
      expect(result.layers[0].data).toBe('M 10 20');
    });

    it('defines a default PathLayer', () => {
      const result = compile(`
        define default PathLayer('main') { stroke: #cc0000; }
        M 10 20
      `);
      expect(result.layers).toHaveLength(1);
      expect(result.layers[0].name).toBe('main');
      expect(result.layers[0].isDefault).toBe(true);
      expect(result.layers[0].data).toBe('M 10 20');
    });

    it('defines multiple layers', () => {
      const result = compile(`
        define default PathLayer('main') { stroke: #cc0000; stroke-width: 4; }
        define PathLayer('overlay') { stroke: #0000cc; }
        M 10 10 h 20 v 20 z
        layer('overlay').apply { M 30 30 v 20 h 20 z }
      `);
      expect(result.layers).toHaveLength(2);
      expect(result.layers[0].name).toBe('main');
      expect(result.layers[0].data).toBe('M 10 10 h 20 v 20 z');
      expect(result.layers[0].isDefault).toBe(true);
      expect(result.layers[1].name).toBe('overlay');
      expect(result.layers[1].data).toBe('M 30 30 v 20 h 20 z');
    });

    it('layers appear in definition order', () => {
      const result = compile(`
        define PathLayer('alpha') {}
        define PathLayer('beta') {}
        define PathLayer('gamma') {}
        layer('beta').apply { M 1 0 }
        layer('gamma').apply { M 2 0 }
        layer('alpha').apply { M 0 0 }
      `);
      expect(result.layers.map(l => l.name)).toEqual(['alpha', 'beta', 'gamma']);
    });
  });

  describe('style properties', () => {
    it('parses stroke style', () => {
      const result = compile(`
        define PathLayer('main') { stroke: #cc0000; }
        layer('main').apply { M 0 0 }
      `);
      expect(result.layers[0].styles).toEqual({ stroke: '#cc0000' });
    });

    it('parses multiple styles', () => {
      const result = compile(`
        define PathLayer('main') {
          stroke: #cc0000;
          stroke-width: 4;
          fill: none;
          stroke-dasharray: 4 1 2 3;
        }
        layer('main').apply { M 0 0 }
      `);
      expect(result.layers[0].styles).toEqual({
        stroke: '#cc0000',
        'stroke-width': '4',
        fill: 'none',
        'stroke-dasharray': '4 1 2 3',
      });
    });

    it('ignores comments in style blocks', () => {
      const result = compile(`
        define PathLayer('main') {
          // This is a comment
          stroke: red;
          // Another comment
          fill: blue;
        }
        layer('main').apply { M 0 0 }
      `);
      expect(result.layers[0].styles).toEqual({ stroke: 'red', fill: 'blue' });
    });

    it('handles empty style block', () => {
      const result = compile(`
        define PathLayer('main') {}
        layer('main').apply { M 0 0 }
      `);
      expect(result.layers[0].styles).toEqual({});
    });
  });

  describe('layer apply blocks', () => {
    it('routes commands to the specified layer', () => {
      const result = compile(`
        define PathLayer('a') {}
        define PathLayer('b') {}
        layer('a').apply { M 1 1 L 2 2 }
        layer('b').apply { M 3 3 L 4 4 }
      `);
      expect(result.layers[0].data).toBe('M 1 1 L 2 2');
      expect(result.layers[1].data).toBe('M 3 3 L 4 4');
    });

    it('supports loops inside apply blocks', () => {
      const result = compile(`
        define PathLayer('dots') {}
        layer('dots').apply {
          for (i in 0..3) {
            M calc(i * 10) 0
          }
        }
      `);
      expect(result.layers[0].data).toBe('M 0 0 M 10 0 M 20 0 M 30 0');
    });

    it('supports conditionals inside apply blocks', () => {
      const result = compile(`
        define PathLayer('main') {}
        layer('main').apply {
          if (1) { M 10 10 } else { M 20 20 }
        }
      `);
      expect(result.layers[0].data).toBe('M 10 10');
    });

    it('supports function calls inside apply blocks', () => {
      const result = compile(`
        define PathLayer('main') {}
        fn box(x, y) { M x y h 10 v 10 h -10 z }
        layer('main').apply { box(5, 5) }
      `);
      expect(result.layers[0].data).toBe('M 5 5 h 10 v 10 h -10 z');
    });
  });

  describe('default layer routing', () => {
    it('routes bare commands to default layer', () => {
      const result = compile(`
        define default PathLayer('bg') { stroke: gray; }
        define PathLayer('fg') { stroke: black; }
        M 10 10 L 20 20
        layer('fg').apply { M 30 30 L 40 40 }
      `);
      expect(result.layers[0].name).toBe('bg');
      expect(result.layers[0].data).toBe('M 10 10 L 20 20');
      expect(result.layers[1].name).toBe('fg');
      expect(result.layers[1].data).toBe('M 30 30 L 40 40');
    });

    it('bare commands without default layer create implicit default', () => {
      const result = compile(`
        define PathLayer('overlay') {}
        M 10 10
        layer('overlay').apply { M 20 20 }
      `);
      expect(result.layers).toHaveLength(2);
      expect(result.layers[0].name).toBe('default');
      expect(result.layers[0].data).toBe('M 10 10');
      expect(result.layers[0].isDefault).toBe(true);
      expect(result.layers[1].name).toBe('overlay');
      expect(result.layers[1].data).toBe('M 20 20');
    });

    it('no layers defined gives single default layer', () => {
      const result = compile('M 10 20 L 30 40');
      expect(result.layers).toHaveLength(1);
      expect(result.layers[0].name).toBe('default');
      expect(result.layers[0].data).toBe('M 10 20 L 30 40');
      expect(result.layers[0].isDefault).toBe(true);
      expect(result.layers[0].styles).toEqual({});
    });
  });

  describe('context isolation', () => {
    it('each layer has its own path context', () => {
      const result = compileWithContext(`
        define PathLayer('a') {}
        define PathLayer('b') {}
        layer('a').apply { M 100 100 L 200 200 }
        layer('b').apply { M 0 0 L 50 50 }
      `);
      // Main context should be at origin (no bare commands)
      expect(result.context.position).toEqual({ x: 0, y: 0 });
    });

    it('layer().ctx returns layer-specific context', () => {
      const result = compileWithContext(`
        define PathLayer('main') {}
        layer('main').apply { M 100 100 L 200 200 }
        log(layer('main').ctx.position.x)
        log(layer('main').ctx.position.y)
      `);
      expect(result.logs).toHaveLength(2);
      expect(result.logs[0].parts[0].value).toBe('200');
      expect(result.logs[1].parts[0].value).toBe('200');
    });

    it('ctx updates within apply block reflect the layer context', () => {
      const result = compileWithContext(`
        define PathLayer('main') {}
        layer('main').apply {
          M 50 50
          L calc(ctx.position.x + 10) calc(ctx.position.y + 10)
        }
      `);
      expect(result.layers[0].data).toBe('M 50 50 L 60 60');
    });
  });

  describe('layer() function', () => {
    it('returns a LayerReference', () => {
      const result = compileWithContext(`
        define PathLayer('test') {}
        layer('test').apply { M 10 10 }
        log(layer('test').name)
      `);
      expect(result.logs[0].parts[0].value).toBe('test');
    });

    it('layer().ctx works', () => {
      const result = compileWithContext(`
        define PathLayer('test') {}
        layer('test').apply { M 42 99 }
        log(layer('test').ctx.position.x)
      `);
      expect(result.logs[0].parts[0].value).toBe('42');
    });
  });

  describe('compileWithContext with layers', () => {
    it('returns layers in result', () => {
      const result = compileWithContext(`
        define default PathLayer('main') { stroke: red; }
        define PathLayer('outline') { stroke: black; stroke-width: 2; }
        M 10 10 L 20 20
        layer('outline').apply { M 0 0 L 100 100 }
      `);
      expect(result.layers).toHaveLength(2);
      expect(result.layers[0].name).toBe('main');
      expect(result.layers[0].styles.stroke).toBe('red');
      expect(result.layers[1].name).toBe('outline');
      expect(result.layers[1].styles.stroke).toBe('black');
      expect(result.layers[1].styles['stroke-width']).toBe('2');
    });

    it('path property returns first layer data', () => {
      const result = compileWithContext(`
        define default PathLayer('main') {}
        M 10 20
      `);
      expect(result.path).toBe('M 10 20');
    });
  });

  describe('layer name from expression', () => {
    it('supports variable as layer name', () => {
      const result = compile(`
        let name = 'myLayer';
        define PathLayer(name) {}
        layer(name).apply { M 10 10 }
      `);
      expect(result.layers[0].name).toBe('myLayer');
      expect(result.layers[0].data).toBe('M 10 10');
    });
  });

  describe('error cases', () => {
    it('throws on duplicate layer name', () => {
      expect(() => compile(`
        define PathLayer('main') {}
        define PathLayer('main') {}
      `)).toThrow("Duplicate layer name: 'main'");
    });

    it('throws on multiple default layers', () => {
      expect(() => compile(`
        define default PathLayer('a') {}
        define default PathLayer('b') {}
      `)).toThrow("Cannot define multiple default layers. 'a' is already the default");
    });

    it('throws on nested apply blocks', () => {
      expect(() => compile(`
        define PathLayer('a') {}
        define PathLayer('b') {}
        layer('a').apply {
          layer('b').apply { M 0 0 }
        }
      `)).toThrow("Cannot nest layer apply blocks. Already inside layer 'a'");
    });

    it('throws on undefined layer in apply', () => {
      expect(() => compile(`
        layer('nonexistent').apply { M 0 0 }
      `)).toThrow("Undefined layer: 'nonexistent'");
    });

    it('throws on undefined layer in expression', () => {
      expect(() => compileWithContext(`
        log(layer('nonexistent').ctx)
      `)).toThrow("Undefined layer: 'nonexistent'");
    });

    it('throws on non-string layer name in define', () => {
      expect(() => compile(`
        define PathLayer(42) {}
      `)).toThrow('Layer name must be a string');
    });

    it('throws on non-string layer name in apply', () => {
      expect(() => compile(`
        define PathLayer('test') {}
        layer(42).apply { M 0 0 }
      `)).toThrow('Layer name must be a string');
    });

    it('allows TextLayer definitions', () => {
      const result = compile(`
        define TextLayer('labels') {}
      `);
      expect(result.layers).toHaveLength(1);
      expect(result.layers[0].type).toBe('text');
      expect(result.layers[0].name).toBe('labels');
    });

    it('throws when path commands target a TextLayer apply block', () => {
      expect(() => compile(`
        define TextLayer('labels') {}
        layer('labels').apply { M 10 20 }
      `)).toThrow('Path commands cannot be used inside a TextLayer apply block');
    });

    it('throws when bare path commands route to default TextLayer', () => {
      expect(() => compile(`
        define default TextLayer('labels') {}
        M 10 20
      `)).toThrow('Path commands cannot be routed to a TextLayer');
    });

    it('throws when text() is used outside a TextLayer apply block', () => {
      expect(() => compile(`
        text(10, 20)\`hello\`
      `)).toThrow('text() can only be used inside a TextLayer apply block');
    });

    it('throws when text() is used inside a PathLayer apply block', () => {
      expect(() => compile(`
        define PathLayer('main') {}
        layer('main').apply { text(10, 20)\`hello\` }
      `)).toThrow('text() can only be used inside a TextLayer apply block');
    });
  });

  describe('TextLayer', () => {
    it('creates a TextLayer with inline text', () => {
      const result = compile(`
        define TextLayer('labels') { font-size: 14; }
        layer('labels').apply {
          text(10, 20)\`Hello\`
        }
      `);
      expect(result.layers).toHaveLength(1);
      const layer = result.layers[0];
      expect(layer.type).toBe('text');
      expect(layer.name).toBe('labels');
      expect(layer.styles['font-size']).toBe('14');
      expect(layer.textElements).toHaveLength(1);
      expect(layer.textElements![0]).toEqual({
        x: 10, y: 20, rotation: undefined,
        children: [{ type: 'run', text: 'Hello' }],
      });
    });

    it('creates text with rotation', () => {
      const result = compile(`
        define TextLayer('labels') {}
        layer('labels').apply {
          text(50, 45, 30)\`Rotated\`
        }
      `);
      const te = result.layers[0].textElements![0];
      expect(te.x).toBe(50);
      expect(te.y).toBe(45);
      expect(te.rotation).toBe(30);
    });

    it('creates text with template literal interpolation', () => {
      const result = compile(`
        define TextLayer('labels') {}
        let name = "World";
        layer('labels').apply {
          text(10, 20)\`Hello \${name}!\`
        }
      `);
      const te = result.layers[0].textElements![0];
      expect(te.children[0]).toEqual({ type: 'run', text: 'Hello World!' });
    });

    it('creates text with block form and tspans', () => {
      const result = compile(`
        define TextLayer('labels') {}
        layer('labels').apply {
          text(10, 20) {
            \`Hello \`
            tspan(0, 0, 30)\`world\`
            \` end\`
          }
        }
      `);
      const te = result.layers[0].textElements![0];
      expect(te.children).toEqual([
        { type: 'run', text: 'Hello ' },
        { type: 'tspan', text: 'world', dx: 0, dy: 0, rotation: 30 },
        { type: 'run', text: ' end' },
      ]);
    });

    it('creates tspan with only dx/dy', () => {
      const result = compile(`
        define TextLayer('labels') {}
        layer('labels').apply {
          text(10, 20) {
            tspan()\`first\`
            tspan(0, 16)\`second\`
          }
        }
      `);
      const te = result.layers[0].textElements![0];
      expect(te.children).toEqual([
        { type: 'tspan', text: 'first' },
        { type: 'tspan', text: 'second', dx: 0, dy: 16 },
      ]);
    });

    it('data field contains concatenated plain text', () => {
      const result = compile(`
        define TextLayer('labels') {}
        layer('labels').apply {
          text(10, 20)\`Hello\`
          text(50, 60)\`World\`
        }
      `);
      expect(result.layers[0].data).toBe('Hello World');
    });

    it('mixes PathLayer and TextLayer', () => {
      const result = compile(`
        define default PathLayer('shape') { stroke: #333; fill: none; }
        define TextLayer('labels') { font-size: 14; fill: #333; }
        M 50 50 L 150 80
        layer('labels').apply {
          text(50, 45)\`Start\`
          text(150, 75)\`End\`
        }
      `);
      expect(result.layers).toHaveLength(2);
      expect(result.layers[0].type).toBe('path');
      expect(result.layers[0].data).toBe('M 50 50 L 150 80');
      expect(result.layers[1].type).toBe('text');
      expect(result.layers[1].textElements).toHaveLength(2);
    });

    it('TextLayer can be the default layer', () => {
      const result = compile(`
        define default TextLayer('labels') {}
        define PathLayer('lines') {}
        layer('lines').apply { M 10 20 }
        layer('labels').apply { text(10, 20)\`hello\` }
      `);
      expect(result.layers[0].type).toBe('text');
      expect(result.layers[0].isDefault).toBe(true);
      expect(result.layers[1].type).toBe('path');
    });

    it('uses variables and expressions in text position', () => {
      const result = compile(`
        define TextLayer('labels') {}
        let x = 10;
        let y = 20;
        layer('labels').apply {
          text(calc(x + 5), calc(y * 2))\`pos\`
        }
      `);
      const te = result.layers[0].textElements![0];
      expect(te.x).toBe(15);
      expect(te.y).toBe(40);
    });

    it('uses for loop inside TextLayer apply block', () => {
      const result = compile(`
        define TextLayer('labels') {}
        layer('labels').apply {
          for (i in 0..2) {
            text(calc(i * 50), 20)\`item \${i}\`
          }
        }
      `);
      expect(result.layers[0].textElements).toHaveLength(3);
      expect(result.layers[0].textElements![0].x).toBe(0);
      expect(result.layers[0].textElements![1].x).toBe(50);
      expect(result.layers[0].textElements![2].x).toBe(100);
    });
  });
});
