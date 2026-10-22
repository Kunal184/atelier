import { CodeRunner } from './CodeRunner';

export class JavaScriptRunner extends CodeRunner {
  constructor() {
    super('javascript');
  }

  async init() {
    // Modern browser JavaScript engine is always immediately available
    return Promise.resolve();
  }

  async run(code) {
    const startTime = performance.now();
    let stdout = '';
    let stderr = '';

    // Intercept console.log, console.error, and console.warn calls
    const customConsole = {
      log: (...args) => {
        stdout += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\n';
      },
      warn: (...args) => {
        stdout += '[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\n';
      },
      error: (...args) => {
        stderr += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') + '\n';
      }
    };

    try {
      // Evaluate code with overridden console scope
      const runFunction = new Function('console', `'use strict';\n` + code);
      runFunction(customConsole);
    } catch (err) {
      stderr += err.name + ': ' + err.message;
    }

    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      executionTimeMs
    };
  }
}
