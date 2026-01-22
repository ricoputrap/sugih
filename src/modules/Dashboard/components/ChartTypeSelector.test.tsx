/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ChartTypeSelector } from "./ChartTypeSelector";
import { useChartTypeStore } from "../stores/useChartTypeStore";

// Mock Drizzle database connection for tests
vi.mock("@/db/drizzle-client", () => ({
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
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("ChartTypeSelector", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useChartTypeStore.setState({ chartType: "area" });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render Area and Line buttons", () => {
      render(<ChartTypeSelector />);

      expect(screen.getByText("Area")).toBeInTheDocument();
      expect(screen.getByText("Line")).toBeInTheDocument();
    });

    it("should have the correct aria-label for accessibility", () => {
      render(<ChartTypeSelector />);

      expect(screen.getByRole("group")).toHaveAttribute(
        "aria-label",
        "Chart type selector",
      );
    });

    it("should apply custom className", () => {
      render(<ChartTypeSelector className="custom-class" />);

      expect(screen.getByRole("group")).toHaveClass("custom-class");
    });
  });

  describe("initial state", () => {
    it("should show Area as selected by default", () => {
      render(<ChartTypeSelector />);

      const areaButton = screen.getByText("Area").closest("button");
      expect(areaButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should show Line as not selected by default", () => {
      render(<ChartTypeSelector />);

      const lineButton = screen.getByText("Line").closest("button");
      expect(lineButton).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("interaction", () => {
    it("should switch to Line chart when Line button is clicked", () => {
      render(<ChartTypeSelector />);

      const lineButton = screen.getByText("Line").closest("button");
      fireEvent.click(lineButton!);

      expect(useChartTypeStore.getState().chartType).toBe("line");
      expect(lineButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should switch to Area chart when Area button is clicked", () => {
      // Set initial state to line
      useChartTypeStore.setState({ chartType: "line" });

      render(<ChartTypeSelector />);

      const areaButton = screen.getByText("Area").closest("button");
      fireEvent.click(areaButton!);

      expect(useChartTypeStore.getState().chartType).toBe("area");
      expect(areaButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should update visual state when toggling between chart types", () => {
      render(<ChartTypeSelector />);

      const areaButton = screen.getByText("Area").closest("button");
      const lineButton = screen.getByText("Line").closest("button");

      // Initially Area is selected
      expect(areaButton).toHaveAttribute("aria-pressed", "true");
      expect(lineButton).toHaveAttribute("aria-pressed", "false");

      // Click Line
      fireEvent.click(lineButton!);
      expect(areaButton).toHaveAttribute("aria-pressed", "false");
      expect(lineButton).toHaveAttribute("aria-pressed", "true");

      // Click Area
      fireEvent.click(areaButton!);
      expect(areaButton).toHaveAttribute("aria-pressed", "true");
      expect(lineButton).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("disabled state", () => {
    it("should disable both buttons when disabled prop is true", () => {
      render(<ChartTypeSelector disabled />);

      const areaButton = screen.getByText("Area").closest("button");
      const lineButton = screen.getByText("Line").closest("button");

      expect(areaButton).toBeDisabled();
      expect(lineButton).toBeDisabled();
    });

    it("should not change chart type when disabled", () => {
      render(<ChartTypeSelector disabled />);

      const lineButton = screen.getByText("Line").closest("button");
      fireEvent.click(lineButton!);

      expect(useChartTypeStore.getState().chartType).toBe("area");
    });
  });

  describe("store integration", () => {
    it("should reflect store state changes", () => {
      render(<ChartTypeSelector />);

      // Change store directly - wrap in act to flush state updates
      act(() => {
        useChartTypeStore.setState({ chartType: "line" });
      });

      const lineButton = screen.getByText("Line").closest("button");
      expect(lineButton).toHaveAttribute("aria-pressed", "true");
    });
  });
});
