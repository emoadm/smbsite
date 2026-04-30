import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    env: {
      // Loaded explicitly so unit tests get test keys without needing dev .env
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA',
      OTP_HMAC_KEY: 'test-hmac-key-do-not-use-in-prod-32bytes!',
      AUTH_SECRET: 'test-auth-secret-do-not-use-in-prod-32b!',
      LOG_LEVEL: 'silent',
    },
    coverage: { reporter: ['text', 'lcov'], exclude: ['tests/**', '**/*.config.*'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
