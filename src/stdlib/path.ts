// Path helper functions that return PathSegment values

export interface PathSegment {
  type: 'PathSegment';
  value: string;
}

function segment(value: string): PathSegment {
  return { type: 'PathSegment', value };
}

export const pathFunctions = {
  // Circle: draws a full circle using two arcs
  circle: (cx: number, cy: number, r: number): PathSegment => {
    return segment(
      `M ${cx - r} ${cy} ` +
      `A ${r} ${r} 0 1 1 ${cx + r} ${cy} ` +
      `A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
    );
  },

  // Arc: draws an arc from current point
  arc: (rx: number, ry: number, rotation: number, largeArc: number, sweep: number, x: number, y: number): PathSegment => {
    return segment(`A ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${x} ${y}`);
  },

  // Rectangle
  rect: (x: number, y: number, width: number, height: number): PathSegment => {
    return segment(
      `M ${x} ${y} ` +
      `L ${x + width} ${y} ` +
      `L ${x + width} ${y + height} ` +
      `L ${x} ${y + height} ` +
      `Z`
    );
  },

  // Rounded rectangle
  roundRect: (x: number, y: number, width: number, height: number, radius: number): PathSegment => {
    const r = Math.min(radius, width / 2, height / 2);
    return segment(
      `M ${x + r} ${y} ` +
      `L ${x + width - r} ${y} ` +
      `Q ${x + width} ${y} ${x + width} ${y + r} ` +
      `L ${x + width} ${y + height - r} ` +
      `Q ${x + width} ${y + height} ${x + width - r} ${y + height} ` +
      `L ${x + r} ${y + height} ` +
      `Q ${x} ${y + height} ${x} ${y + height - r} ` +
      `L ${x} ${y + r} ` +
      `Q ${x} ${y} ${x + r} ${y} ` +
      `Z`
    );
  },

  // Regular polygon
  polygon: (cx: number, cy: number, radius: number, sides: number): PathSegment => {
    const points: string[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      points.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    points.push('Z');
    return segment(points.join(' '));
  },

  // Star shape
  star: (cx: number, cy: number, outerRadius: number, innerRadius: number, points: number): PathSegment => {
    const segments: string[] = [];
    const totalPoints = points * 2;

    for (let i = 0; i < totalPoints; i++) {
      const angle = (i / totalPoints) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      segments.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
    }
    segments.push('Z');
    return segment(segments.join(' '));
  },

  // Line segment
  line: (x1: number, y1: number, x2: number, y2: number): PathSegment => {
    return segment(`M ${x1} ${y1} L ${x2} ${y2}`);
  },

  // Quadratic bezier curve
  quadratic: (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): PathSegment => {
    return segment(`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);
  },

  // Cubic bezier curve
  cubic: (x1: number, y1: number, c1x: number, c1y: number, c2x: number, c2y: number, x2: number, y2: number): PathSegment => {
    return segment(`M ${x1} ${y1} C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`);
  },

  // Move to (returns path segment)
  moveTo: (x: number, y: number): PathSegment => {
    return segment(`M ${x} ${y}`);
  },

  // Line to (returns path segment)
  lineTo: (x: number, y: number): PathSegment => {
    return segment(`L ${x} ${y}`);
  },

  // Close path
  closePath: (): PathSegment => {
    return segment('Z');
  },
};
