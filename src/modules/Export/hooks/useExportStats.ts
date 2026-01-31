import { useQuery } from "@tanstack/react-query";
import type { ExportStatsData } from "../components/ExportStats";
import { exportKeys } from "../utils/queryKeys";

/**
 * Response from export stats API
 */
interface ExportStatsResponse {
  stats: ExportStatsData;
}

/**
 * Fetch export statistics
 */
async function fetchExportStats(): Promise<ExportStatsData> {
  const response = await fetch("/api/export");
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result: ExportStatsResponse = await response.json();
  return result.stats;
}

/**
 * Hook to fetch export statistics using TanStack Query.
 * Provides automatic caching, refetching, and error handling.
 */
export function useExportStats() {
  return useQuery({
    queryKey: exportKeys.stats(),
    queryFn: fetchExportStats,
  });
}
