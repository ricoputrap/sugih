/**
 * PostgreSQL Database Configuration
 *
 * Handles connection settings, environment variables, and configuration
 * for the Sugih personal finance application using PostgreSQL.
 */

import { z } from "zod";

// Environment variable schema validation
const EnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  PGHOST: z.string().optional(),
  PGPORT: z
    .string()
    .transform((val) => (val ? parseInt(val, 10) : 5432))
    .optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  PORT: z
    .string()
    .transform((val) => (val ? parseInt(val, 10) : 3000))
    .optional(),
});

// Database connection configuration
export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
  connectionTimeout: number;
  idleTimeout: number;
  maxConnections: number;
}

// Check if a string is a valid PostgreSQL URL
function isValidPostgresUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

// Parse connection string
function parseConnectionString(url: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
} {
  if (!isValidPostgresUrl(url)) {
    throw new Error(`Invalid database URL format: ${url}`);
  }

  const parsedUrl = new URL(url);

  // Handle IPv6 addresses (hostname removes the brackets)
  const host = parsedUrl.hostname;

  return {
    host,
    port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432,
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.slice(1), // Remove leading slash
    ssl: parsedUrl.searchParams.get("ssl") === "true",
  };
}

// Build connection string from individual components
export function buildConnectionString(config: Partial<DatabaseConfig>): string {
  const {
    host = "localhost",
    port = 5432,
    user,
    password,
    database,
    ssl = false,
  } = config;

  if (!user) {
    throw new Error(
      "User and database are required to build connection string",
    );
  }

  if (!database) {
    throw new Error(
      "User and database are required to build connection string",
    );
  }

  const auth = password ? `${user}:${password}` : user;
  const sslParam = ssl ? "?ssl=true" : "";

  return `postgresql://${auth}@${host}:${port}/${database}${sslParam}`;
}

// Default configuration for different environments
const getDefaultConfig = (
  env: string,
): {
  connectionTimeout: number;
  idleTimeout: number;
  maxConnections: number;
  ssl: boolean;
} => {
  switch (env) {
    case "production":
      return {
        connectionTimeout: 10000, // 10 seconds
        idleTimeout: 30000, // 30 seconds
        maxConnections: 20,
        ssl: true,
      };
    case "test":
      return {
        connectionTimeout: 5000, // 5 seconds
        idleTimeout: 10000, // 10 seconds
        maxConnections: 5,
        ssl: false,
      };
    default: // development
      return {
        connectionTimeout: 5000, // 5 seconds
        idleTimeout: 30000, // 30 seconds
        maxConnections: 10,
        ssl: false,
      };
  }
};

// Validate and parse environment variables
function parseEnvironmentVariables(): DatabaseConfig {
  const envVars = {
    DATABASE_URL: process.env.DATABASE_URL,
    PGHOST: process.env.PGHOST,
    PGPORT: process.env.PGPORT,
    PGUSER: process.env.PGUSER,
    PGPASSWORD: process.env.PGPASSWORD,
    PGDATABASE: process.env.PGDATABASE,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  };

  const validatedEnv = EnvSchema.parse(envVars);
  const environment = validatedEnv.NODE_ENV || "development";
  const defaults = getDefaultConfig(environment);

  // If DATABASE_URL is provided, use it as the primary source
  if (validatedEnv.DATABASE_URL) {
    const parsed = parseConnectionString(validatedEnv.DATABASE_URL);

    // SSL from URL takes precedence over environment default
    const ssl = parsed.ssl || defaults.ssl;

    return {
      url: validatedEnv.DATABASE_URL,
      host: parsed.host,
      port: parsed.port,
      user: parsed.user,
      password: parsed.password,
      database: parsed.database,
      ssl,
      connectionTimeout: defaults.connectionTimeout,
      idleTimeout: defaults.idleTimeout,
      maxConnections: defaults.maxConnections,
    };
  }

  // Otherwise, build from individual environment variables
  if (!validatedEnv.PGUSER || !validatedEnv.PGDATABASE) {
    throw new Error(
      "Either DATABASE_URL or PGUSER and PGDATABASE must be provided",
    );
  }

  const host = validatedEnv.PGHOST || "localhost";
  const port = validatedEnv.PGPORT || 5432;
  const user = validatedEnv.PGUSER;
  const password = validatedEnv.PGPASSWORD || "";
  const database = validatedEnv.PGDATABASE;

  const connectionString = buildConnectionString({
    host,
    port,
    user,
    password,
    database,
    ssl: false,
  });

  return {
    url: connectionString,
    host,
    port,
    user,
    password,
    database,
    ssl: false,
    connectionTimeout: defaults.connectionTimeout,
    idleTimeout: defaults.idleTimeout,
    maxConnections: defaults.maxConnections,
  };
}

// Singleton configuration instance
let cachedConfig: DatabaseConfig | null = null;

/**
 * Reset the cached configuration (for testing purposes)
 * @internal
 */
export function _resetConfigForTesting(): void {
  cachedConfig = null;
}

/**
 * Get the database configuration
 *
 * This function validates environment variables and returns a configuration
 * object that can be used to establish PostgreSQL connections.
 *
 * @returns {DatabaseConfig} Validated database configuration
 * @throws {Error} If environment variables are invalid or missing
 */
export function getDatabaseConfig(): DatabaseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = parseEnvironmentVariables();
  return cachedConfig;
}

/**
 * Validate database configuration without throwing
 *
 * @param config - Configuration to validate
 * @returns {Object} Validation result with isValid flag and errors
 */
export function validateConfig(config: Partial<DatabaseConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.url && (!config.host || !config.database)) {
    errors.push("Either url or (host and database) must be provided");
  }

  if (config.port !== undefined && (config.port < 1 || config.port > 65535)) {
    errors.push("Port must be between 1 and 65535");
  }

  if (config.maxConnections !== undefined && config.maxConnections < 1) {
    errors.push("Max connections must be at least 1");
  }

  if (
    config.connectionTimeout !== undefined &&
    config.connectionTimeout < 1000
  ) {
    errors.push("Connection timeout should be at least 1000ms");
  }

  if (config.idleTimeout !== undefined && config.idleTimeout < 1000) {
    errors.push("Idle timeout should be at least 1000ms");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return !isProduction() && !isTest();
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig(): {
  environment: string;
  isProduction: boolean;
  isTest: boolean;
  isDevelopment: boolean;
  config: DatabaseConfig;
} {
  const config = getDatabaseConfig();

  return {
    environment: process.env.NODE_ENV || "development",
    isProduction: isProduction(),
    isTest: isTest(),
    isDevelopment: isDevelopment(),
    config,
  };
}
