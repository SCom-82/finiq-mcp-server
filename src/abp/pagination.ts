/**
 * Helper for working with ABP's PagedResultDto.
 */

export interface PagedResult<T = unknown> {
  items: T[];
  totalCount: number;
}

export function isPagedResult(data: unknown): data is PagedResult {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.items) && typeof obj.totalCount === 'number';
}

export function formatPagedSummary(result: PagedResult): string {
  return `Showing ${result.items.length} of ${result.totalCount} total records`;
}
