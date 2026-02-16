# Layers

Layers let you output multiple `<path>` elements from a single program, each with its own styles and independent pen tracking.

## Defining Layers

Use `define` to create a named layer with a style block:

```
define PathLayer('outline') ${
  stroke: #cc0000;
  stroke-width: 3;
  fill: none;
}
```

Layer names must be unique strings. The style block uses CSS/SVG property syntax — any SVG presentation attribute works (`stroke`, `fill`, `opacity`, `stroke-dasharray`, etc.).

> **Breaking change:** Style blocks now use `${ }` syntax instead of `{ }`. Update existing layer definitions: `{ stroke: red; }` → `${ stroke: red; }`.

### Default Layer

Mark one layer as `default` to receive all bare path commands (commands outside any `layer().apply` block):

```
define default PathLayer('main') ${
  stroke: #333;
  stroke-width: 2;
  fill: none;
}

// These commands go to 'main' automatically
M 10 10
L 90 10
L 90 90
Z
```

Without a default layer, bare commands go to an implicit unnamed layer.

## Writing to Layers

Use `layer('name').apply { ... }` to send commands to a specific layer:

```
define PathLayer('grid') ${
  stroke: #ddd;
  stroke-width: 0.5;
}

define default PathLayer('shape') ${
  stroke: #333;
  stroke-width: 2;
  fill: none;
}

// Draw a grid on the 'grid' layer
layer('grid').apply {
  for (i in 0..10) {
    M calc(i * 20) 0
    V 200
    M 0 calc(i * 20)
    H 200
  }
}

// These go to 'shape' (the default)
M 40 40
L 160 40
L 100 160
Z
```

### Context Isolation

Each layer has its own pen position. Commands in one layer don't affect another layer's `ctx`:

```
define default PathLayer('a') ${ stroke: red; }
define PathLayer('b') ${ stroke: blue; }

M 100 100    // layer 'a' position: (100, 100)

layer('b').apply {
  M 50 50    // layer 'b' position: (50, 50)
}

// Back in layer 'a', position is still (100, 100)
L 200 200
```

## Accessing Layer Context

Use `layer('name').ctx` to read a layer's pen state from anywhere:

```
define default PathLayer('main') ${ stroke: #333; }
define PathLayer('markers') ${ stroke: red; fill: red; }

M 50 50
L 150 80
L 100 150

// Draw markers at the main layer's current position
layer('markers').apply {
  let px = layer('main').ctx.position.x
  let py = layer('main').ctx.position.y
  circle(px, py, 4)
}
```

Available context properties:

| Expression | Description |
|------------|-------------|
| `layer('name').ctx.position.x` | Current X position |
| `layer('name').ctx.position.y` | Current Y position |
| `layer('name').ctx.start.x` | Subpath start X |
| `layer('name').ctx.start.y` | Subpath start Y |
| `layer('name').name` | Layer name string |

## Dynamic Layer Names

Layer names can be expressions, including variables:

```
let target = 'overlay'
define PathLayer(target) ${ stroke: blue; }

layer(target).apply {
  M 0 0 L 100 100
}
```

## Style Properties

Style properties map directly to SVG presentation attributes. Common properties:

| Property | Example | Description |
|----------|---------|-------------|
| `stroke` | `#cc0000` | Stroke color |
| `stroke-width` | `3` | Stroke width |
| `stroke-linecap` | `round` | Line cap style |
| `stroke-linejoin` | `round` | Line join style |
| `stroke-dasharray` | `4 2` | Dash pattern |
| `stroke-dashoffset` | `1` | Dash offset |
| `stroke-opacity` | `0.5` | Stroke opacity |
| `fill` | `none` | Fill color |
| `fill-opacity` | `0.3` | Fill opacity |
| `opacity` | `0.8` | Overall opacity |

Each property is a semicolon-terminated declaration:

```
define PathLayer('dashed') ${
  stroke: #0066cc;
  stroke-width: 2;
  stroke-dasharray: 8 4;
  fill: none;
}
```

## Output Format

When using the JavaScript API, `compile()` returns a structured result:

```js
import { compile } from 'svg-path-extended';

const result = compile(`
  define default PathLayer('bg') ${
    stroke: #ddd;
    fill: none;
  }
  define PathLayer('fg') ${
    stroke: #333;
    stroke-width: 2;
    fill: none;
  }

  M 0 0 H 100 V 100 H 0 Z

  layer('fg').apply {
    M 20 20 L 80 80
  }
`);

// result.layers is an array of LayerOutput:
// [
//   {
//     name: 'bg',
//     type: 'path',
//     data: 'M 0 0 H 100 V 100 H 0 Z',
//     styles: { stroke: '#ddd', fill: 'none' },
//     isDefault: true
//   },
//   {
//     name: 'fg',
//     type: 'path',
//     data: 'M 20 20 L 80 80',
//     styles: { stroke: '#333', 'stroke-width': '2', fill: 'none' },
//     isDefault: false
//   }
// ]
```

Programs without any `define` statements produce a single implicit layer:

```js
compile('M 0 0 L 100 100').layers
// [{ name: 'default', type: 'path', data: 'M 0 0 L 100 100', styles: {}, isDefault: true }]
```

## Full Example

A multi-layer illustration with a background grid, main shape, and annotation markers:

```
// Layer definitions
define PathLayer('grid') ${
  stroke: #e0e0e0;
  stroke-width: 0.5;
}

define default PathLayer('shape') ${
  stroke: #333333;
  stroke-width: 2;
  fill: none;
  stroke-linejoin: round;
}

define PathLayer('points') ${
  stroke: #cc0000;
  fill: #cc0000;
}

// Grid
layer('grid').apply {
  for (i in 0..10) {
    M calc(i * 20) 0  V 200
    M 0 calc(i * 20)  H 200
  }
}

// Shape (goes to default layer)
let cx = 100
let cy = 100
let r = 60
let sides = 6

for (i in 0..sides) {
  let angle = calc(i * 360 / sides - 90)
  let x = calc(cx + r * cos(radians(angle)))
  let y = calc(cy + r * sin(radians(angle)))
  if (i == 0) { M x y } else { L x y }
}
Z

// Mark each vertex
layer('points').apply {
  for (i in 0..sides) {
    let angle = calc(i * 360 / sides - 90)
    let x = calc(cx + r * cos(radians(angle)))
    let y = calc(cy + r * sin(radians(angle)))
    circle(x, y, 3)
  }
}
```

## TextLayer

TextLayers produce SVG `<text>` elements instead of `<path>` elements.

### Defining a TextLayer

```
define TextLayer('labels') ${
  font-size: 14;
  font-family: monospace;
  fill: #333;
}
```

### text() — Two Forms

**Inline form** — simple text content:

```
layer('labels').apply {
  text(50, 45)`Start`
  text(150, 75, 30deg)`End`    // rotation uses angle units (deg/rad/pi)
}
```

**Block form** — mixed text runs and tspan children:

```
layer('labels').apply {
  text(10, 180) {
    `Hello `
    tspan(0, 0, 30deg)`world`
    ` and more`
  }
}
```

The block form maps to SVG's mixed content model:
`<text x="10" y="180">Hello <tspan rotate="30">world</tspan> and more</text>`

Note: `30deg` in the source becomes `rotate="30"` (degrees) in SVG output.

### tspan() — Only Inside text() Blocks

```
tspan()`content`                   // no offset
tspan(dx, dy)`content`             // with offsets
tspan(dx, dy, 45deg)`content`      // with offsets and rotation
```

Position arguments (x, y, dx, dy) are plain numbers. Rotation follows the standard angle unit convention — bare numbers are radians, use `deg`/`rad`/`pi` suffixes for explicit units. Content is always a template literal.

### Template Literals

Template literals use backtick syntax with `${expression}` interpolation. They work everywhere — text content, log messages, variable values:

```
let name = "World"
let x = `Hello ${name}!`              // "Hello World!"
let msg = `Score: ${2 + 3}`           // "Score: 5"
log(`Position: ${ctx.position.x}`)    // in log messages
```

Template literals are the sole string construction mechanism — `+` stays strictly numeric. String equality (`==`/`!=`) works for conditionals:

```
let mode = "dark"
if (mode == "dark") { /* ... */ }
if (mode != "light") { /* ... */ }
```

### TextLayer Output Format

```js
const result = compile(`
  define TextLayer('labels') ${ font-size: 14; fill: #333; }
  layer('labels').apply {
    text(50, 45)\`Start\`
    text(10, 180) {
      tspan()\`Multi-\`
      tspan(0, 16)\`line\`
    }
  }
`);

// result.layers[0]:
// {
//   name: 'labels',
//   type: 'text',
//   data: 'Start Multi-line',
//   textElements: [
//     { x: 50, y: 45, children: [{ type: 'run', text: 'Start' }] },
//     { x: 10, y: 180, children: [
//       { type: 'tspan', text: 'Multi-' },
//       { type: 'tspan', text: 'line', dx: 0, dy: 16 },
//     ]},
//   ],
//   styles: { 'font-size': '14', fill: '#333' },
//   isDefault: false,
// }
```

### Restrictions

- `text()` can only be used inside a `layer().apply` block targeting a TextLayer
- `tspan()` can only appear inside a `text() { }` block
- Path commands (`M`, `L`, etc.) cannot be used inside a TextLayer apply block
- If a TextLayer is the default layer, bare path commands will throw an error

## Style Blocks

Style blocks are first-class values that can be stored in variables, merged, and accessed via dot notation.

### Style Block Literals

```
let styles = ${
  stroke-dasharray: 0.01 20;
  stroke-linecap: round;
  stroke-width: 8.4;
};
```

### Merge Operator (`<<`)

The `<<` operator merges two style blocks, with the right side overriding the left:

```
let base = ${ stroke: red; stroke-width: 2; };
let merged = base << ${ stroke-width: 4; fill: blue; };
// merged has: stroke: red, stroke-width: 4, fill: blue
```

### Property Access

Use dot notation with camelCase to read kebab-case properties:

```
let styles = ${ stroke-width: 4; };
let sw = styles.strokeWidth;  // reads 'stroke-width' → "4"
```

### Expression Evaluation in Values

Style block values are try-evaluated: if a value parses and evaluates as an expression, its result is used. Otherwise the raw string is kept:

```
let dynamic = ${
  font-size: calc(12 + 15);       // evaluates to "27"
  stroke-width: randomRange(2, 8); // evaluates to a random number
  stroke: rgb(232, 74, 166);       // kept as raw string
  fill: #996633;                   // kept as raw string
};
```

### Layer Definitions with Style Expressions

Layer definitions accept any expression that evaluates to a style block:

```
let baseStyles = ${ stroke: red; stroke-width: 2; };
define PathLayer('main') baseStyles << ${ fill: none; }
```

### Per-Element Styles on Text and Tspan

Pass style blocks as the 4th argument to `text()` or `tspan()`:

```
let bold = ${ font-weight: bold; };
layer('labels').apply {
  text(10, 20, 0, bold)`Hello`
  text(50, 80) {
    tspan(0, 0, 0, ${ fill: red; })`colored`
  }
}
```

## Limitations

- **No nesting** — `layer().apply` blocks cannot be nested inside each other
- **Layer order** — layers render in definition order (first defined = bottom)
