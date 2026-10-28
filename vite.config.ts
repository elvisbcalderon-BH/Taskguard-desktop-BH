import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { execSync } from 'child_process';

let commitHash = 'v1.1';
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  // fallback
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __GIT_COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
});
