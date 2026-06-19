import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // 串行单 worker：本套件共享同一个临时站点目录，避免并行重建/清理产生竞态
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
