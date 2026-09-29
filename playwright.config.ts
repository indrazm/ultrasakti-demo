import { defineConfig, devices } from '@playwright/test'

const baseUse = {
  ...devices['Desktop Chrome'],
  headless: true,
  screenshot: 'only-on-failure' as const,
  video: process.env.PLAYWRIGHT_VIDEO === 'on' ? ('on' as const) : ('retain-on-failure' as const),
  trace: 'on-first-retry' as const,
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results/e2e',
  use: baseUse,
  projects: [
    {
      name: 'admin',
      testMatch: '**/admin.spec.ts',
      use: { ...baseUse, baseURL: 'http://127.0.0.1:4173' },
    },
    {
      name: 'platform',
      testMatch: '**/platform.spec.ts',
      use: { ...baseUse, baseURL: 'http://127.0.0.1:4174' },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @ultrasakti/admin e2e:serve',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @ultrasakti/platform e2e:serve',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
