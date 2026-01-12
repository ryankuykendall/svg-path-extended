import { mathFunctions } from './math';
import { pathFunctions } from './path';

export const stdlib = {
  ...mathFunctions,
  ...pathFunctions,
};

export { mathFunctions } from './math';
export { pathFunctions } from './path';
