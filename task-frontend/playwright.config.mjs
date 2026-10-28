import { defineConfig } from '@playwright/test'

// Browser tests against the built frontend (dist/) and the mock API in e2e/mock-server.mjs.
// Run with: npm run test:e2e
// The mock keeps state across a test file, so files run one after another, each from a fresh reset.
const PORT = 4999

export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  // A spec file is one test with many steps; together they need more than the default 30 s.
  timeout: 180_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    // Locally a system Chromium can be used instead of `npx playwright install chromium`.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: `node e2e/mock-server.mjs dist ${PORT}`,
    url: `http://localhost:${PORT}/api/__state`,
    reuseExistingServer: false,
  },
})
