import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Produces a single self-contained index.html (all JS + CSS inlined, no worker
// chunk) suitable for hosting as an Artifact.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-single', cssCodeSplit: false, assetsInlineLimit: 100000000 },
});
