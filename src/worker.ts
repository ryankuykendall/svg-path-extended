// Web Worker entry point for async compilation
// Offloads interpreter execution from main thread

import { compile, compileAnnotated, compileWithContext } from './index';

export interface WorkerRequest {
  id: number;
  type: 'compile' | 'compileAnnotated' | 'compileWithContext';
  source: string;
}

export interface WorkerResponse {
  id: number;
  type: 'compile' | 'compileAnnotated' | 'compileWithContext';
  success: boolean;
  result?: unknown;
  error?: string;
}

// Handle incoming messages
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, source } = event.data;

  try {
    let result: unknown;

    switch (type) {
      case 'compile':
        result = compile(source);
        break;
      case 'compileAnnotated':
        result = compileAnnotated(source);
        break;
      case 'compileWithContext':
        result = compileWithContext(source);
        break;
      default:
        throw new Error(`Unknown compilation type: ${type}`);
    }

    const response: WorkerResponse = {
      id,
      type,
      success: true,
      result,
    };

    self.postMessage(response);
  } catch (e) {
    const response: WorkerResponse = {
      id,
      type,
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };

    self.postMessage(response);
  }
};
