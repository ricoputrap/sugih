import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggle } from "./ViewToggle";

describe("ViewToggle", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render both toggle options", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      expect(listButton).toBeInTheDocument();
      expect(gridButton).toBeInTheDocument();
    });

    it("should have proper role and aria-label for accessibility", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const toggleGroup = screen.getByRole("group", {
        name: "Budget view mode toggle",
      });
      expect(toggleGroup).toBeInTheDocument();
    });

    it("should render icons in buttons", () => {
      const { container } = render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      // Check for SVG elements (icons)
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Active State Styling", () => {
    it("should have default variant for active list view", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      expect(listButton).toHaveClass("bg-primary");
    });

    it("should have ghost variant for inactive list view", () => {
      render(
        <ViewToggle value="grid" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      expect(listButton).toHaveClass("hover:bg-accent");
    });

    it("should have default variant for active grid view", () => {
      render(
        <ViewToggle value="grid" onChange={mockOnChange} />,
      );

      const gridButton = screen.getByLabelText("Grid view");
      expect(gridButton).toHaveClass("bg-primary");
    });

    it("should have ghost variant for inactive grid view", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const gridButton = screen.getByLabelText("Grid view");
      expect(gridButton).toHaveClass("hover:bg-accent");
    });
  });

  describe("onChange Callback", () => {
    it("should call onChange with 'list' when list button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <ViewToggle value="grid" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      await user.click(listButton);

      expect(mockOnChange).toHaveBeenCalledWith("list");
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it("should call onChange with 'grid' when grid button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const gridButton = screen.getByLabelText("Grid view");
      await user.click(gridButton);

      expect(mockOnChange).toHaveBeenCalledWith("grid");
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it("should still allow clicking the already active button", async () => {
      const user = userEvent.setup();
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      await user.click(listButton);

      expect(mockOnChange).toHaveBeenCalledWith("list");
    });
  });

  describe("Accessibility Attributes", () => {
    it("should have aria-pressed attribute on buttons", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      expect(listButton).toHaveAttribute("aria-pressed", "true");
      expect(gridButton).toHaveAttribute("aria-pressed", "false");
    });

    it("should have correct aria-pressed when grid is active", () => {
      render(
        <ViewToggle value="grid" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      expect(listButton).toHaveAttribute("aria-pressed", "false");
      expect(gridButton).toHaveAttribute("aria-pressed", "true");
    });

    it("should have title attribute for tooltips", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      expect(listButton).toHaveAttribute("title", "List View");
      expect(gridButton).toHaveAttribute("title", "Grid View");
    });
  });

  describe("Disabled State", () => {
    it("should disable both buttons when disabled prop is true", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} disabled={true} />,
      );

      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      expect(listButton).toBeDisabled();
      expect(gridButton).toBeDisabled();
    });

    it("should not call onChange when button is disabled", async () => {
      const user = userEvent.setup();
      render(
        <ViewToggle value="list" onChange={mockOnChange} disabled={true} />,
      );

      const gridButton = screen.getByLabelText("Grid view");
      await user.click(gridButton);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("should enable buttons when disabled prop is false", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} disabled={false} />,
      );

      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      expect(listButton).not.toBeDisabled();
      expect(gridButton).not.toBeDisabled();
    });
  });

  describe("Button Sizing and Styling", () => {
    it("should have consistent button size", () => {
      render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const listButton = screen.getByLabelText("List view");
      const gridButton = screen.getByLabelText("Grid view");

      expect(listButton).toHaveClass("h-8", "w-8", "p-0");
      expect(gridButton).toHaveClass("h-8", "w-8", "p-0");
    });

    it("should have proper container styling", () => {
      const { container } = render(
        <ViewToggle value="list" onChange={mockOnChange} />,
      );

      const toggleGroup = container.firstChild;
      expect(toggleGroup).toHaveClass(
        "flex",
        "items-center",
        "gap-1",
        "rounded-md",
        "border",
        "bg-background",
        "p-1",
      );
    });
  });
});
