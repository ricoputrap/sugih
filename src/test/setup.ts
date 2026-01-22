import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// extends Vitest's matcher and cleanup after each test case
expect.extend(matchers);

// runs a cleanup after each test case
afterEach(() => {
  cleanup();
});

// Note: Database mocking is done at the file level for each test suite
// This allows unit tests to mock the database while integration tests
// can access the real database

// Suppress console warnings during tests
const originalWarn = console.warn;
vi.stubGlobal("console", {
  ...console,
  warn: (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning:") || args[0].includes("ReactDOM.render"))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  },
});
