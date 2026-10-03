import React, { useEffect, useState } from 'react';

export function usePyodide() {
  const [pyodide, setPyodide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPyodideEngine() {
      try {
        if (!window.loadPyodide) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
          script.async = true;
          document.body.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Pyodide script'));
          });
        }

        const pyodideInstance = await window.loadPyodide();
        if (isMounted) {
          setPyodide(pyodideInstance);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Pyodide initialization error:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadPyodideEngine();

    return () => {
      isMounted = false;
    };
  }, []);

  const runPythonCode = async (code) => {
    if (!pyodide) {
      throw new Error('Pyodide engine is still loading...');
    }

    try {
      // Capture python stdout print outputs
      pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
      `);

      await pyodide.runPythonAsync(code);

      const stdout = pyodide.runPython('sys.stdout.getvalue()');
      return stdout || 'Code executed successfully (no output).';
    } catch (err) {
      throw new Error(err.message);
    }
  };

  return { pyodide, loading, error, runPythonCode };
}
