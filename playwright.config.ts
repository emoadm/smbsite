import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false, // sequential to keep rate-limit tests deterministic
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'chromium-tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'chromium-iphone-se',
      use: { ...devices['iPhone SE'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'chromium-samsung-a',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } },
    },
  ],
  // Always boot a local server. In CI, `pnpm build` has already produced `.next/standalone/`
  // so we boot the standalone server entry directly (Next.js refuses `next start` under
  // `output: 'standalone'`); locally `pnpm dev` keeps HMR. All required env vars
  // (`DATABASE_URL`, `AUTH_SECRET`, `OTP_HMAC_KEY`, Turnstile keys, etc.) are inherited
  // from the GitHub Actions job-level `env:` block.
  webServer: {
    command: process.env.CI ? 'pnpm start:standalone' : 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
