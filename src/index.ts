import { parse, parseWithComments } from './parser';
import { evaluate, evaluateAnnotated, formatAnnotated } from './evaluator';

export { parse, parseWithComments } from './parser';
export { evaluate, evaluateAnnotated, formatAnnotated } from './evaluator';
export { stdlib } from './stdlib';

export type { Program, Statement, Expression, Node, SourceLocation, Comment } from './parser/ast';
export type { AnnotatedOutput, AnnotatedLine } from './evaluator';
export type { FormatOptions } from './evaluator/formatter';

/**
 * Compile extended SVG path syntax to standard SVG path string.
 *
 * @param source - The extended SVG path source code
 * @returns The compiled standard SVG path string
 *
 * @example
 * ```ts
 * import { compile } from 'svg-path-extended';
 *
 * const path = compile(`
 *   let r = 50;
 *   M 100 100
 *   A r r 0 1 1 calc(100 + r * 2) 100
 * `);
 * // => "M 100 100 A 50 50 0 1 1 200 100"
 * ```
 */
export function compile(source: string): string {
  const ast = parse(source);
  return evaluate(ast);
}

/**
 * Compile extended SVG path syntax to annotated output.
 * Preserves comments, shows loop iterations, and annotates function calls.
 *
 * @param source - The extended SVG path source code
 * @returns Formatted annotated output string
 *
 * @example
 * ```ts
 * import { compileAnnotated } from 'svg-path-extended';
 *
 * const output = compileAnnotated(`
 *   // Draw points
 *   for (i in 0..3) { M i 0 }
 * `);
 * // Returns formatted output with comments and loop annotations
 * ```
 */
export function compileAnnotated(source: string): string {
  const { program, comments } = parseWithComments(source);
  const annotated = evaluateAnnotated(program, comments);
  return formatAnnotated(annotated);
}
