import { defineConfig } from 'vite'
import { resolve } from 'path'

// Separate build config for content-script only.
// Content scripts run in an isolated world and CANNOT use ES module imports.
// They must be a single self-contained IIFE file with all dependencies inlined.
export default defineConfig({
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'src/content-script.js'),
      output: {
        format: 'iife',
        entryFileNames: 'src/content-script.js',
        inlineDynamicImports: true
      }
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't wipe dist — we're adding to it
    sourcemap: true
  }
})
