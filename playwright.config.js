const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: 'tests',
  use: { ...devices['iPhone 14'], defaultBrowserType: 'chromium', channel: 'chrome', baseURL: process.env.BASE || 'http://127.0.0.1:4455' },
  webServer: process.env.BASE ? undefined : { command: 'python3 -m http.server 4455 --directory site --bind 127.0.0.1', url: 'http://127.0.0.1:4455/index.html', reuseExistingServer: true },
});
