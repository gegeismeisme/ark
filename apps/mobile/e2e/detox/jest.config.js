/** @type {import('jest').Config} */
module.exports = {
  rootDir: "../../../..",
  testMatch: ["<rootDir>/apps/mobile/e2e/detox/**/*.test.ts"],
  testEnvironment: "node",
  setupFilesAfterEnv: ["detox/runners/jest/adapter"],
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  testTimeout: 180000,
};
