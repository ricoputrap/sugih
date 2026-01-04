import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  convertPlaceholders,
  convertNamedParams,
  buildInsert,
  buildUpdate,
  buildDelete,
  buildSelect,
  buildBatchInsert,
  buildUpsert,
  buildWhereClause,
  type QueryResult,
  type InsertResult,
  type ModifyResult,
} from "./helpers";

describe("PostgreSQL Query Helpers", () => {
  describe("convertPlaceholders", () => {
    it("should convert single ? placeholder to $1", () => {
      const sql = "SELECT * FROM users WHERE id = ?";
      const result = convertPlaceholders(sql);
      expect(result).toBe("SELECT * FROM users WHERE id = $1");
    });

    it("should convert multiple ? placeholders to $1, $2, etc.", () => {
      const sql = "SELECT * FROM users WHERE id = ? AND name = ? AND active = ?";
      const result = convertPlaceholders(sql);
      expect(result).toBe(
        "SELECT * FROM users WHERE id = $1 AND name = $2 AND active = $3",
      );
    });

    it("should handle INSERT statement with multiple values", () => {
      const sql = "INSERT INTO users (name, email, age) VALUES (?, ?, ?)";
      const result = convertPlaceholders(sql);
      expect(result).toBe(
        "INSERT INTO users (name, email, age) VALUES ($1, $2, $3)",
      );
    });

    it("should handle UPDATE statement with WHERE clause", () => {
      const sql = "UPDATE users SET name = ?, email = ? WHERE id = ?";
      const result = convertPlaceholders(sql);
      expect(result).toBe(
        "UPDATE users SET name = $1, email = $2 WHERE id = $3",
      );
    });

    it("should return unchanged SQL when no placeholders", () => {
      const sql = "SELECT * FROM users";
      const result = convertPlaceholders(sql);
      expect(result).toBe("SELECT * FROM users");
    });

    it("should handle complex query with subquery", () => {
      const sql =
        "SELECT * FROM users WHERE department_id IN (SELECT id FROM departments WHERE name = ?) AND role = ?";
      const result = convertPlaceholders(sql);
      expect(result).toBe(
        "SELECT * FROM users WHERE department_id IN (SELECT id FROM departments WHERE name = $1) AND role = $2",
      );
    });

    it("should handle many placeholders", () => {
      const placeholders = Array(15).fill("?").join(", ");
      const sql = `INSERT INTO table1 VALUES (${placeholders})`;
      const result = convertPlaceholders(sql);

      const expected = Array.from({ length: 15 }, (_, i) => `$${i + 1}`).join(
        ", ",
      );
      expect(result).toBe(`INSERT INTO table1 VALUES (${expected})`);
    });
  });

  describe("convertNamedParams", () => {
    it("should convert single named parameter", () => {
      const sql = "SELECT * FROM users WHERE id = :id";
      const params = { id: 1 };
      const result = convertNamedParams(sql, params);

      expect(result.sql).toBe("SELECT * FROM users WHERE id = $1");
      expect(result.params).toEqual([1]);
    });

    it("should convert multiple named parameters", () => {
      const sql = "SELECT * FROM users WHERE id = :id AND name = :name";
      const params = { id: 1, name: "John" };
      const result = convertNamedParams(sql, params);

      expect(result.sql).toBe(
        "SELECT * FROM users WHERE id = $1 AND name = $2",
      );
      expect(result.params).toEqual([1, "John"]);
    });

    it("should handle duplicate named parameters", () => {
      const sql =
        "SELECT * FROM users WHERE created_by = :userId OR updated_by = :userId";
      const params = { userId: 5 };
      const result = convertNamedParams(sql, params);

      expect(result.sql).toBe(
        "SELECT * FROM users WHERE created_by = $1 OR updated_by = $1",
      );
      expect(result.params).toEqual([5]);
    });

    it("should handle parameters with underscores", () => {
      const sql = "SELECT * FROM users WHERE first_name = :first_name";
      const params = { first_name: "John" };
      const result = convertNamedParams(sql, params);

      expect(result.sql).toBe("SELECT * FROM users WHERE first_name = $1");
      expect(result.params).toEqual(["John"]);
    });

    it("should handle parameters with numbers", () => {
      const sql = "SELECT * FROM users WHERE col1 = :param1 AND col2 = :param2";
      const params = { param1: "a", param2: "b" };
      const result = convertNamedParams(sql, params);

      expect(result.sql).toBe(
        "SELECT * FROM users WHERE col1 = $1 AND col2 = $2",
      );
      expect(result.params).toEqual(["a", "b"]);
    });

    it("should throw error for missing parameter", () => {
      const sql = "SELECT * FROM users WHERE id = :id AND name = :name";
      const params = { id: 1 };

      expect(() => convertNamedParams(sql, params)).toThrow(
        "Named parameter ':name' not found in params object",
      );
    });

    it("should handle INSERT statement with named params", () => {
      const sql =
        "INSERT INTO users (name, email) VALUES (:name, :email) RETURNING id";
      const params = { name: "John", email: "john@example.com" };
      const result = convertNamedParams(sql, params);

      expect(result.sql).toBe(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
      );
      expect(result.params).toEqual(["John", "john@example.com"]);
    });

    it("should handle various value types", () => {
      const sql =
        "SELECT * FROM data WHERE str = :str AND num = :num AND bool = :bool AND nullable = :nullable";
      const params = {
        str: "text",
        num: 42,
        bool: true,
        nullable: null,
      };
      const result = convertNamedParams(sql, params);

      expect(result.sql).toBe(
        "SELECT * FROM data WHERE str = $1 AND num = $2 AND bool = $3 AND nullable = $4",
      );
      expect(result.params).toEqual(["text", 42, true, null]);
    });
  });

  describe("buildInsert", () => {
    it("should build basic INSERT statement", () => {
      const { sql, params } = buildInsert("users", {
        name: "John",
        email: "john@example.com",
      });

      expect(sql).toBe(
        'INSERT INTO "users" ("name", "email") VALUES ($1, $2) RETURNING "id"',
      );
      expect(params).toEqual(["John", "john@example.com"]);
    });

    it("should handle single column insert", () => {
      const { sql, params } = buildInsert("categories", { name: "Test" });

      expect(sql).toBe(
        'INSERT INTO "categories" ("name") VALUES ($1) RETURNING "id"',
      );
      expect(params).toEqual(["Test"]);
    });

    it("should handle custom returning column", () => {
      const { sql, params } = buildInsert(
        "users",
        { name: "John" },
        "user_id",
      );

      expect(sql).toBe(
        'INSERT INTO "users" ("name") VALUES ($1) RETURNING "user_id"',
      );
      expect(params).toEqual(["John"]);
    });

    it("should handle multiple returning columns", () => {
      const { sql, params } = buildInsert("users", { name: "John" }, [
        "id",
        "created_at",
      ]);

      expect(sql).toBe(
        'INSERT INTO "users" ("name") VALUES ($1) RETURNING "id", "created_at"',
      );
      expect(params).toEqual(["John"]);
    });

    it("should handle various value types", () => {
      const { sql, params } = buildInsert("data", {
        name: "Test",
        count: 42,
        active: true,
        metadata: null,
      });

      expect(sql).toBe(
        'INSERT INTO "data" ("name", "count", "active", "metadata") VALUES ($1, $2, $3, $4) RETURNING "id"',
      );
      expect(params).toEqual(["Test", 42, true, null]);
    });

    it("should throw error for empty data", () => {
      expect(() => buildInsert("users", {})).toThrow(
        "Insert data cannot be empty",
      );
    });

    it("should properly escape special identifiers", () => {
      const { sql, params } = buildInsert("user-data", {
        "first-name": "John",
        "email@address": "john@example.com",
      });

      expect(sql).toContain('"user-data"');
      expect(sql).toContain('"first-name"');
      expect(sql).toContain('"email@address"');
    });
  });

  describe("buildUpdate", () => {
    it("should build basic UPDATE statement", () => {
      const { sql, params } = buildUpdate(
        "users",
        { name: "Jane" },
        "id = $1",
        [1],
      );

      expect(sql).toBe('UPDATE "users" SET "name" = $2 WHERE id = $1');
      expect(params).toEqual([1, "Jane"]);
    });

    it("should handle multiple columns to update", () => {
      const { sql, params } = buildUpdate(
        "users",
        { name: "Jane", email: "jane@example.com" },
        "id = $1",
        [1],
      );

      expect(sql).toBe(
        'UPDATE "users" SET "name" = $2, "email" = $3 WHERE id = $1',
      );
      expect(params).toEqual([1, "Jane", "jane@example.com"]);
    });

    it("should handle multiple WHERE conditions", () => {
      const { sql, params } = buildUpdate(
        "users",
        { active: false },
        "id = $1 AND deleted = $2",
        [1, false],
      );

      expect(sql).toBe(
        'UPDATE "users" SET "active" = $3 WHERE id = $1 AND deleted = $2',
      );
      expect(params).toEqual([1, false, false]);
    });

    it("should handle empty whereParams", () => {
      const { sql, params } = buildUpdate(
        "settings",
        { value: "new" },
        "key = 'theme'",
      );

      expect(sql).toBe(
        `UPDATE "settings" SET "value" = $1 WHERE key = 'theme'`,
      );
      expect(params).toEqual(["new"]);
    });

    it("should throw error for empty data", () => {
      expect(() => buildUpdate("users", {}, "id = $1", [1])).toThrow(
        "Update data cannot be empty",
      );
    });
  });

  describe("buildDelete", () => {
    it("should build basic DELETE statement", () => {
      const { sql, params } = buildDelete("users", "id = $1", [1]);

      expect(sql).toBe('DELETE FROM "users" WHERE id = $1');
      expect(params).toEqual([1]);
    });

    it("should handle multiple WHERE conditions", () => {
      const { sql, params } = buildDelete(
        "users",
        "id = $1 AND active = $2",
        [1, false],
      );

      expect(sql).toBe('DELETE FROM "users" WHERE id = $1 AND active = $2');
      expect(params).toEqual([1, false]);
    });

    it("should handle empty whereParams with literal WHERE", () => {
      const { sql, params } = buildDelete(
        "sessions",
        "expires_at < NOW()",
        [],
      );

      expect(sql).toBe('DELETE FROM "sessions" WHERE expires_at < NOW()');
      expect(params).toEqual([]);
    });
  });

  describe("buildSelect", () => {
    it("should build basic SELECT * statement", () => {
      const { sql, params } = buildSelect("users");

      expect(sql).toBe('SELECT * FROM "users"');
      expect(params).toEqual([]);
    });

    it("should build SELECT with specific columns", () => {
      const { sql, params } = buildSelect("users", ["id", "name", "email"]);

      expect(sql).toBe('SELECT "id", "name", "email" FROM "users"');
      expect(params).toEqual([]);
    });

    it("should build SELECT with WHERE clause", () => {
      const { sql, params } = buildSelect("users", "*", "active = $1", [true]);

      expect(sql).toBe('SELECT * FROM "users" WHERE active = $1');
      expect(params).toEqual([true]);
    });

    it("should build SELECT with ORDER BY", () => {
      const { sql, params } = buildSelect("users", "*", undefined, [], {
        orderBy: "created_at DESC",
      });

      expect(sql).toBe('SELECT * FROM "users" ORDER BY created_at DESC');
      expect(params).toEqual([]);
    });

    it("should build SELECT with multiple ORDER BY columns", () => {
      const { sql, params } = buildSelect("users", "*", undefined, [], {
        orderBy: ["name ASC", "created_at DESC"],
      });

      expect(sql).toBe(
        'SELECT * FROM "users" ORDER BY name ASC, created_at DESC',
      );
      expect(params).toEqual([]);
    });

    it("should build SELECT with LIMIT", () => {
      const { sql, params } = buildSelect("users", "*", undefined, [], {
        limit: 10,
      });

      expect(sql).toBe('SELECT * FROM "users" LIMIT $1');
      expect(params).toEqual([10]);
    });

    it("should build SELECT with OFFSET", () => {
      const { sql, params } = buildSelect("users", "*", undefined, [], {
        offset: 20,
      });

      expect(sql).toBe('SELECT * FROM "users" OFFSET $1');
      expect(params).toEqual([20]);
    });

    it("should build SELECT with LIMIT and OFFSET", () => {
      const { sql, params } = buildSelect("users", "*", undefined, [], {
        limit: 10,
        offset: 20,
      });

      expect(sql).toBe('SELECT * FROM "users" LIMIT $1 OFFSET $2');
      expect(params).toEqual([10, 20]);
    });

    it("should build complete SELECT with all options", () => {
      const { sql, params } = buildSelect(
        "users",
        ["id", "name"],
        "active = $1",
        [true],
        {
          orderBy: "name ASC",
          limit: 10,
          offset: 0,
        },
      );

      expect(sql).toBe(
        'SELECT "id", "name" FROM "users" WHERE active = $1 ORDER BY name ASC LIMIT $2 OFFSET $3',
      );
      expect(params).toEqual([true, 10, 0]);
    });
  });

  describe("buildBatchInsert", () => {
    it("should build batch INSERT for single row", () => {
      const { sql, params } = buildBatchInsert(
        "users",
        ["name", "email"],
        [["John", "john@example.com"]],
      );

      expect(sql).toBe(
        'INSERT INTO "users" ("name", "email") VALUES ($1, $2) RETURNING "id"',
      );
      expect(params).toEqual(["John", "john@example.com"]);
    });

    it("should build batch INSERT for multiple rows", () => {
      const { sql, params } = buildBatchInsert(
        "users",
        ["name", "email"],
        [
          ["John", "john@example.com"],
          ["Jane", "jane@example.com"],
        ],
      );

      expect(sql).toBe(
        'INSERT INTO "users" ("name", "email") VALUES ($1, $2), ($3, $4) RETURNING "id"',
      );
      expect(params).toEqual([
        "John",
        "john@example.com",
        "Jane",
        "jane@example.com",
      ]);
    });

    it("should handle many rows", () => {
      const rows = Array.from({ length: 5 }, (_, i) => [`User${i}`, `user${i}@example.com`]);
      const { sql, params } = buildBatchInsert("users", ["name", "email"], rows);

      expect(params).toHaveLength(10);
      expect(sql).toContain("($1, $2)");
      expect(sql).toContain("($9, $10)");
    });

    it("should handle custom returning columns", () => {
      const { sql, params } = buildBatchInsert(
        "users",
        ["name"],
        [["John"]],
        ["id", "created_at"],
      );

      expect(sql).toBe(
        'INSERT INTO "users" ("name") VALUES ($1) RETURNING "id", "created_at"',
      );
    });

    it("should throw error for empty columns", () => {
      expect(() => buildBatchInsert("users", [], [[]])).toThrow(
        "Columns cannot be empty",
      );
    });

    it("should throw error for empty rows", () => {
      expect(() => buildBatchInsert("users", ["name"], [])).toThrow(
        "Rows cannot be empty",
      );
    });

    it("should throw error for mismatched column count", () => {
      expect(() =>
        buildBatchInsert("users", ["name", "email"], [["John"]]),
      ).toThrow("Row has 1 values but expected 2 columns");
    });
  });

  describe("buildUpsert", () => {
    it("should build basic UPSERT statement", () => {
      const { sql, params } = buildUpsert(
        "users",
        { id: 1, name: "John", email: "john@example.com" },
        ["id"],
      );

      expect(sql).toBe(
        'INSERT INTO "users" ("id", "name", "email") VALUES ($1, $2, $3) ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email" RETURNING "id"',
      );
      expect(params).toEqual([1, "John", "john@example.com"]);
    });

    it("should handle multiple conflict columns", () => {
      const { sql, params } = buildUpsert(
        "user_settings",
        { user_id: 1, key: "theme", value: "dark" },
        ["user_id", "key"],
      );

      expect(sql).toContain('ON CONFLICT ("user_id", "key")');
      expect(sql).toContain('"value" = EXCLUDED."value"');
    });

    it("should handle specific update columns", () => {
      const { sql, params } = buildUpsert(
        "users",
        { id: 1, name: "John", email: "john@example.com", created_at: "2024-01-01" },
        ["id"],
        ["name", "email"], // Only update name and email, not created_at
      );

      expect(sql).toContain('"name" = EXCLUDED."name"');
      expect(sql).toContain('"email" = EXCLUDED."email"');
      expect(sql).not.toContain("created_at = EXCLUDED");
    });

    it("should handle DO NOTHING when no columns to update", () => {
      const { sql, params } = buildUpsert(
        "users",
        { id: 1 },
        ["id"],
        [], // Empty update columns
      );

      expect(sql).toContain("DO NOTHING");
      expect(sql).not.toContain("DO UPDATE");
    });

    it("should handle custom returning columns", () => {
      const { sql, params } = buildUpsert(
        "users",
        { id: 1, name: "John" },
        ["id"],
        undefined,
        ["id", "name", "updated_at"],
      );

      expect(sql).toContain('RETURNING "id", "name", "updated_at"');
    });

    it("should throw error for empty data", () => {
      expect(() => buildUpsert("users", {}, ["id"])).toThrow(
        "Upsert data cannot be empty",
      );
    });

    it("should throw error for empty conflict columns", () => {
      expect(() => buildUpsert("users", { name: "John" }, [])).toThrow(
        "Conflict columns cannot be empty",
      );
    });
  });

  describe("buildWhereClause", () => {
    it("should build simple equality clause", () => {
      const { clause, params, nextIndex } = buildWhereClause({ id: 1 });

      expect(clause).toBe('"id" = $1');
      expect(params).toEqual([1]);
      expect(nextIndex).toBe(2);
    });

    it("should build multiple conditions with AND", () => {
      const { clause, params } = buildWhereClause({
        name: "John",
        active: true,
      });

      expect(clause).toBe('"name" = $1 AND "active" = $2');
      expect(params).toEqual(["John", true]);
    });

    it("should build multiple conditions with OR", () => {
      const { clause, params } = buildWhereClause(
        { name: "John", name2: "Jane" },
        "OR",
      );

      expect(clause).toBe('"name" = $1 OR "name2" = $2');
      expect(params).toEqual(["John", "Jane"]);
    });

    it("should handle NULL values", () => {
      const { clause, params } = buildWhereClause({ deleted_at: null });

      expect(clause).toBe('"deleted_at" IS NULL');
      expect(params).toEqual([]);
    });

    it("should handle array values as IN clause", () => {
      const { clause, params } = buildWhereClause({ status: ["active", "pending"] });

      expect(clause).toBe('"status" IN ($1, $2)');
      expect(params).toEqual(["active", "pending"]);
    });

    it("should handle mixed conditions", () => {
      const { clause, params } = buildWhereClause({
        name: "John",
        status: ["active", "pending"],
        deleted_at: null,
      });

      expect(clause).toBe(
        '"name" = $1 AND "status" IN ($2, $3) AND "deleted_at" IS NULL',
      );
      expect(params).toEqual(["John", "active", "pending"]);
    });

    it("should handle custom start index", () => {
      const { clause, params, nextIndex } = buildWhereClause(
        { name: "John" },
        "AND",
        5,
      );

      expect(clause).toBe('"name" = $5');
      expect(params).toEqual(["John"]);
      expect(nextIndex).toBe(6);
    });

    it("should track next index correctly with arrays", () => {
      const { nextIndex } = buildWhereClause({
        id: 1,
        status: ["a", "b", "c"],
        name: "test",
      });

      // id uses $1, status uses $2,$3,$4, name uses $5
      expect(nextIndex).toBe(6);
    });
  });

  describe("Type definitions", () => {
    it("should have QueryResult type with correct shape", () => {
      const result: QueryResult<{ id: number; name: string }> = {
        rows: [{ id: 1, name: "Test" }],
        rowCount: 1,
        command: "SELECT",
      };

      expect(result.rows).toHaveLength(1);
      expect(result.rowCount).toBe(1);
      expect(result.command).toBe("SELECT");
    });

    it("should have InsertResult type with correct shape", () => {
      const result: InsertResult = {
        id: 1,
        rowCount: 1,
      };

      expect(result.id).toBe(1);
      expect(result.rowCount).toBe(1);
    });

    it("should have ModifyResult type with correct shape", () => {
      const result: ModifyResult = {
        rowCount: 5,
        success: true,
      };

      expect(result.rowCount).toBe(5);
      expect(result.success).toBe(true);
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should escape table names with special characters", () => {
      const { sql } = buildInsert("users; DROP TABLE users;--", {
        name: "test",
      });

      // The table name should be quoted, preventing injection
      expect(sql).toContain('"users; DROP TABLE users;--"');
    });

    it("should escape column names with special characters", () => {
      const { sql } = buildInsert("users", {
        'name"; DROP TABLE users;--': "test",
      });

      // The column name should have quotes escaped
      expect(sql).toContain('""');
    });

    it("should safely handle parameter values", () => {
      const { sql, params } = buildInsert("users", {
        name: "'; DROP TABLE users;--",
      });

      // The value should be in params, not in the SQL string
      expect(sql).not.toContain("DROP TABLE");
      expect(params[0]).toBe("'; DROP TABLE users;--");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty WHERE params in buildSelect", () => {
      const { sql, params } = buildSelect("users", "*", "1 = 1");

      expect(sql).toBe('SELECT * FROM "users" WHERE 1 = 1');
      expect(params).toEqual([]);
    });

    it("should handle Unicode characters in values", () => {
      const { sql, params } = buildInsert("users", {
        name: "日本語",
        emoji: "🎉",
      });

      expect(params).toEqual(["日本語", "🎉"]);
    });

    it("should handle very long strings", () => {
      const longString = "a".repeat(10000);
      const { params } = buildInsert("data", { content: longString });

      expect(params[0]).toHaveLength(10000);
    });

    it("should handle Date objects as values", () => {
      const date = new Date("2024-01-01T00:00:00.000Z");
      const { params } = buildInsert("events", { created_at: date });

      expect(params[0]).toBeInstanceOf(Date);
    });

    it("should handle boolean values", () => {
      const { params } = buildInsert("users", {
        active: true,
        verified: false,
      });

      expect(params).toEqual([true, false]);
    });

    it("should handle numeric values including zero", () => {
      const { params } = buildInsert("data", {
        count: 0,
        balance: -100.50,
        amount: 999999999,
      });

      expect(params).toEqual([0, -100.50, 999999999]);
    });

    it("should handle undefined values as undefined (not filtered)", () => {
      const { params } = buildInsert("data", {
        name: "test",
        value: undefined,
      });

      expect(params).toEqual(["test", undefined]);
    });
  });

  describe("Query Builder Integration", () => {
    it("should chain buildWhereClause with buildSelect", () => {
      const conditions = { active: true, role: "admin" };
      const { clause, params: whereParams } = buildWhereClause(conditions);
      const { sql, params } = buildSelect(
        "users",
        ["id", "name"],
        clause,
        whereParams,
        { orderBy: "name", limit: 10 },
      );

      expect(sql).toBe(
        'SELECT "id", "name" FROM "users" WHERE "active" = $1 AND "role" = $2 ORDER BY name LIMIT $3',
      );
      expect(params).toEqual([true, "admin", 10]);
    });

    it("should combine converted placeholders with buildUpdate", () => {
      const originalSql = "id = ? AND status = ?";
      const convertedWhere = convertPlaceholders(originalSql);
      const { sql, params } = buildUpdate(
        "orders",
        { status: "completed" },
        convertedWhere,
        [1, "pending"],
      );

      expect(sql).toContain("WHERE id = $1 AND status = $2");
      expect(params).toEqual([1, "pending", "completed"]);
    });
  });

  describe("Parameter Style Consistency", () => {
    it("should maintain consistent parameter ordering across multiple calls", () => {
      const data = {
        a: 1,
        b: 2,
        c: 3,
        d: 4,
        e: 5,
      };

      const result1 = buildInsert("test", data);
      const result2 = buildInsert("test", data);

      expect(result1.params).toEqual(result2.params);
      expect(result1.sql).toBe(result2.sql);
    });
  });
});
