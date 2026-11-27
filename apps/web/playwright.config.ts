import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // The exported pages carry a CSP whose script hashes are computed at build
    // time. Next injects one inline script after load that those hashes cannot
    // cover, which blocks hydration in this test browser. These tests check the
    // rendered markup for accessibility, not the CSP, so bypass it here.
    bypassCSP: true,
  },
  webServer: {
    command: `node e2e/static-server.mjs out ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
