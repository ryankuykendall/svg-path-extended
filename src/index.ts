import { parse } from './parser';
import { evaluate } from './evaluator';

export { parse } from './parser';
export { evaluate } from './evaluator';
export { stdlib } from './stdlib';

export type { Program, Statement, Expression, Node } from './parser/ast';

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
