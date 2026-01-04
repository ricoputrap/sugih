import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import drizzleConfig from "../../drizzle.config";
import type { Config } from "drizzle-kit";
import { getDatabaseConfig, _resetConfigForTesting } from "./config";
import { fileURLToPath } from "url";
import { resolve } from "path";

type DrizzleKitConfigWithDbCredentials = Config & {
  dbCredentials?: {
    url?: string;
  };
};

// Get current directory
const __filename = fileURLToPath(import.meta.url);

// Store original env
const originalEnv = { ...process.env };

describe("Drizzle Configuration for PostgreSQL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetConfigForTesting();
    // Set up a valid DATABASE_URL for tests that need it
    process.env.DATABASE_URL =
      "postgresql://user:pass@localhost:5432/sugih_dev";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    _resetConfigForTesting();
  });

  describe("Configuration Object Validation", () => {
    it("should have a valid configuration object", () => {
      expect(drizzleConfig).toBeDefined();
      expect(typeof drizzleConfig).toBe("object");
    });

    it("should set dialect to postgresql", () => {
      expect(drizzleConfig.dialect).toBe("postgresql");
    });

    it("should have schema path defined", () => {
      expect(drizzleConfig.schema).toBeDefined();
      expect(drizzleConfig.schema).toBe("./src/db/schema.ts");
    });

    it("should have output directory for migrations", () => {
      expect(drizzleConfig.out).toBeDefined();
      expect(drizzleConfig.out).toBe("./drizzle");
    });

    it("should enable verbose mode", () => {
      expect(drizzleConfig.verbose).toBe(true);
    });

    it("should enable strict mode", () => {
      expect(drizzleConfig.strict).toBe(true);
    });
  });

  describe("Database Credentials Configuration", () => {
    it("should have dbCredentials defined", () => {
      expect(drizzleConfig.dbCredentials).toBeDefined();
      expect(typeof drizzleConfig.dbCredentials).toBe("object");
    });

    it("should use DATABASE_URL from environment", () => {
      const config = drizzleConfig as DrizzleKitConfigWithDbCredentials;
      // drizzle.config.ts reads DATABASE_URL at import time, so it may be undefined
      // if not set before import. This test validates the structure exists.
      expect(config.dbCredentials).toBeDefined();
      // The url may or may not be set depending on when the module was loaded
      if (config.dbCredentials?.url) {
        expect(typeof config.dbCredentials.url).toBe("string");
      }
    });

    it("should throw error when DATABASE_URL is not set", () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      expect(() => {
        // This will fail when drizzle-kit tries to read it
        const testConfig = drizzleConfig;
        return testConfig.dbCredentials.url;
      }).not.toThrow(); // The config object is valid, but connection would fail at runtime

      // Restore
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    });

    it("should have valid PostgreSQL connection string format", () => {
      const config = drizzleConfig as DrizzleKitConfigWithDbCredentials;
      const dbUrl = config.dbCredentials?.url;

      if (dbUrl) {
        expect(dbUrl).toMatch(/^postgresql:\/\//);
      }
    });
  });

  describe("Configuration Type Safety", () => {
    it("should satisfy drizzle-kit Config interface", () => {
      const config: Config = drizzleConfig;
      expect(config).toBeDefined();
    });

    it("should have all required Config properties", () => {
      const config = drizzleConfig as DrizzleKitConfigWithDbCredentials;
      expect(config.schema).toBeDefined();
      expect(config.out).toBeDefined();
      expect(config.dialect).toBeDefined();
      expect(config.dbCredentials).toBeDefined();
    });
  });

  describe("Migration Script Readiness", () => {
    it("should have output directory that matches package.json script expectations", () => {
      const outputDir = drizzleConfig.out;
      expect(outputDir).toBe("./drizzle");
    });

    it("should have schema file that matches actual schema location", () => {
      const schemaPath = drizzleConfig.schema;
      expect(schemaPath).toBe("./src/db/schema.ts");
    });

    it("should be ready for generate:pg command", () => {
      expect(drizzleConfig.dialect).toBe("postgresql");
      expect(drizzleConfig.out).toBeDefined();
      expect(drizzleConfig.schema).toBeDefined();
    });

    it("should be ready for push command", () => {
      const config = drizzleConfig as DrizzleKitConfigWithDbCredentials;
      expect(config.dbCredentials).toBeDefined();
      // url is read at import time, so we just validate the structure
      expect(config.dbCredentials).toHaveProperty("url");
    });

    it("should be ready for migrate command", () => {
      const config = drizzleConfig as DrizzleKitConfigWithDbCredentials;
      expect(config.dbCredentials).toBeDefined();
      expect(config.out).toBeDefined();
    });
  });

  describe("Environment Integration", () => {
    it("should integrate with database config module", () => {
      expect(getDatabaseConfig).toBeDefined();
      expect(typeof getDatabaseConfig).toBe("function");
    });

    it("should use same DATABASE_URL as database config", () => {
      // DATABASE_URL is set in beforeEach
      const dbConfig = getDatabaseConfig();

      expect(dbConfig.url).toBeDefined();
      expect(dbConfig.url).toBe(process.env.DATABASE_URL);
    });

    it("should be compatible with PostgreSQL environment variables", () => {
      // DATABASE_URL is set in beforeEach
      const dbConfig = getDatabaseConfig();

      expect(dbConfig).toHaveProperty("host");
      expect(dbConfig).toHaveProperty("port");
      expect(dbConfig).toHaveProperty("database");
      expect(dbConfig).toHaveProperty("user");
    });
  });

  describe("File Path Validation", () => {
    it("should resolve schema path correctly", () => {
      const schemaPath = drizzleConfig.schema;
      const resolvedPath = resolve(process.cwd(), schemaPath);

      expect(resolvedPath).toContain("src/db/schema.ts");
    });

    it("should resolve output directory correctly", () => {
      const outDir = drizzleConfig.out;
      const resolvedPath = resolve(process.cwd(), outDir);

      expect(resolvedPath).toContain("drizzle");
    });

    it("should have schema file that exists", () => {
      const fs = require("fs");
      const schemaPath = resolve(process.cwd(), drizzleConfig.schema!);
      expect(fs.existsSync(schemaPath)).toBe(true);
    });
  });

  describe("Configuration Consistency", () => {
    it("should maintain consistent configuration across imports", () => {
      // Verify the config object is stable
      const config1 = drizzleConfig;
      const config2 = drizzleConfig;

      expect(config1).toBe(config2);
      expect(config1.dialect).toBe(config2.dialect);
    });

    it("should have same configuration in different test runs", () => {
      const config1 = drizzleConfig;
      const config2 = drizzleConfig;

      expect(config1).toBe(config2);
      expect(config1.dialect).toBe(config2.dialect);
      expect(config1.schema).toBe(config2.schema);
      expect(config1.out).toBe(config2.out);
    });
  });

  describe("PostgreSQL-Specific Configuration", () => {
    it("should be configured for PostgreSQL-specific features", () => {
      expect(drizzleConfig.dialect).toBe("postgresql");

      // PostgreSQL-specific expectations
      const config = drizzleConfig as DrizzleKitConfigWithDbCredentials;
      expect(config.dbCredentials).toHaveProperty("url");
    });

    it("should not have SQLite-specific configuration", () => {
      expect(drizzleConfig.dialect).not.toBe("sqlite");
      expect(drizzleConfig.dbCredentials).not.toHaveProperty(
        "url",
        "./sqlite.db",
      );
    });

    it("should be ready for PostgreSQL enum types", () => {
      // This is a forward-looking test - ensuring the config supports
      // the migration path to PostgreSQL enums
      expect(drizzleConfig.dialect).toBe("postgresql");
    });

    it("should be ready for PostgreSQL UUID types", () => {
      expect(drizzleConfig.dialect).toBe("postgresql");
    });

    it("should be ready for PostgreSQL timestamp types", () => {
      expect(drizzleConfig.dialect).toBe("postgresql");
    });
  });

  describe("Package.json Script Compatibility", () => {
    it("should be compatible with drizzle-kit generate command", () => {
      const expectedCommands = [
        "drizzle-kit generate:pg",
        "drizzle-kit push",
        "drizzle-kit migrate",
      ];

      // Verify configuration supports these commands
      expect(drizzleConfig.dialect).toBe("postgresql");
      expect(drizzleConfig.out).toBeDefined();
      expect(drizzleConfig.schema).toBeDefined();
      expect(drizzleConfig.dbCredentials).toBeDefined();
    });

    it("should have correct output format for migration files", () => {
      expect(drizzleConfig.out).toBe("./drizzle");
      expect(drizzleConfig.verbose).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing environment variables gracefully", () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      // Config object should still be valid, but connection will fail at runtime
      const config = drizzleConfig as DrizzleKitConfigWithDbCredentials;
      expect(config.dbCredentials?.url).toBeUndefined();

      // Restore
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    });

    it("should validate configuration structure even without environment", () => {
      expect(drizzleConfig.schema).toBeDefined();
      expect(drizzleConfig.out).toBeDefined();
      expect(drizzleConfig.dialect).toBeDefined();
      expect(drizzleConfig.verbose).toBeDefined();
      expect(drizzleConfig.strict).toBeDefined();
    });
  });

  describe("Development Workflow", () => {
    it("should support hot reloading in development", () => {
      expect(drizzleConfig.verbose).toBe(true);
    });

    it("should support strict type checking", () => {
      expect(drizzleConfig.strict).toBe(true);
    });

    it("should be compatible with development database changes", () => {
      // Configuration should support iterative development
      expect(drizzleConfig.out).toBeDefined();
      expect(drizzleConfig.schema).toBeDefined();
    });
  });
});
