import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Polyfill ResizeObserver for radix-ui components in tests
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Polyfill pointer capture methods for radix-ui select in tests
if (typeof Element.prototype.hasPointerCapture !== "function") {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}
if (typeof Element.prototype.setPointerCapture !== "function") {
  Element.prototype.setPointerCapture = function () {};
}
if (typeof Element.prototype.releasePointerCapture !== "function") {
  Element.prototype.releasePointerCapture = function () {};
}

// Polyfill scrollIntoView for jsdom
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function () {};
}

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
