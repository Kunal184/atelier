import { CodeRunner } from './CodeRunner';

// Singleton instance to prevent multiple heavy WASM instantiations
let pyodideInstance = null;
let loadPromise = null;

export class PyodideRunner extends CodeRunner {
  constructor() {
    super('python');
  }

  // Dynamically load Pyodide script from CDN if not already loaded
  async init() {
    if (pyodideInstance) return pyodideInstance;

    if (!loadPromise) {
      loadPromise = new Promise(async (resolve, reject) => {
        try {
          if (!window.loadPyodide) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
            script.async = true;
            document.body.appendChild(script);

            await new Promise((res, rej) => {
              script.onload = res;
              script.onerror = rej;
            });
          }

          const pyodide = await window.loadPyodide();
          pyodideInstance = pyodide;
          resolve(pyodide);
        } catch (err) {
          reject(err);
        }
      });
    }

    return loadPromise;
  }

  // Run Python code and capture standard output & errors
  async run(code) {
    const pyodide = await this.init();
    const startTime = performance.now();

    let stdout = '';
    let stderr = '';

    pyodide.setStdout({
      batched: (str) => {
        stdout += str + '\n';
      },
    });

    pyodide.setStderr({
      batched: (str) => {
        stderr += str + '\n';
      },
    });

    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      stderr += err.message;
    }

    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      executionTimeMs,
    };
  }
}
