// FunCube 자동 테스트 설정. 실행: npm test
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8765',
    browserName: 'chromium',
  },
  webServer: {
    command: 'node tests/server.js',
    url: 'http://127.0.0.1:8765/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
