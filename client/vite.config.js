import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      external: ['monaco-editor/esm/vs/editor/editor.api.js']
    }
  }
})
