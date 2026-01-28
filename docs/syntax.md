# Syntax Reference

svg-path-extended is a superset of SVG path syntax that adds variables, expressions, control flow, and functions.

## Path Commands

All standard SVG path commands are supported:

| Command | Name | Parameters |
|---------|------|------------|
| `M` / `m` | Move to | `x y` |
| `L` / `l` | Line to | `x y` |
| `H` / `h` | Horizontal line | `x` |
| `V` / `v` | Vertical line | `y` |
| `C` / `c` | Cubic bezier | `x1 y1 x2 y2 x y` |
| `S` / `s` | Smooth cubic | `x2 y2 x y` |
| `Q` / `q` | Quadratic bezier | `x1 y1 x y` |
| `T` / `t` | Smooth quadratic | `x y` |
| `A` / `a` | Arc | `rx ry rotation large-arc sweep x y` |
| `Z` / `z` | Close path | (none) |

Uppercase commands use absolute coordinates; lowercase use relative coordinates.

```
M 0 0 L 100 100 Z
```

## Variables

Declare variables with `let`:

```
let width = 200;
let height = 100;
let centerX = 100;
```

Use variables directly in path commands:

```
let x = 50;
let y = 75;
M x y L 100 100
```

**Note**: Single letters that are path commands (M, L, C, etc.) cannot be used as variable names.

## Expressions with calc()

For mathematical expressions, wrap them in `calc()`:

```
let r = 50;
M calc(100 - r) 100
L calc(100 + r) 100
```

### Supported Operators

| Operator | Description |
|----------|-------------|
| `+` | Addition |
| `-` | Subtraction |
| `*` | Multiplication |
| `/` | Division |
| `%` | Modulo |
| `<` | Less than |
| `>` | Greater than |
| `<=` | Less than or equal |
| `>=` | Greater than or equal |
| `==` | Equal |
| `!=` | Not equal |
| `&&` | Logical AND |
| `\|\|` | Logical OR |
| `!` | Logical NOT (unary) |
| `-` | Negation (unary) |

Operator precedence follows standard mathematical conventions.

## Angle Units

Numbers can have angle unit suffixes for convenience:

| Suffix | Description |
|--------|-------------|
| `45deg` | Degrees (converted to radians internally) |
| `1.5rad` | Radians (no conversion) |

```
let angle = 90deg;
M sin(45deg) cos(45deg)

// Equivalent to:
let angle = rad(90);
M sin(rad(45)) cos(rad(45))
```

This is especially useful with trigonometric functions and polar coordinates.

## For Loops

Repeat path commands with `for`:

```
for (i in 0..10) {
  L calc(i * 20) calc(i * 10)
}
```

The range `0..10` includes both endpoints (0 through 10, giving 11 iterations).

### Descending Ranges

Ranges automatically count down when start > end:

```
// Countdown from 5 to 1
for (i in 5..1) {
  M calc(i * 20) 0
}
// Produces: M 100 0 M 80 0 M 60 0 M 40 0 M 20 0
```

### Nested Loops

```
for (row in 0..2) {
  for (col in 0..2) {
    circle(calc(col * 50 + 25), calc(row * 50 + 25), 10)
  }
}
```

This creates a 3x3 grid (rows 0, 1, 2 and cols 0, 1, 2).

## Conditionals

Use `if` and `else` for conditional path generation:

```
let size = 100;

if (size > 50) {
  M 0 0 L 100 100
} else {
  M 0 0 L 50 50
}
```

Comparison results are numeric: `1` for true, `0` for false.

## Functions

### Defining Functions

Create reusable path generators with `fn`:

```
fn square(x, y, size) {
  rect(x, y, size, size)
}
```

### Calling Functions

```
square(10, 10, 50)
square(70, 10, 50)
```

Functions can call other functions and use all language features.

## Comments

Line comments start with `//`:

```
// This is a comment
let x = 50;  // inline comment
M x 0
```

## Path Context (ctx)

When using `compileWithContext()`, a `ctx` object tracks the current drawing state:

```
M 10 20
L 30 40
L calc(ctx.position.x + 10) ctx.position.y  // L 40 40
```

### ctx Properties

| Property | Type | Description |
|----------|------|-------------|
| `ctx.position.x` | number | Current X coordinate |
| `ctx.position.y` | number | Current Y coordinate |
| `ctx.start.x` | number | Subpath start X (set by M, used by Z) |
| `ctx.start.y` | number | Subpath start Y |
| `ctx.commands` | array | History of executed commands |

### How Position Updates

- **M/m**: Sets position and subpath start
- **L/l, H/h, V/v**: Updates position to endpoint
- **C/c, S/s, Q/q, T/t**: Updates position to curve endpoint
- **A/a**: Updates position to arc endpoint
- **Z/z**: Returns to subpath start

Lowercase (relative) commands add to current position; uppercase (absolute) set it directly.

### log() Function

Use `log()` to inspect the context during evaluation:

```
M 10 20
log(ctx)           // Logs full context as JSON
log(ctx.position)  // Logs just position object
log(ctx.position.x) // Logs just the x value
L 30 40
```

The logs are captured in the `logs` array returned by `compileWithContext()`.

### Example: Drawing Relative to Current Position

```
M 100 100
L 150 150
// Continue from current position
L calc(ctx.position.x + 50) ctx.position.y
L ctx.position.x calc(ctx.position.y + 50)
Z
```

## Complete Example

```
// Draw a grid of circles with varying sizes
let cols = 5;
let rows = 5;
let spacing = 40;

for (row in 0..rows) {
  for (col in 0..cols) {
    let x = calc(col * spacing + 20);
    let y = calc(row * spacing + 20);
    let r = calc(5 + col + row);
    circle(x, y, r)
  }
}
```
