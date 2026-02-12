/**
 * ABP Framework conventional controller route patterns.
 */

/**
 * Check if a path is an ABP conventional app-service route.
 */
export function isAbpAppRoute(path: string): boolean {
  return path.startsWith('/api/app/');
}

/**
 * Check if an endpoint is likely a file upload (multipart/form-data).
 * These are excluded from tool generation by default.
 */
export function isFileUploadEndpoint(
  contentTypes?: string[],
): boolean {
  if (!contentTypes) return false;
  return contentTypes.some(ct => ct.includes('multipart/form-data'));
}

/**
 * Check if an endpoint is a lookup endpoint.
 * Lookup endpoints return List<ComboboxItemDto> — a flat array of {value, text}.
 */
export function isLookupEndpoint(path: string): boolean {
  return path.endsWith('/lookup');
}
