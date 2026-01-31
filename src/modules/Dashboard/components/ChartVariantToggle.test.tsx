/**
 * ChartVariantToggle Component Tests
 *
 * Unit tests for the ChartVariantToggle component.
 * Focuses on functionality: prop handling, callbacks, and accessibility.
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChartVariant } from "../types";
import { ChartVariantToggle } from "./ChartVariantToggle";

describe("ChartVariantToggle", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render both line and area buttons", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      expect(screen.getByText("Line")).toBeInTheDocument();
      expect(screen.getByText("Area")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      const { container } = render(
        <ChartVariantToggle
          value="line"
          onChange={mockOnChange}
          className="custom-toggle-class"
        />,
      );

      const toggle = container.querySelector(".custom-toggle-class");
      expect(toggle).toBeInTheDocument();
    });

    it("should use custom testId", () => {
      render(
        <ChartVariantToggle
          value="line"
          onChange={mockOnChange}
          testId="custom-test-id"
        />,
      );

      expect(screen.getByTestId("custom-test-id")).toBeInTheDocument();
      expect(screen.getByTestId("custom-test-id-line")).toBeInTheDocument();
      expect(screen.getByTestId("custom-test-id-area")).toBeInTheDocument();
    });

    it("should use default testId when not provided", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      expect(screen.getByTestId("chart-variant-toggle")).toBeInTheDocument();
      expect(
        screen.getByTestId("chart-variant-toggle-line"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("chart-variant-toggle-area"),
      ).toBeInTheDocument();
    });
  });

  describe("selected state", () => {
    it("should show line button as selected when value is line", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      const lineButton = screen.getByTestId("chart-variant-toggle-line");
      const areaButton = screen.getByTestId("chart-variant-toggle-area");

      expect(lineButton).toHaveAttribute("aria-pressed", "true");
      expect(areaButton).toHaveAttribute("aria-pressed", "false");
    });

    it("should show area button as selected when value is area", () => {
      render(<ChartVariantToggle value="area" onChange={mockOnChange} />);

      const lineButton = screen.getByTestId("chart-variant-toggle-line");
      const areaButton = screen.getByTestId("chart-variant-toggle-area");

      expect(lineButton).toHaveAttribute("aria-pressed", "false");
      expect(areaButton).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("onChange callback", () => {
    it("should call onChange with 'area' when area button is clicked", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      const areaButton = screen.getByTestId("chart-variant-toggle-area");
      fireEvent.click(areaButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("area");
    });

    it("should call onChange with 'line' when line button is clicked", () => {
      render(<ChartVariantToggle value="area" onChange={mockOnChange} />);

      const lineButton = screen.getByTestId("chart-variant-toggle-line");
      fireEvent.click(lineButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      expect(mockOnChange).toHaveBeenCalledWith("line");
    });

    it("should not call onChange when clicking the already selected option", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      const lineButton = screen.getByTestId("chart-variant-toggle-line");
      fireEvent.click(lineButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should not call onChange when clicking the already selected area option", () => {
      render(<ChartVariantToggle value="area" onChange={mockOnChange} />);

      const areaButton = screen.getByTestId("chart-variant-toggle-area");
      fireEvent.click(areaButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe("disabled state", () => {
    it("should disable both buttons when disabled prop is true", () => {
      render(
        <ChartVariantToggle
          value="line"
          onChange={mockOnChange}
          disabled={true}
        />,
      );

      const lineButton = screen.getByTestId("chart-variant-toggle-line");
      const areaButton = screen.getByTestId("chart-variant-toggle-area");

      expect(lineButton).toBeDisabled();
      expect(areaButton).toBeDisabled();
    });

    it("should not call onChange when disabled and clicked", () => {
      render(
        <ChartVariantToggle
          value="line"
          onChange={mockOnChange}
          disabled={true}
        />,
      );

      const areaButton = screen.getByTestId("chart-variant-toggle-area");
      fireEvent.click(areaButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should enable buttons by default", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      const lineButton = screen.getByTestId("chart-variant-toggle-line");
      const areaButton = screen.getByTestId("chart-variant-toggle-area");

      expect(lineButton).not.toBeDisabled();
      expect(areaButton).not.toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("should have role='group' on the container", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      const container = screen.getByRole("group");
      expect(container).toBeInTheDocument();
    });

    it("should have aria-label on the container", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      const container = screen.getByRole("group");
      expect(container).toHaveAttribute("aria-label", "Chart variant selector");
    });

    it("should have aria-pressed attributes on buttons", () => {
      render(<ChartVariantToggle value="line" onChange={mockOnChange} />);

      const lineButton = screen.getByTestId("chart-variant-toggle-line");
      const areaButton = screen.getByTestId("chart-variant-toggle-area");

      expect(lineButton).toHaveAttribute("aria-pressed");
      expect(areaButton).toHaveAttribute("aria-pressed");
    });
  });

  describe("type safety", () => {
    it("should accept valid ChartVariant values", () => {
      const variants: ChartVariant[] = ["line", "area"];

      for (const variant of variants) {
        const { unmount } = render(
          <ChartVariantToggle value={variant} onChange={mockOnChange} />,
        );
        expect(screen.getByTestId("chart-variant-toggle")).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe("controlled component behavior", () => {
    it("should reflect value changes from parent", () => {
      const { rerender } = render(
        <ChartVariantToggle value="line" onChange={mockOnChange} />,
      );

      expect(screen.getByTestId("chart-variant-toggle-line")).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      rerender(<ChartVariantToggle value="area" onChange={mockOnChange} />);

      expect(screen.getByTestId("chart-variant-toggle-area")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByTestId("chart-variant-toggle-line")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });
  });
});
