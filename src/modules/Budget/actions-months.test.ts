import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getMonthsWithBudgets } from "./actions";
import { getPool } from "@/db/drizzle-client";

// Mock the database pool
vi.mock("@/db/drizzle-client", () => ({
  getDb: vi.fn(),
  getPool: vi.fn(),
  sql: vi.fn((strings) => ({ strings })),
}));

describe("getMonthsWithBudgets", () => {
  let mockPool: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = vi.fn();
    mockPool = {
      query: mockQuery,
    };

    (getPool as any).mockReturnValue(mockPool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return array of months with budgets sorted in descending order", async () => {
    const mockRows = [
      { month: "2025-12-01", budget_count: 5 },
      { month: "2025-11-01", budget_count: 3 },
      { month: "2025-10-01", budget_count: 7 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: mockRows });

    const result = await getMonthsWithBudgets();

    expect(result).toHaveLength(3);
    expect(result[0].value).toBe("2025-12-01");
    expect(result[0].label).toBe("December 2025");
    expect(result[0].budgetCount).toBe(5);
    expect(result[1].value).toBe("2025-11-01");
    expect(result[1].label).toBe("November 2025");
    expect(result[1].budgetCount).toBe(3);
  });

  it("should format month labels correctly", async () => {
    const mockRows = [
      { month: "2026-01-01", budget_count: 2 },
      { month: "2025-02-01", budget_count: 4 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: mockRows });

    const result = await getMonthsWithBudgets();

    expect(result[0].label).toBe("January 2026");
    expect(result[1].label).toBe("February 2025");
  });

  it("should return empty array when no months have budgets", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await getMonthsWithBudgets();

    expect(result).toEqual([]);
  });

  it("should include budget count in response", async () => {
    const mockRows = [
      { month: "2025-12-01", budget_count: 10 },
      { month: "2025-11-01", budget_count: 1 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: mockRows });

    const result = await getMonthsWithBudgets();

    expect(result[0].budgetCount).toBe(10);
    expect(result[1].budgetCount).toBe(1);
  });

  it("should execute the correct SQL query", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getMonthsWithBudgets();

    expect(mockQuery).toHaveBeenCalledWith(
      `SELECT DISTINCT b.month, COUNT(*) as budget_count
       FROM budgets b
       WHERE b.archived = false
       GROUP BY b.month
       ORDER BY b.month DESC`,
    );
  });

  it("should throw error when database query fails", async () => {
    const dbError = new Error("Database connection failed");
    mockQuery.mockRejectedValueOnce(dbError);

    await expect(getMonthsWithBudgets()).rejects.toThrow(
      "Database connection failed",
    );
  });

  it("should handle months from different years", async () => {
    const mockRows = [
      { month: "2026-01-01", budget_count: 2 },
      { month: "2025-12-01", budget_count: 3 },
      { month: "2024-11-01", budget_count: 1 },
    ];

    mockQuery.mockResolvedValueOnce({ rows: mockRows });

    const result = await getMonthsWithBudgets();

    expect(result).toHaveLength(3);
    expect(result[0].label).toBe("January 2026");
    expect(result[1].label).toBe("December 2025");
    expect(result[2].label).toBe("November 2024");
  });
});
