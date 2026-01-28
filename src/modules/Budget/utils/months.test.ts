import { describe, it, expect } from "vitest";
import {
  formatMonthKey,
  getDefaultMonthKey,
  generateMonthOptions,
} from "./months";

describe("Month Utilities", () => {
  describe("formatMonthKey", () => {
    it("should format a date to YYYY-MM-01 format", () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(formatMonthKey(date)).toBe("2024-01-01");
    });

    it("should handle single-digit months with padding", () => {
      const date = new Date(2024, 8, 20); // September 20, 2024
      expect(formatMonthKey(date)).toBe("2024-09-01");
    });

    it("should handle December correctly", () => {
      const date = new Date(2024, 11, 31); // December 31, 2024
      expect(formatMonthKey(date)).toBe("2024-12-01");
    });

    it("should handle year transitions", () => {
      const date = new Date(2025, 0, 1); // January 1, 2025
      expect(formatMonthKey(date)).toBe("2025-01-01");
    });
  });

  describe("getDefaultMonthKey", () => {
    it("should return current month key when no date provided", () => {
      const now = new Date(2024, 5, 15); // June 15, 2024
      const result = getDefaultMonthKey(now);
      expect(result).toBe("2024-06-01");
    });

    it("should use provided date when given", () => {
      const date = new Date(2023, 11, 25); // December 25, 2023
      const result = getDefaultMonthKey(date);
      expect(result).toBe("2023-12-01");
    });
  });

  describe("generateMonthOptions", () => {
    it("should generate default options (6 past, 11 future)", () => {
      const now = new Date(2024, 5, 1); // June 1, 2024
      const options = generateMonthOptions({ now });
      expect(options).toHaveLength(18); // 6 + 1 + 11
    });

    it("should include months in correct order", () => {
      const now = new Date(2024, 5, 1); // June 1, 2024
      const options = generateMonthOptions({ now });
      expect(options[0].value).toBe("2023-12-01"); // December 2023
      expect(options[6].value).toBe("2024-06-01"); // June 2024 (current)
      expect(options[17].value).toBe("2025-05-01"); // May 2025
    });

    it("should have correct labels", () => {
      const now = new Date(2024, 5, 1); // June 1, 2024
      const options = generateMonthOptions({ now });
      expect(options[6].label).toBe("June 2024");
      expect(options[0].label).toBe("December 2023");
    });

    it("should respect custom past and future values", () => {
      const now = new Date(2024, 5, 1); // June 1, 2024
      const options = generateMonthOptions({ past: 3, future: 3, now });
      expect(options).toHaveLength(7); // 3 + 1 + 3
      expect(options[0].value).toBe("2024-03-01");
      expect(options[3].value).toBe("2024-06-01");
      expect(options[6].value).toBe("2024-09-01");
    });

    it("should handle zero past and future", () => {
      const now = new Date(2024, 5, 1); // June 1, 2024
      const options = generateMonthOptions({ past: 0, future: 0, now });
      expect(options).toHaveLength(1);
      expect(options[0].value).toBe("2024-06-01");
    });

    it("should handle asymmetric past and future", () => {
      const now = new Date(2024, 5, 1); // June 1, 2024
      const options = generateMonthOptions({ past: 2, future: 5, now });
      expect(options).toHaveLength(8); // 2 + 1 + 5
      expect(options[0].value).toBe("2024-04-01");
      expect(options[2].value).toBe("2024-06-01");
      expect(options[7].value).toBe("2024-11-01");
    });

    it("should handle year boundaries", () => {
      const now = new Date(2024, 0, 1); // January 2024
      const options = generateMonthOptions({ past: 2, future: 2, now });
      expect(options[0].value).toBe("2023-11-01");
      expect(options[1].value).toBe("2023-12-01");
      expect(options[2].value).toBe("2024-01-01");
      expect(options[3].value).toBe("2024-02-01");
      expect(options[4].value).toBe("2024-03-01");
    });
  });
});
