// CodeMirror 6 configuration and completions for svg-path-extended

// Stdlib completions for autocomplete (ordered by priority)
export const stdlibCompletions = [
  // ctx object (used with polar/tangent functions)
  { label: 'ctx', type: 'variable', info: 'ctx - Path context object' },

  // 1. Polar Coordinate functions
  { label: 'polarPoint', type: 'function', info: 'polarPoint(angle, distance) - Point at polar offset' },
  { label: 'polarOffset', type: 'function', info: 'polarOffset(angle, distance) - Relative polar offset' },
  { label: 'polarMove', type: 'function', info: 'polarMove(angle, distance, isMoveTo?) - Move in polar direction' },
  { label: 'polarLine', type: 'function', info: 'polarLine(angle, distance) - Line in polar direction' },

  // 2. Arc and Tangent functions
  { label: 'arcFromCenter', type: 'function', info: 'arcFromCenter(dcx, dcy, r, start, end, cw) - Arc from center offset' },
  { label: 'arcFromPolarOffset', type: 'function', info: 'arcFromPolarOffset(angle, radius, sweepAngle) - Arc from polar center' },
  { label: 'tangentLine', type: 'function', info: 'tangentLine(length) - Line following tangent' },
  { label: 'tangentArc', type: 'function', info: 'tangentArc(radius, sweepAngle) - Arc from tangent' },

  // 3. Path functions (shapes, curves, commands)
  { label: 'circle', type: 'function', info: 'circle(cx, cy, r) - Draw circle' },
  { label: 'rect', type: 'function', info: 'rect(x, y, w, h) - Draw rectangle' },
  { label: 'roundRect', type: 'function', info: 'roundRect(x, y, w, h, r) - Rounded rectangle' },
  { label: 'polygon', type: 'function', info: 'polygon(cx, cy, r, sides) - Regular polygon' },
  { label: 'star', type: 'function', info: 'star(cx, cy, outer, inner, points) - Star shape' },
  { label: 'quadratic', type: 'function', info: 'quadratic(x1, y1, cx, cy, x2, y2) - Quadratic bezier' },
  { label: 'cubic', type: 'function', info: 'cubic(x1, y1, c1x, c1y, c2x, c2y, x2, y2) - Cubic bezier' },
  { label: 'arc', type: 'function', info: 'arc(rx, ry, rot, large, sweep, x, y) - Arc command' },
  { label: 'line', type: 'function', info: 'line(x1, y1, x2, y2) - Line segment' },
  { label: 'moveTo', type: 'function', info: 'moveTo(x, y) - Move command' },
  { label: 'lineTo', type: 'function', info: 'lineTo(x, y) - Line command' },
  { label: 'closePath', type: 'function', info: 'closePath() - Close path (Z)' },

  // 4. Constants
  { label: 'PI', type: 'function', info: 'PI() - Returns π' },
  { label: 'E', type: 'function', info: 'E() - Returns e' },
  { label: 'TAU', type: 'function', info: 'TAU() - Returns 2π' },

  // 5. Angle Conversion
  { label: 'deg', type: 'function', info: 'deg(radians) - Convert radians to degrees' },
  { label: 'rad', type: 'function', info: 'rad(degrees) - Convert degrees to radians' },

  // 6. Interpolation
  { label: 'lerp', type: 'function', info: 'lerp(a, b, t) - Linear interpolation' },
  { label: 'clamp', type: 'function', info: 'clamp(value, min, max) - Constrain to range' },
  { label: 'map', type: 'function', info: 'map(val, inMin, inMax, outMin, outMax) - Map between ranges' },

  // 7. Trigonometry
  { label: 'sin', type: 'function', info: 'sin(x) - Sine' },
  { label: 'cos', type: 'function', info: 'cos(x) - Cosine' },
  { label: 'tan', type: 'function', info: 'tan(x) - Tangent' },
  { label: 'asin', type: 'function', info: 'asin(x) - Arc sine' },
  { label: 'acos', type: 'function', info: 'acos(x) - Arc cosine' },
  { label: 'atan', type: 'function', info: 'atan(x) - Arc tangent' },
  { label: 'atan2', type: 'function', info: 'atan2(y, x) - Two-argument arc tangent' },
  { label: 'sinh', type: 'function', info: 'sinh(x) - Hyperbolic sine' },
  { label: 'cosh', type: 'function', info: 'cosh(x) - Hyperbolic cosine' },
  { label: 'tanh', type: 'function', info: 'tanh(x) - Hyperbolic tangent' },

  // 8. Rounding
  { label: 'floor', type: 'function', info: 'floor(x) - Round down' },
  { label: 'ceil', type: 'function', info: 'ceil(x) - Round up' },
  { label: 'round', type: 'function', info: 'round(x) - Round to nearest integer' },
  { label: 'trunc', type: 'function', info: 'trunc(x) - Truncate decimal' },

  // 9. Utility
  { label: 'abs', type: 'function', info: 'abs(x) - Absolute value' },
  { label: 'sign', type: 'function', info: 'sign(x) - Sign (-1, 0, or 1)' },
  { label: 'min', type: 'function', info: 'min(a, b, ...) - Minimum value' },
  { label: 'max', type: 'function', info: 'max(a, b, ...) - Maximum value' },

  // 10. Random
  { label: 'random', type: 'function', info: 'random() - Random number 0-1' },
  { label: 'randomRange', type: 'function', info: 'randomRange(min, max) - Random in range' },

  // 11. Exponential/Log
  { label: 'exp', type: 'function', info: 'exp(x) - e raised to power x' },
  { label: 'log', type: 'function', info: 'log(...) - Natural logarithm or debug logging' },
  { label: 'log10', type: 'function', info: 'log10(x) - Base-10 logarithm' },
  { label: 'log2', type: 'function', info: 'log2(x) - Base-2 logarithm' },
  { label: 'pow', type: 'function', info: 'pow(x, y) - x raised to power y' },
  { label: 'sqrt', type: 'function', info: 'sqrt(x) - Square root' },
  { label: 'cbrt', type: 'function', info: 'cbrt(x) - Cube root' },
];

// Snippet templates for autocomplete
export const snippetTemplates = [
  {
    label: 'for',
    type: 'keyword',
    info: 'for loop - iterate over a range',
    template: 'for (i in 0..10) {\n  \n}',
    cursorOffset: 16,
  },
  {
    label: 'fn',
    type: 'keyword',
    info: 'function definition',
    template: 'fn name() {\n  \n}',
    cursorOffset: 3,
  },
  {
    label: 'if',
    type: 'keyword',
    info: 'if statement - conditional execution',
    template: 'if (condition) {\n  \n}',
    cursorOffset: 4,
  },
  {
    label: 'ifelse',
    type: 'keyword',
    info: 'if-else statement',
    template: 'if (condition) {\n  \n} else {\n  \n}',
    cursorOffset: 4,
  },
  {
    label: 'let',
    type: 'keyword',
    info: 'variable declaration',
    template: 'let name = ;',
    cursorOffset: 4,
  },
  {
    label: 'forangle',
    type: 'keyword',
    info: 'radial loop - iterate angles around a circle',
    template: 'for (i in 0..count) {\n  let angle = calc(i / count * TAU());\n  \n}',
    cursorOffset: 14,
  },
  {
    label: 'forgrid',
    type: 'keyword',
    info: 'grid loop - nested rows and columns',
    template: 'for (row in 0..rows) {\n  for (col in 0..cols) {\n    \n  }\n}',
    cursorOffset: 13,
  },
];

// Completion source for svg-path-extended
export function svgPathCompletions(context) {
  // Check for nested property access (e.g., ctx.position.x, arc.point.x)
  const nestedProp = context.matchBefore(/(\w+)\.(\w+)\.(\w*)$/);
  if (nestedProp) {
    const match = nestedProp.text.match(/(\w+)\.(\w+)\.(\w*)$/);
    if (match) {
      const [, obj, prop] = match;
      const from = nestedProp.from + obj.length + 1 + prop.length + 1;

      // ctx.position.x/y or ctx.start.x/y
      if (obj === 'ctx' && (prop === 'position' || prop === 'start')) {
        return {
          from,
          options: [
            { label: 'x', type: 'property', info: `${prop}.x - X coordinate`, boost: 2 },
            { label: 'y', type: 'property', info: `${prop}.y - Y coordinate`, boost: 1 },
          ],
          validFor: /^\w*$/,
        };
      }

      // arc.point.x/y (for arcFromCenter, arcFromPolarOffset, tangentArc results)
      if (prop === 'point') {
        const doc = context.state.doc.toString();
        const arcVarRegex = new RegExp(`let\\s+${obj}\\s*=\\s*(arcFromCenter|arcFromPolarOffset|tangentArc)\\s*\\(`);
        if (arcVarRegex.test(doc)) {
          return {
            from,
            options: [
              { label: 'x', type: 'property', info: `${obj}.point.x - Endpoint X coordinate`, boost: 2 },
              { label: 'y', type: 'property', info: `${obj}.point.y - Endpoint Y coordinate`, boost: 1 },
            ],
            validFor: /^\w*$/,
          };
        }
      }
    }
  }

  // Check for single property access (e.g., ctx.position)
  const singleProp = context.matchBefore(/(\w+)\.(\w*)$/);
  if (singleProp) {
    const match = singleProp.text.match(/(\w+)\.(\w*)$/);
    if (match) {
      const [, obj] = match;
      if (obj === 'ctx') {
        const from = singleProp.from + obj.length + 1;
        return {
          from,
          options: [
            { label: 'position', type: 'property', info: 'ctx.position - Current pen position {x, y}', boost: 4 },
            { label: 'start', type: 'property', info: 'ctx.start - Subpath start position {x, y}', boost: 3 },
            { label: 'tangentAngle', type: 'property', info: 'ctx.tangentAngle - Current tangent direction (radians)', boost: 2 },
            { label: 'commands', type: 'property', info: 'ctx.commands - Array of executed commands', boost: 1 },
          ],
          validFor: /^\w*$/,
        };
      }
      // Check for user-defined object variables
      const doc = context.state.doc.toString();
      const from = singleProp.from + obj.length + 1;

      // Check for polarOffset which returns dx, dy
      const offsetVarRegex = new RegExp(`let\\s+${obj}\\s*=\\s*polarOffset\\s*\\(`);
      if (offsetVarRegex.test(doc)) {
        return {
          from,
          options: [
            { label: 'dx', type: 'property', info: `${obj}.dx - X offset`, boost: 2 },
            { label: 'dy', type: 'property', info: `${obj}.dy - Y offset`, boost: 1 },
          ],
          validFor: /^\w*$/,
        };
      }

      // Check for polarPoint which returns x, y
      const pointVarRegex = new RegExp(`let\\s+${obj}\\s*=\\s*polarPoint\\s*\\(`);
      if (pointVarRegex.test(doc)) {
        return {
          from,
          options: [
            { label: 'x', type: 'property', info: `${obj}.x - X coordinate`, boost: 2 },
            { label: 'y', type: 'property', info: `${obj}.y - Y coordinate`, boost: 1 },
          ],
          validFor: /^\w*$/,
        };
      }

      // Check for arcFromCenter/arcFromPolarOffset which return {point: {x, y}, angle}
      const arcVarRegex = new RegExp(`let\\s+${obj}\\s*=\\s*(arcFromCenter|arcFromPolarOffset|tangentArc)\\s*\\(`);
      if (arcVarRegex.test(doc)) {
        return {
          from,
          options: [
            { label: 'point', type: 'property', info: `${obj}.point - Endpoint {x, y}`, boost: 3 },
            { label: 'angle', type: 'property', info: `${obj}.angle - Tangent angle (radians)`, boost: 2 },
          ],
          validFor: /^\w*$/,
        };
      }
    }
  }

  // Regular word completion
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const doc = context.state.doc.toString();
  const options = [];
  let boost = 200;

  // 1. calc() - highest priority
  options.push({
    label: 'calc',
    type: 'function',
    info: 'calc(expr) - Evaluate math expression',
    boost: boost--,
    apply: (view, completion, from, to) => {
      view.dispatch({
        changes: { from, to, insert: 'calc()' },
        selection: { anchor: from + 5 },
      });
    },
  });

  // 2. Snippet templates - high priority
  for (const snippet of snippetTemplates) {
    options.push({
      label: snippet.label,
      type: snippet.type,
      info: snippet.info,
      boost: boost--,
      apply: (view, completion, from, to) => {
        view.dispatch({
          changes: { from, to, insert: snippet.template },
          selection: { anchor: from + snippet.cursorOffset },
        });
      },
    });
  }

  // 3. User-defined variables (let name = ...)
  const varRegex = /let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
  const seenVars = new Set();
  let match;
  while ((match = varRegex.exec(doc)) !== null) {
    const name = match[1];
    if (!seenVars.has(name)) {
      seenVars.add(name);
      options.push({
        label: name,
        type: 'variable',
        info: 'User variable',
        boost: boost--,
      });
    }
  }

  // 3.5. Function parameters (scoped to function body)
  const fnParamRegex = /fn\s+\w+\s*\(([^)]*)\)\s*\{/g;
  const seenParams = new Set();
  while ((match = fnParamRegex.exec(doc)) !== null) {
    const paramsStr = match[1];
    const openBracePos = match.index + match[0].length - 1;

    // Find matching closing brace via depth counting
    let depth = 1;
    let pos = openBracePos + 1;
    while (pos < doc.length && depth > 0) {
      if (doc[pos] === '{') depth++;
      else if (doc[pos] === '}') depth--;
      pos++;
    }
    const closeBracePos = pos - 1;

    // Only add params if cursor is inside this function body
    if (context.pos > openBracePos && context.pos <= closeBracePos) {
      const paramNames = paramsStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
      for (const name of paramNames) {
        if (!seenParams.has(name) && !seenVars.has(name)) {
          seenParams.add(name);
          options.push({
            label: name,
            type: 'variable',
            info: 'Function parameter',
            boost: boost--,
          });
        }
      }
    }
  }

  // 4. User-defined functions (fn name(...) { ... })
  const fnRegex = /fn\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const seenFns = new Set();
  while ((match = fnRegex.exec(doc)) !== null) {
    const name = match[1];
    if (!seenFns.has(name)) {
      seenFns.add(name);
      options.push({
        label: name,
        type: 'function',
        info: 'User function',
        boost: boost--,
        apply: (view, completion, from, to) => {
          view.dispatch({
            changes: { from, to, insert: name + '()' },
            selection: { anchor: from + name.length + 1 },
          });
        },
      });
    }
  }

  // 5. Loop variables (for (name in ...))
  const loopVarRegex = /for\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+in\b/g;
  const seenLoopVars = new Set();
  while ((match = loopVarRegex.exec(doc)) !== null) {
    const name = match[1];
    if (!seenLoopVars.has(name) && !seenVars.has(name)) {
      seenLoopVars.add(name);
      options.push({
        label: name,
        type: 'variable',
        info: 'Loop variable',
        boost: boost--,
      });
    }
  }

  // 6. Stdlib items (lowest priority)
  for (const item of stdlibCompletions) {
    // Skip if user already defined something with same name
    if (seenVars.has(item.label) || seenFns.has(item.label) || seenLoopVars.has(item.label) || seenParams.has(item.label)) continue;

    const completion = {
      label: item.label,
      type: item.type,
      info: item.info,
      boost: boost--,
    };

    // For functions, add parentheses and cursor positioning
    if (item.type === 'function') {
      completion.apply = (view, completion, from, to) => {
        const insert = item.label + '()';
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + item.label.length + 1 },
        });
      };
    }

    options.push(completion);
  }

  return {
    from: word.from,
    options,
    validFor: /^\w*$/,
  };
}
