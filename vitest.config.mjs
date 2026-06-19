import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 只跑单元测试；e2e 由 Playwright（npm run test:e2e）单独运行
    include: ['tests/unit/**/*.test.mjs'],
  },
})
