import { defineConfig } from '@playwright/test';

/**
 * Task #286 (B12) — Kiosk Vardiya Kapanış E2E Test Suite
 *
 * API-level testing only (no browser). Tests assume the dev server is already
 * running on http://localhost:5000 (workflow: "Start application").
 *
 * Run: npx playwright test --config=playwright.config.ts
 * Or:  npx playwright test tests/e2e/kiosk-shift-closure.spec.ts
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5000',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
    ignoreHTTPSErrors: true,
  },
});
