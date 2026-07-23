import { defineConfig } from 'vitest/config';

// Backend (Express API) tests run in a Node environment, separate from the
// Angular browser tests executed by `ng test`.
export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: ['src/server.spec.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
