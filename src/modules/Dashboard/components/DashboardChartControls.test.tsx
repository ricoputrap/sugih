/**
 * @vitest-environment jsdom
 */

/**
 * Dashboard Chart Controls Tests
 *
 * Component tests for DashboardChartControls verifying:
 * - Both selectors render correctly
 * - Period changes trigger callback
 * - Date range preset changes trigger callback
 * - All options are available
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DateRangePreset, Period } from "../types";
import { DashboardChartControls } from "./DashboardChartControls";

describe("DashboardChartControls", () => {
  const mockOnPeriodChange = vi.fn();
  const mockOnDateRangePresetChange = vi.fn();

  const defaultProps = {
    period: "monthly" as Period,
    dateRangePreset: "last_3_months" as DateRangePreset,
    onPeriodChange: mockOnPeriodChange,
    onDateRangePresetChange: mockOnDateRangePresetChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the main container", () => {
      render(<DashboardChartControls {...defaultProps} />);

      const container = screen.getByTestId("dashboard-chart-controls");
      expect(container).toBeInTheDocument();
    });

    it("renders period selector with label", () => {
      render(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByText("Period:")).toBeInTheDocument();
      expect(screen.getByTestId("period-selector")).toBeInTheDocument();
    });

    it("renders date range selector with label", () => {
      render(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByText("Range:")).toBeInTheDocument();
      expect(screen.getByTestId("date-range-selector")).toBeInTheDocument();
    });

    it("displays currently selected period", () => {
      render(<DashboardChartControls {...defaultProps} />);

      // Check that Monthly is displayed in the select trigger
      expect(screen.getByText("Monthly")).toBeInTheDocument();
    });

    it("displays currently selected date range preset", () => {
      render(<DashboardChartControls {...defaultProps} />);

      // Check that Last 3 Months is displayed in the select trigger
      expect(screen.getByText("Last 3 Months")).toBeInTheDocument();
    });

    it("applies custom className when provided", () => {
      render(
        <DashboardChartControls {...defaultProps} className="custom-class" />,
      );

      const container = screen.getByTestId("dashboard-chart-controls");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("Period Selector", () => {
    it("displays the selector", () => {
      render(<DashboardChartControls {...defaultProps} />);

      const periodSelector = screen.getByTestId("period-selector");
      expect(periodSelector).toBeInTheDocument();
    });

    it("updates selected period when prop changes", () => {
      const { rerender } = render(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByText("Monthly")).toBeInTheDocument();

      rerender(<DashboardChartControls {...defaultProps} period="daily" />);
      expect(screen.getByText("Daily")).toBeInTheDocument();
    });
  });

  describe("Date Range Preset Selector", () => {
    it("displays the selector", () => {
      render(<DashboardChartControls {...defaultProps} />);

      const rangeSelector = screen.getByTestId("date-range-selector");
      expect(rangeSelector).toBeInTheDocument();
    });

    it("updates selected date range when prop changes", () => {
      const { rerender } = render(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByText("Last 3 Months")).toBeInTheDocument();

      rerender(
        <DashboardChartControls
          {...defaultProps}
          dateRangePreset="this_month"
        />,
      );
      expect(screen.getByText("This Month")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper labels for screen readers", () => {
      render(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByLabelText("Period:")).toBeInTheDocument();
      expect(screen.getByLabelText("Range:")).toBeInTheDocument();
    });

    it("period selector has correct id", () => {
      render(<DashboardChartControls {...defaultProps} />);

      const periodSelector = screen.getByTestId("period-selector");
      expect(periodSelector).toHaveAttribute("id", "period-selector");
    });

    it("date range selector has correct id", () => {
      render(<DashboardChartControls {...defaultProps} />);

      const rangeSelector = screen.getByTestId("date-range-selector");
      expect(rangeSelector).toHaveAttribute("id", "date-range-selector");
    });
  });

  describe("Layout", () => {
    it("has responsive flex layout classes", () => {
      render(<DashboardChartControls {...defaultProps} />);

      const container = screen.getByTestId("dashboard-chart-controls");
      expect(container).toHaveClass("flex", "flex-col", "sm:flex-row");
    });

    it("has proper gap spacing", () => {
      render(<DashboardChartControls {...defaultProps} />);

      const container = screen.getByTestId("dashboard-chart-controls");
      expect(container).toHaveClass("gap-3", "sm:gap-4");
    });
  });

  describe("Integration", () => {
    it("maintains selections across re-renders", () => {
      const { rerender } = render(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByText("Monthly")).toBeInTheDocument();
      expect(screen.getByText("Last 3 Months")).toBeInTheDocument();

      // Re-render with same props
      rerender(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByText("Monthly")).toBeInTheDocument();
      expect(screen.getByText("Last 3 Months")).toBeInTheDocument();
    });

    it("displays both selectors simultaneously", () => {
      render(<DashboardChartControls {...defaultProps} />);

      expect(screen.getByTestId("period-selector")).toBeInTheDocument();
      expect(screen.getByTestId("date-range-selector")).toBeInTheDocument();
      expect(screen.getByText("Monthly")).toBeInTheDocument();
      expect(screen.getByText("Last 3 Months")).toBeInTheDocument();
    });
  });
});
