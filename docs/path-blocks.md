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

## Implementation Phases

Path Blocks are being implemented in phases:

- **Phase 1** (current): Core definition, `draw()`, `project()`, basic properties
- **Phase 2**: Parametric sampling — `get(t)`, `tangent(t)`, `normal(t)`, `partition(n)`
- **Phase 3**: Transforms — `reverse()`, `offset(distance)`, `boundingBox()`
