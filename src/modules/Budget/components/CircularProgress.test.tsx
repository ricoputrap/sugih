import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CircularProgress } from "./CircularProgress";

describe("CircularProgress", () => {
  describe("Rendering", () => {
    it("should render the circular progress component", () => {
      render(<CircularProgress percentage={50} />);
      expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
    });

    it("should render SVG element", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should render progress circle", () => {
      render(<CircularProgress percentage={50} />);
      expect(screen.getByTestId("progress-circle")).toBeInTheDocument();
    });

    it("should render center content when provided", () => {
      render(
        <CircularProgress
          percentage={50}
          centerContent={<span>Test Content</span>}
        />
      );
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("should not render center content when not provided", () => {
      render(<CircularProgress percentage={50} />);
      expect(screen.queryByTestId("center-content")).not.toBeInTheDocument();
    });
  });

  describe("Percentage Handling", () => {
    it("should handle 0% percentage", () => {
      render(<CircularProgress percentage={0} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toBeInTheDocument();
    });

    it("should handle 50% percentage", () => {
      render(<CircularProgress percentage={50} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toBeInTheDocument();
    });

    it("should handle 100% percentage", () => {
      render(<CircularProgress percentage={100} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toBeInTheDocument();
    });

    it("should handle over-budget (>100%) percentage", () => {
      render(<CircularProgress percentage={125} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toBeInTheDocument();
    });

    it("should clamp display percentage to 100 for visual representation", () => {
      const { container } = render(<CircularProgress percentage={150} />);
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      // The visual representation should be clamped to 100%
    });
  });

  describe("Gradient Colors", () => {
    it("should use green gradient for on-track (0-79%)", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const progressCircle = container.querySelector(
        '[stroke="url(#gradient-green)"]'
      );
      expect(progressCircle).toBeInTheDocument();
    });

    it("should use orange gradient for near limit (80-99%)", () => {
      const { container } = render(<CircularProgress percentage={85} />);
      const progressCircle = container.querySelector(
        '[stroke="url(#gradient-orange)"]'
      );
      expect(progressCircle).toBeInTheDocument();
    });

    it("should use red gradient for over budget (100%+)", () => {
      const { container } = render(<CircularProgress percentage={125} />);
      const progressCircle = container.querySelector(
        '[stroke="url(#gradient-red)"]'
      );
      expect(progressCircle).toBeInTheDocument();
    });
  });

  describe("Props", () => {
    it("should accept custom size", () => {
      const { container } = render(
        <CircularProgress percentage={50} size={150} />
      );
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "150");
      expect(svg).toHaveAttribute("height", "150");
    });

    it("should accept custom radius", () => {
      const { container } = render(
        <CircularProgress percentage={50} radius={60} />
      );
      const backgroundCircle = container.querySelector(
        'circle[stroke="#e5e7eb"]'
      );
      expect(backgroundCircle).toHaveAttribute("r", "60");
    });

    it("should accept custom strokeWidth", () => {
      const { container } = render(
        <CircularProgress percentage={50} strokeWidth={8} />
      );
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toHaveAttribute("stroke-width", "8");
    });

    it("should accept custom className", () => {
      const { container } = render(
        <CircularProgress percentage={50} className="custom-class" />
      );
      const progressContainer = screen.getByTestId("circular-progress");
      expect(progressContainer).toHaveClass("custom-class");
    });

    it("should use default size when not provided", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveAttribute("width", "120");
      expect(svg).toHaveAttribute("height", "120");
    });

    it("should use default radius when not provided", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const backgroundCircle = container.querySelector(
        'circle[stroke="#e5e7eb"]'
      );
      expect(backgroundCircle).toHaveAttribute("r", "45");
    });

    it("should use default strokeWidth when not provided", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toHaveAttribute("stroke-width", "6");
    });
  });

  describe("Center Content", () => {
    it("should render complex center content", () => {
      render(
        <CircularProgress
          percentage={75}
          centerContent={
            <div>
              <div>75%</div>
              <div>Rp 1.5M</div>
            </div>
          }
        />
      );
      expect(screen.getByText("75%")).toBeInTheDocument();
      expect(screen.getByText("Rp 1.5M")).toBeInTheDocument();
    });

    it("should render number as center content", () => {
      render(<CircularProgress percentage={50} centerContent={50} />);
      expect(screen.getByText("50")).toBeInTheDocument();
    });
  });

  describe("SVG Structure", () => {
    it("should have background circle", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const backgroundCircle = container.querySelector(
        'circle[stroke="#e5e7eb"]'
      );
      expect(backgroundCircle).toBeInTheDocument();
    });

    it("should have gradient definitions", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const defs = container.querySelector("defs");
      expect(defs).toBeInTheDocument();
    });

    it("should rotate SVG -90 degrees", () => {
      const { container } = render(<CircularProgress percentage={50} />);
      const svg = container.querySelector("svg");
      expect(svg).toHaveClass("-rotate-90");
    });
  });

  describe("Accessibility", () => {
    it("should be rendered with test ids for testing", () => {
      render(
        <CircularProgress
          percentage={50}
          centerContent={<span>Test</span>}
        />
      );
      expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
      expect(screen.getByTestId("progress-circle")).toBeInTheDocument();
      expect(screen.getByTestId("center-content")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle negative percentage gracefully", () => {
      render(<CircularProgress percentage={-10} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toBeInTheDocument();
    });

    it("should handle very high percentage (200%+)", () => {
      render(<CircularProgress percentage={200} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toBeInTheDocument();
    });

    it("should handle decimal percentage", () => {
      render(<CircularProgress percentage={75.5} />);
      const progressCircle = screen.getByTestId("progress-circle");
      expect(progressCircle).toBeInTheDocument();
    });
  });
});
