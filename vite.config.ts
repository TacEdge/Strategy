import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// SINGLE_FILE=1 inlines every asset (fonts, logos) as data URIs so the
// build can be merged into one self-contained page for artifact hosting.
export default defineConfig({
  plugins: [react()],
  // Relative base so the build works at any mount path (GitHub Pages
  // serves under /Strategy/). Hash routing keeps navigation server-free.
  base: './',
  build: {
    assetsInlineLimit: process.env.SINGLE_FILE ? 100_000_000 : 4096,
  },
});
