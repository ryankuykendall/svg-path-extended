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

## For Loops

Repeat path commands with `for`:

```
for (i in 0..10) {
  L calc(i * 20) calc(i * 10)
}
```

The range `0..10` includes 0 through 9 (exclusive end).

### Nested Loops

```
for (row in 0..3) {
  for (col in 0..3) {
    circle(calc(col * 50 + 25), calc(row * 50 + 25), 10)
  }
}
```

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
