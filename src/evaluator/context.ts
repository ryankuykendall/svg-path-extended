// Path context tracking for svg-path-extended
// Tracks current position, subpath start, and command history during evaluation

/**
 * A point in 2D coordinate space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Record of a single path command with its start and end positions
 */
export interface CommandHistoryEntry {
  command: string;     // M, L, h, v, etc. (case-preserved)
  args: number[];      // Evaluated arguments
  start: Point;        // Position before command
  end: Point;          // Position after command
}

/**
 * Path context state tracking current position, subpath start, and command history
 */
export interface PathContext {
  position: Point;     // Current pen position
  start: Point;        // Subpath start (set by M, used by Z)
  commands: CommandHistoryEntry[];
}

/**
 * Create a new PathContext initialized at origin (0, 0)
 */
export function createPathContext(): PathContext {
  return {
    position: { x: 0, y: 0 },
    start: { x: 0, y: 0 },
    commands: [],
  };
}

/**
 * Deep copy a Point
 */
function copyPoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

/**
 * Update the path context for a command and return the new position
 *
 * @param ctx - The path context to update (mutated in place)
 * @param command - The SVG path command letter (M, L, h, v, etc.)
 * @param args - The evaluated numeric arguments for the command
 */
export function updateContextForCommand(
  ctx: PathContext,
  command: string,
  args: number[]
): void {
  const startPos = copyPoint(ctx.position);
  let endPos: Point;

  // Determine if command is relative (lowercase)
  const isRelative = command === command.toLowerCase();
  const cmd = command.toUpperCase();

  switch (cmd) {
    case 'M': {
      // MoveTo: sets new position and new subpath start
      const [x, y] = args;
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y + y };
      } else {
        endPos = { x, y };
      }
      // M also sets the subpath start
      ctx.start = copyPoint(endPos);
      break;
    }

    case 'L': {
      // LineTo: draws line to new position
      const [x, y] = args;
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y + y };
      } else {
        endPos = { x, y };
      }
      break;
    }

    case 'H': {
      // Horizontal line: only x changes
      const [x] = args;
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y };
      } else {
        endPos = { x, y: ctx.position.y };
      }
      break;
    }

    case 'V': {
      // Vertical line: only y changes
      const [y] = args;
      if (isRelative) {
        endPos = { x: ctx.position.x, y: ctx.position.y + y };
      } else {
        endPos = { x: ctx.position.x, y };
      }
      break;
    }

    case 'C': {
      // Cubic bezier: C x1 y1 x2 y2 x y
      // End point is the last pair (x, y)
      const x = args[4];
      const y = args[5];
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y + y };
      } else {
        endPos = { x, y };
      }
      break;
    }

    case 'S': {
      // Smooth cubic: S x2 y2 x y
      // End point is the last pair (x, y)
      const x = args[2];
      const y = args[3];
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y + y };
      } else {
        endPos = { x, y };
      }
      break;
    }

    case 'Q': {
      // Quadratic bezier: Q x1 y1 x y
      // End point is the last pair (x, y)
      const x = args[2];
      const y = args[3];
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y + y };
      } else {
        endPos = { x, y };
      }
      break;
    }

    case 'T': {
      // Smooth quadratic: T x y
      const [x, y] = args;
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y + y };
      } else {
        endPos = { x, y };
      }
      break;
    }

    case 'A': {
      // Arc: A rx ry rotation large-arc sweep x y
      // End point is the last pair (x, y)
      const x = args[5];
      const y = args[6];
      if (isRelative) {
        endPos = { x: ctx.position.x + x, y: ctx.position.y + y };
      } else {
        endPos = { x, y };
      }
      break;
    }

    case 'Z': {
      // Close path: returns to subpath start
      endPos = copyPoint(ctx.start);
      break;
    }

    default:
      // Unknown command - don't change position
      endPos = copyPoint(ctx.position);
  }

  // Record the command in history
  ctx.commands.push({
    command,
    args: [...args],
    start: startPos,
    end: copyPoint(endPos),
  });

  // Update current position
  ctx.position = endPos;
}

/**
 * Create a plain object representation of the context for use in scope
 * This is what users will access via ctx.position.x, etc.
 */
export function contextToObject(ctx: PathContext): Record<string, unknown> {
  return {
    position: { x: ctx.position.x, y: ctx.position.y },
    start: { x: ctx.start.x, y: ctx.start.y },
    commands: ctx.commands.map((cmd) => ({
      command: cmd.command,
      args: [...cmd.args],
      start: { x: cmd.start.x, y: cmd.start.y },
      end: { x: cmd.end.x, y: cmd.end.y },
    })),
  };
}
