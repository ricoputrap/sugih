import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// extends Vitest's matcher and cleanup after each test case
expect.extend(matchers);

// runs a cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
vi.mock("./lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/sugih_test",
    NODE_ENV: "test",
  },
}));

// Mock Drizzle database connection for tests
vi.mock("../db/drizzle-client", () => {
  return {
    getDb: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
      execute: vi.fn().mockResolvedValue({ rows: [] }),
      transaction: vi.fn().mockImplementation(async (cb) => {
        const tx = {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([]),
            }),
          }),
          execute: vi.fn().mockResolvedValue({ rows: [] }),
        };
        return cb(tx as any);
      }),
    })),
    getPool: vi.fn(() => ({
      connect: vi.fn(),
      query: vi.fn(),
      end: vi.fn(),
    })),
    closeDb: vi.fn(),
    healthCheck: vi.fn(() => Promise.resolve(true)),
    // Re-exported Drizzle utilities
    sql: vi.fn(),
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    desc: vi.fn(),
    asc: vi.fn(),
    isNull: vi.fn(),
    isNotNull: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    gt: vi.fn(),
    lt: vi.fn(),
    inArray: vi.fn(),
    notInArray: vi.fn(),
    like: vi.fn(),
    notLike: vi.fn(),
    between: vi.fn(),
    exists: vi.fn(),
    notExists: vi.fn(),
  };
});

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
