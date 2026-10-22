import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'monaco-editor/esm/vs/editor/editor.api.js': path.resolve(
        import.meta.dirname,
        'node_modules/monaco-editor/esm/vs/editor/editor.api.js'
      ),
      'monaco-editor': path.resolve(import.meta.dirname, 'node_modules/monaco-editor'),
    },
  },
});

