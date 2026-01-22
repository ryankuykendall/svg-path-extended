import { mathFunctions } from './math';
import { pathFunctions } from './path';

export const stdlib = {
  ...mathFunctions,
  ...pathFunctions,
};

/**
 * Functions that require path context and are evaluated specially.
 * These functions have access to the current position, tangent direction, etc.
 */
export const contextAwareFunctions = new Set([
  'polarPoint',
  'polarMove',
  'polarLine',
  'arcFromCenter',
  'tangentLine',
  'tangentArc',
]);

export { mathFunctions } from './math';
export { pathFunctions } from './path';
