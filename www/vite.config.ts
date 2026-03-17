import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/energy-unit-converter/' : '/',
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    target: 'esnext',
  },
  test: {
    environment: 'node',
  },
});
