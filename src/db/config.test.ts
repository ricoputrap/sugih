import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getDatabaseConfig,
  validateConfig,
  isProduction,
  isTest,
  isDevelopment,
  getEnvironmentConfig,
  buildConnectionString,
  _resetConfigForTesting,
  type DatabaseConfig,
} from "./config";

// Store original environment
const originalEnv = { ...process.env };

describe("Database Configuration", () => {
  beforeEach(() => {
    // Reset configuration cache before each test
    _resetConfigForTesting();
    // Reset environment variables
    process.env = { ...originalEnv };
    // Clear relevant env vars for clean slate
    delete process.env.DATABASE_URL;
    delete process.env.PGHOST;
    delete process.env.PGPORT;
    delete process.env.PGUSER;
    delete process.env.PGPASSWORD;
    delete process.env.PGDATABASE;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    _resetConfigForTesting();
  });

  describe("getDatabaseConfig", () => {
    it("should parse DATABASE_URL correctly", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";

      const config = getDatabaseConfig();

      expect(config.url).toBe(
        "postgresql://user:pass@localhost:5432/sugih_dev",
      );
      expect(config.host).toBe("localhost");
      expect(config.port).toBe(5432);
      expect(config.user).toBe("user");
      expect(config.password).toBe("pass");
      expect(config.database).toBe("sugih_dev");
    });

    it("should handle DATABASE_URL without port", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@localhost/sugih_dev";

      const config = getDatabaseConfig();

      expect(config.port).toBe(5432); // Default port
      expect(config.host).toBe("localhost");
      expect(config.database).toBe("sugih_dev");
    });

    it("should handle DATABASE_URL with SSL", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev?ssl=true";

      const config = getDatabaseConfig();

      expect(config.ssl).toBe(true);
    });

    it("should apply development defaults", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";
      process.env.NODE_ENV = "development";

      const config = getDatabaseConfig();

      expect(config.connectionTimeout).toBe(5000);
      expect(config.idleTimeout).toBe(30000);
      expect(config.maxConnections).toBe(10);
      expect(config.ssl).toBe(false);
    });

    it("should apply production defaults", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";
      process.env.NODE_ENV = "production";

      const config = getDatabaseConfig();

      expect(config.connectionTimeout).toBe(10000);
      expect(config.idleTimeout).toBe(30000);
      expect(config.maxConnections).toBe(20);
      expect(config.ssl).toBe(true);
    });

    it("should apply test defaults", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";
      process.env.NODE_ENV = "test";

      const config = getDatabaseConfig();

      expect(config.connectionTimeout).toBe(5000);
      expect(config.idleTimeout).toBe(10000);
      expect(config.maxConnections).toBe(5);
      expect(config.ssl).toBe(false);
    });

    it("should build from individual environment variables when DATABASE_URL is not provided", () => {
      process.env.PGHOST = "remotehost";
      process.env.PGPORT = "5433";
      process.env.PGUSER = "remoteuser";
      process.env.PGPASSWORD = "remotepass";
      process.env.PGDATABASE = "remotedb";

      const config = getDatabaseConfig();

      expect(config.url).toContain("remotehost");
      expect(config.port).toBe(5433);
      expect(config.user).toBe("remoteuser");
      expect(config.database).toBe("remotedb");
    });

    it("should cache configuration after first call", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";

      const config1 = getDatabaseConfig();
      const config2 = getDatabaseConfig();

      expect(config1).toBe(config2); // Same instance
    });

    it("should throw error for invalid DATABASE_URL", () => {
      process.env.DATABASE_URL = "invalid-url";

      expect(() => getDatabaseConfig()).toThrow("Invalid database URL format");
    });

    it("should throw error when neither DATABASE_URL nor PGUSER/PGDATABASE are provided", () => {
      // All relevant env vars are already cleared in beforeEach

      expect(() => getDatabaseConfig()).toThrow(
        "Either DATABASE_URL or PGUSER and PGDATABASE must be provided",
      );
    });

    it("should throw error for invalid environment variables", () => {
      process.env.DATABASE_URL = "not-a-url";

      expect(() => getDatabaseConfig()).toThrow("Invalid database URL format");
    });
  });

  describe("buildConnectionString", () => {
    it("should build connection string with all parameters", () => {
      const connectionString = buildConnectionString({
        host: "localhost",
        port: 5432,
        user: "user",
        password: "pass",
        database: "mydb",
        ssl: true,
      });

      expect(connectionString).toBe(
        "postgresql://user:pass@localhost:5432/mydb?ssl=true",
      );
    });

    it("should build connection string without password", () => {
      const connectionString = buildConnectionString({
        host: "localhost",
        port: 5432,
        user: "user",
        database: "mydb",
      });

      expect(connectionString).toBe("postgresql://user@localhost:5432/mydb");
    });

    it("should build connection string with defaults", () => {
      const connectionString = buildConnectionString({
        user: "user",
        database: "mydb",
      });

      expect(connectionString).toBe("postgresql://user@localhost:5432/mydb");
    });

    it("should throw error when user is missing", () => {
      expect(() =>
        buildConnectionString({
          database: "mydb",
        }),
      ).toThrow("User and database are required to build connection string");
    });

    it("should throw error when database is missing", () => {
      expect(() =>
        buildConnectionString({
          user: "user",
        }),
      ).toThrow("User and database are required to build connection string");
    });
  });

  describe("validateConfig", () => {
    it("should validate correct configuration", () => {
      const result = validateConfig({
        url: "postgresql://user:pass@localhost:5432/mydb",
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate configuration with individual parameters", () => {
      const result = validateConfig({
        host: "localhost",
        database: "mydb",
        port: 5432,
        maxConnections: 10,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject configuration without url or host/database", () => {
      const result = validateConfig({
        user: "user",
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Either url or (host and database) must be provided",
      );
    });

    it("should reject invalid port numbers", () => {
      const result = validateConfig({
        port: 70000,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Port must be between 1 and 65535");
    });

    it("should reject invalid max connections", () => {
      const result = validateConfig({
        maxConnections: 0,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Max connections must be at least 1");
    });

    it("should reject low connection timeout", () => {
      const result = validateConfig({
        connectionTimeout: 500,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Connection timeout should be at least 1000ms",
      );
    });

    it("should reject low idle timeout", () => {
      const result = validateConfig({
        idleTimeout: 500,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Idle timeout should be at least 1000ms");
    });

    it("should return multiple validation errors", () => {
      const result = validateConfig({
        port: 70000,
        maxConnections: 0,
        connectionTimeout: 500,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
    });
  });

  describe("Environment Detection", () => {
    it("should detect production environment", () => {
      process.env.NODE_ENV = "production";
      expect(isProduction()).toBe(true);
      expect(isTest()).toBe(false);
      expect(isDevelopment()).toBe(false);
    });

    it("should detect test environment", () => {
      process.env.NODE_ENV = "test";
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(true);
      expect(isDevelopment()).toBe(false);
    });

    it("should detect development environment by default", () => {
      // NODE_ENV is already deleted in beforeEach
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
      expect(isDevelopment()).toBe(true);
    });

    it("should handle development environment explicitly", () => {
      process.env.NODE_ENV = "development";
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
      expect(isDevelopment()).toBe(true);
    });
  });

  describe("getEnvironmentConfig", () => {
    it("should return environment information", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";
      process.env.NODE_ENV = "development";

      const envConfig = getEnvironmentConfig();

      expect(envConfig.environment).toBe("development");
      expect(envConfig.isProduction).toBe(false);
      expect(envConfig.isTest).toBe(false);
      expect(envConfig.isDevelopment).toBe(true);
      expect(envConfig.config).toBeDefined();
      expect(envConfig.config.url).toBe(
        "postgresql://user:pass@localhost:5432/sugih_dev",
      );
    });

    it("should use development as default environment", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";
      // NODE_ENV is already deleted in beforeEach

      const envConfig = getEnvironmentConfig();

      expect(envConfig.environment).toBe("development");
      expect(envConfig.isDevelopment).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty password in connection string", () => {
      process.env.DATABASE_URL = "postgresql://user@localhost:5432/sugih_dev";

      const config = getDatabaseConfig();

      expect(config.password).toBe("");
      expect(config.url).toBe("postgresql://user@localhost:5432/sugih_dev");
    });

    it("should handle port as string in environment variables", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";
      process.env.PGPORT = "5433";

      const config = getDatabaseConfig();

      expect(config.port).toBe(5432); // Uses DATABASE_URL port, not PGPORT
    });

    it("should handle IPv6 addresses", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@[::1]:5432/sugih_dev";

      const config = getDatabaseConfig();

      expect(config.host).toBe("[::1]");
      expect(config.port).toBe(5432);
    });

    it("should handle special characters in password", () => {
      const encodedPassword = encodeURIComponent("pass@word!");
      process.env.DATABASE_URL = `postgresql://user:${encodedPassword}@localhost:5432/sugih_dev`;

      const config = getDatabaseConfig();

      expect(config.password).toBe("pass@word!");
    });
  });

  describe("Configuration Persistence", () => {
    it("should maintain configuration state across multiple calls", () => {
      process.env.DATABASE_URL =
        "postgresql://user:pass@localhost:5432/sugih_dev";

      const config1 = getDatabaseConfig();

      // Change environment variable
      process.env.DATABASE_URL =
        "postgresql://different:config@localhost:5432/sugih_dev";

      const config2 = getDatabaseConfig();

      // Should return the same cached configuration
      expect(config1).toBe(config2);
      expect(config1.url).toBe(
        "postgresql://user:pass@localhost:5432/sugih_dev",
      );
    });
  });
});
