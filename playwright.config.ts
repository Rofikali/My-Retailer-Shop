import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // these tests share one dev-server database - run serially
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: process.env.CI
    ? {
        command: 'node .output/server/index.mjs',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120_000
      }
    : undefined,
  // Assumes `pnpm run dev` (or a production build) is already running against a
  // database seeded via `pnpm run db:seed` - see README.md "Running tests".
  // Deliberately NOT using webServer: auto-start here, because these tests need real
  // seeded data (an owner login), not a bare fresh server.
})
