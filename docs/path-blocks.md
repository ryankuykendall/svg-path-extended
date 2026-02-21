# Path Blocks

Path Blocks let you define reusable, introspectable paths without immediately drawing them. A PathBlock captures relative path commands and exposes metadata (length, vertices, endpoints) for positioning other elements relative to the path.

## Syntax

```
let myPath = @{
  v 20
  h 30
  v -20
};
```

`@{` opens a Path Block, `}` closes it. The body contains **relative** path commands, control flow, variables, and function calls. The result is a `PathBlock` value — no path commands are emitted.

## Drawing a Path Block

Use `.draw()` to emit the path's commands at the current cursor position:

```
let shape = @{ v 20 h 20 v -20 z };

M 10 10
shape.draw()     // emits: v 20 h 20 v -20 z
M 50 50
shape.draw()     // reuse at a different position
```

`draw()` advances the cursor to the path's endpoint and returns a `ProjectedPath` with absolute coordinates.

### Assigning the draw result

```
let shape = @{ v 20 h 20 };
M 10 10
let proj = shape.draw();
// proj.startPoint = Point(10, 10)
// proj.endPoint = Point(30, 30)
```

## Projecting Without Drawing

Use `.project(x, y)` to compute absolute coordinates without emitting commands or moving the cursor:

```
let shape = @{ v 20 h 30 };
let proj = shape.project(10, 10);
// proj.startPoint = Point(10, 10)
// proj.endPoint = Point(40, 30)
// No path commands emitted, cursor unchanged
```

## Properties

### PathBlock

| Property | Type | Description |
|---|---|---|
| `length` | `number` | Total arc-length of the path |
| `vertices` | `Point[]` | Unique start/end points of each command segment |
| `subPathCount` | `number` | Number of subpaths (separated by `m` commands) |
| `subPathCommands` | `object[]` | Structured command list (see below) |
| `startPoint` | `Point` | Always `Point(0, 0)` |
| `endPoint` | `Point` | Final cursor position (relative to origin) |

### ProjectedPath

Same properties as PathBlock but with absolute coordinates.

### subPathCommands entries

Each entry in `subPathCommands` is an object with:

```
{
  command: "v",           // lowercase command letter
  args: [20],             // numeric arguments
  start: Point(0, 0),     // cursor before command
  end: Point(0, 20)       // cursor after command
}
```

## Control Flow Inside Path Blocks

Variables, `for` loops, `foreach` loops, `if` statements, and function calls all work inside path blocks:

```
let zigzag = @{
  for (i in 0..4) {
    v 10
    h calc(i % 2 == 0 ? 10 : -10)
  }
};
```

Context-aware functions like `arcFromPolarOffset`, `tangentLine`, and `tangentArc` work against the block's temporary path context.

## Accessing Outer Variables

Path blocks can read variables from enclosing scope:

```
let size = 20;
let box = @{ v size h size v calc(-size) z };
```

## First-Class Values

PathBlocks can be passed as function arguments and returned from functions:

```
fn makeStep(dx, dy) {
  return @{ h dx v dy };
}

let step = makeStep(10, 5);
M 0 0
step.draw()    // emits: h 10 v 5
```

## Using Path Metadata

Access path properties for layout calculations:

```
let segment = @{ v 20 h 30 };

// Use length to create a matching horizontal line
let total = segment.length;       // 50

// Use endpoint for positioning
let end = segment.endPoint;       // Point(30, 20)
M end.x end.y                     // Position at path endpoint
```

## Restrictions

Path blocks enforce these rules at runtime:

1. **Relative commands only** — All path commands must be lowercase (`m`, `l`, `h`, `v`, etc.). Uppercase (absolute) commands throw an error.
2. **No layer definitions** — `define PathLayer/TextLayer` is not allowed
3. **No layer apply blocks** — `layer().apply { }` is not allowed
4. **No text statements** — `text()` / `tspan()` are not allowed
5. **No nesting** — Path blocks cannot contain other `@{ }` expressions
6. **No draw/project inside blocks** — Calling `.draw()` or `.project()` inside a path block throws an error

## Parametric Sampling

Parametric sampling lets you query points, tangent directions, and normal directions at any position along a path. The parameter `t` is a fraction from 0 (start) to 1 (end) measured by arc length.

These methods work on both PathBlock values and ProjectedPath values.

### `get(t)` → Point

Returns the point at arc-length fraction `t` along the path.

```
let p = @{ v 50 h 100 };
let mid = p.get(0.5);       // Point roughly at distance 75 along path
M mid.x mid.y               // position at midpoint
```

### `tangent(t)` → `{ point, angle }`

Returns the point and tangent angle (radians) at fraction `t`. The angle is the direction of travel.

```
let p = @{ v 50 h 100 };
let tan = p.tangent(0.0);
log(tan.point);              // Point(0, 0)
log(tan.angle);              // ~1.5708 (π/2, pointing down)
```

### `normal(t)` → `{ point, angle }`

Returns the point and left-hand normal angle at fraction `t`. The normal angle equals the tangent angle minus π/2.

```
let p = @{ h 100 };
let n = p.normal(0.5);
log(n.point);                // Point(50, 0)
log(n.angle);                // ~-1.5708 (pointing up — left-hand normal of rightward path)
```

### `partition(n)` → OrientedPoint[]

Divides the path into `n` equal-length segments, returning `n + 1` oriented points (endpoints inclusive). Each oriented point has `point` and `angle` properties.

```
let p = @{ h 100 };
let pts = p.partition(4);    // 5 points at x = 0, 25, 50, 75, 100
for (op in pts) {
  log(op.point.x, op.angle);
}
```

### Sampling on ProjectedPath

Projected paths return absolute coordinates:

```
let p = @{ h 100 };
let proj = p.project(10, 20);
let mid = proj.get(0.5);    // Point(60, 20) — offset by projection origin
```

### Curve Support

Sampling works on all command types including cubic/quadratic Bézier curves and arcs. Curves use arc-length parameterization so that `t = 0.5` always represents the geometric midpoint, not the parametric midpoint.

## Transforms

Transforms create new paths from existing ones — reversing direction, computing bounding boxes, and constructing parallel paths. These methods work on both PathBlock values and ProjectedPath values.

### `reverse()` → PathBlock / ProjectedPath

Returns a new path with reversed direction of travel. The reversed path starts where the original ended and ends where the original started.

```
let p = @{ h 50 v 30 };
let r = p.reverse();
log(r.endPoint);             // Point(-50, -30) — reversed from original
M 100 100
r.draw()                     // draws the path in reverse
```

Smooth commands (S/T) are automatically converted to their explicit forms (C/Q) before reversal. Closed paths (ending with `z`) preserve closure.

```
let closed = @{ h 30 v 30 h -30 z };
let rev = closed.reverse();  // reversed, still ends with z
```

### `boundingBox()` → `{ x, y, width, height }`

Returns the axis-aligned bounding box of the path. Accounts for Bézier curve extrema and arc extrema — not just endpoints.

```
let p = @{ c 0 -40 50 -40 50 0 };
let bb = p.boundingBox();
log(bb.y);                    // negative — curve extends above endpoints
log(bb.width, bb.height);    // full extent of the curve
```

For a straight-line path the bounding box matches the endpoint coordinates:

```
let line = @{ h 100 };
let bb = line.boundingBox();
// bb = { x: 0, y: 0, width: 100, height: 0 }
```

### `offset(distance)` → PathBlock / ProjectedPath

Creates a parallel path offset by `distance` units. Positive values offset to the left of the travel direction, negative to the right.

```
let p = @{ h 60 v 40 };
let outer = p.offset(5);     // 5 units left of travel
let inner = p.offset(-5);    // 5 units right of travel
```

Offset preserves curve types — cubic Béziers produce offset cubics, arcs produce offset arcs with adjusted radii. Segment joins use miter joins with a limit of 4× the offset distance.

```
let curve = @{ c 0 -40 50 -40 50 0 };
let parallel = curve.offset(3);
M 0 50
curve.draw()
M 0 50
parallel.draw()              // parallel curve 3 units to the left
```

### Transforms on ProjectedPath

Projected paths return results in absolute coordinates:

```
let p = @{ h 100 };
let proj = p.project(10, 20);
let bb = proj.boundingBox();
// bb.x = 10, bb.y = 20 — absolute coordinates

let rev = proj.reverse();
log(rev.startPoint);         // Point(110, 20) — starts at original end
```

## Implementation Phases

Path Blocks are being implemented in phases:

- **Phase 1**: Core definition, `draw()`, `project()`, basic properties
- **Phase 2**: Parametric sampling — `get(t)`, `tangent(t)`, `normal(t)`, `partition(n)`
- **Phase 3** (current): Transforms — `reverse()`, `offset(distance)`, `boundingBox()`
