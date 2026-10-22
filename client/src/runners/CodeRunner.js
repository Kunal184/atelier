// Abstract Base Class for Code Runners
// Defines the contract that every execution strategy must implement.
export class CodeRunner {
  constructor(language) {
    this.language = language;
  }

  // Initialize any necessary runtimes, WASM engines, or remote workers
  async init() {
    throw new Error('init() must be implemented by subclass');
  }

  // Execute code string and return standardized output
  // Expected return format: { stdout: string, stderr: string, executionTimeMs: number }
  async run(code) {
    throw new Error('run(code) must be implemented by subclass');
  }
}
