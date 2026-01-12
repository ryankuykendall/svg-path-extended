# Standard Library Reference

svg-path-extended includes built-in functions for math operations and common SVG shapes.

## Math Functions

### Trigonometry

All trigonometric functions use radians.

| Function | Description |
|----------|-------------|
| `sin(x)` | Sine |
| `cos(x)` | Cosine |
| `tan(x)` | Tangent |
| `asin(x)` | Arc sine |
| `acos(x)` | Arc cosine |
| `atan(x)` | Arc tangent |
| `atan2(y, x)` | Two-argument arc tangent |

```
// Draw a point on a circle
let angle = 0.5;
let r = 50;
M calc(100 + cos(angle) * r) calc(100 + sin(angle) * r)
```

### Angle Conversion

| Function | Description |
|----------|-------------|
| `rad(degrees)` | Convert degrees to radians |
| `deg(radians)` | Convert radians to degrees |

```
// Use degrees instead of radians
let angle = rad(45);
M calc(cos(angle) * 50) calc(sin(angle) * 50)
```

### Exponential & Logarithmic

| Function | Description |
|----------|-------------|
| `exp(x)` | e raised to power x |
| `log(x)` | Natural logarithm |
| `log10(x)` | Base-10 logarithm |
| `log2(x)` | Base-2 logarithm |
| `pow(x, y)` | x raised to power y |
| `sqrt(x)` | Square root |
| `cbrt(x)` | Cube root |

### Rounding

| Function | Description |
|----------|-------------|
| `floor(x)` | Round down |
| `ceil(x)` | Round up |
| `round(x)` | Round to nearest integer |
| `trunc(x)` | Truncate decimal part |

### Utility

| Function | Description |
|----------|-------------|
| `abs(x)` | Absolute value |
| `sign(x)` | Sign (-1, 0, or 1) |
| `min(a, b, ...)` | Minimum value |
| `max(a, b, ...)` | Maximum value |

### Interpolation & Clamping

| Function | Description |
|----------|-------------|
| `lerp(a, b, t)` | Linear interpolation: `a + (b - a) * t` |
| `clamp(value, min, max)` | Constrain value to range |
| `map(value, inMin, inMax, outMin, outMax)` | Map value from one range to another |

```
// Interpolate between two positions
let t = 0.5;
M calc(lerp(0, 100, t)) calc(lerp(0, 50, t))

// Clamp a value
let x = clamp(150, 0, 100);  // Result: 100
```

### Constants

| Function | Returns |
|----------|---------|
| `PI()` | 3.14159... |
| `E()` | 2.71828... |
| `TAU()` | 6.28318... (2π) |

```
// Draw a semicircle
let r = 50;
for (i in 0..20) {
  let angle = calc(i / 20 * PI());
  L calc(100 + cos(angle) * r) calc(100 + sin(angle) * r)
}
```

### Random

| Function | Description |
|----------|-------------|
| `random()` | Random number between 0 and 1 |
| `randomRange(min, max)` | Random number in range |

**Note**: Random functions are not deterministic. Each call produces a different value.

---

## Path Functions

These functions generate complete path segments.

### circle(cx, cy, r)

Draws a circle centered at (cx, cy) with radius r.

```
circle(100, 100, 50)
```

Output: A full circle using two arc commands.

### rect(x, y, width, height)

Draws a rectangle.

```
rect(10, 10, 80, 60)
```

### roundRect(x, y, width, height, radius)

Draws a rectangle with rounded corners.

```
roundRect(10, 10, 80, 60, 10)
```

### polygon(cx, cy, radius, sides)

Draws a regular polygon.

```
polygon(100, 100, 50, 6)  // Hexagon
polygon(100, 100, 50, 8)  // Octagon
```

### star(cx, cy, outerRadius, innerRadius, points)

Draws a star shape.

```
star(100, 100, 50, 25, 5)  // 5-pointed star
```

### line(x1, y1, x2, y2)

Draws a line segment.

```
line(0, 0, 100, 100)
```

### arc(rx, ry, rotation, largeArc, sweep, x, y)

Draws an arc to (x, y). This is a direct wrapper around the SVG `A` command.

```
M 50 100
arc(50, 50, 0, 1, 1, 150, 100)
```

### quadratic(x1, y1, cx, cy, x2, y2)

Draws a quadratic bezier curve from (x1, y1) to (x2, y2) with control point (cx, cy).

```
quadratic(0, 100, 50, 0, 100, 100)
```

### cubic(x1, y1, c1x, c1y, c2x, c2y, x2, y2)

Draws a cubic bezier curve.

```
cubic(0, 100, 25, 0, 75, 0, 100, 100)
```

### moveTo(x, y)

Returns a move command. Useful inside functions.

```
moveTo(50, 50)
```

### lineTo(x, y)

Returns a line command.

```
lineTo(100, 100)
```

### closePath()

Returns a close path command.

```
closePath()
```

---

## Using Functions Inside calc()

Math functions can be used inside `calc()`:

```
M calc(sin(0.5) * 100) calc(cos(0.5) * 100)
L calc(lerp(0, 100, 0.5)) calc(clamp(150, 0, 100))
```

Path functions are called at the statement level:

```
circle(100, 100, calc(25 + 25))  // calc() inside arguments
```
