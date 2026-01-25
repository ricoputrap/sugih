"use client";

import type React from "react";

interface CircularProgressProps {
  /**
   * Percentage value (0-100+)
   * Values > 100 indicate over-budget scenarios
   */
  percentage: number;

  /**
   * Center content to display (e.g., spent amount)
   */
  centerContent?: React.ReactNode;

  /**
   * Size of the circle in pixels
   * @default 120
   */
  size?: number;

  /**
   * Radius of the circle's path
   * @default 45
   */
  radius?: number;

  /**
   * Stroke width of the progress ring
   * @default 6
   */
  strokeWidth?: number;

  /**
   * CSS class name for the container
   */
  className?: string;
}

/**
 * CircularProgress Component
 *
 * Displays a circular progress indicator with SVG.
 * Supports percentage values > 100% for over-budget scenarios.
 *
 * @example
 * <CircularProgress
 *   percentage={75}
 *   centerContent={<span>Rp 1.5M</span>}
 * />
 */
export function CircularProgress({
  percentage,
  centerContent,
  size = 120,
  radius = 45,
  strokeWidth = 6,
  className = "",
}: CircularProgressProps) {
  // Clamp display percentage to 100 for visual representation
  const displayPercentage = Math.min(percentage, 100);

  // Calculate circle circumference
  const circumference = 2 * Math.PI * radius;

  // Calculate stroke-dashoffset for progress
  // When percentage is 0, offset is circumference (no fill)
  // When percentage is 100, offset is 0 (full fill)
  const strokeDashoffset =
    circumference - (displayPercentage / 100) * circumference;

  // Determine gradient and colors based on percentage
  const getGradientId = () => {
    if (percentage > 100) {
      return "gradient-red"; // Over budget
    } else if (percentage >= 80) {
      return "gradient-orange"; // Near limit
    } else {
      return "gradient-green"; // On track
    }
  };

  const gradientId = getGradientId();

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      data-testid="circular-progress"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        role="img"
        aria-label={`${percentage}% spent`}
      >
        {/* Define gradients */}
        <defs>
          {/* Green gradient for on-track (0-79%) */}
          <linearGradient
            id="gradient-green"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Orange gradient for near limit (80-99%) */}
          <linearGradient
            id="gradient-orange"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          {/* Red gradient for over budget (100%+) */}
          <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Purple gradient for default/secondary */}
          <linearGradient
            id="gradient-purple"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Background circle (light gray) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
          data-testid="progress-circle"
        />
      </svg>

      {/* Center content */}
      {centerContent && (
        <div className="absolute text-center" data-testid="center-content">
          {centerContent}
        </div>
      )}
    </div>
  );
}
