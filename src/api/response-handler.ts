import type { ApiResponse } from './client.js';

export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Format an API response into MCP tool result content.
 * Handles ABP paged results, arrays, and error responses.
 */
export function formatResponse(response: ApiResponse): McpToolResult {
  if (!response.ok) {
    return formatErrorResponse(response);
  }

  const data = response.data;

  if (data === null || data === undefined || data === '') {
    return {
      content: [{ type: 'text', text: response.status === 204 ? 'Success (no content)' : 'Empty response' }],
    };
  }

  // ABP paged result
  if (isPagedResult(data)) {
    const paged = data as { items: unknown[]; totalCount: number };
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalCount: paged.totalCount,
          items: paged.items,
          _meta: { returned: paged.items.length, total: paged.totalCount },
        }, null, 2),
      }],
    };
  }

  // Regular JSON
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function isPagedResult(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  return 'items' in data && 'totalCount' in data && Array.isArray((data as Record<string, unknown>).items);
}

function formatErrorResponse(response: ApiResponse): McpToolResult {
  const data = response.data as Record<string, unknown> | null;

  // ABP error format
  if (data && typeof data === 'object' && 'error' in data) {
    const abpError = data.error as Record<string, unknown>;
    const parts: string[] = [];

    parts.push(`Error ${response.status}: ${abpError.message ?? 'Unknown error'}`);

    if (abpError.code) {
      parts.push(`Code: ${abpError.code}`);
    }

    if (abpError.details) {
      parts.push(`Details: ${abpError.details}`);
    }

    if (abpError.validationErrors && Array.isArray(abpError.validationErrors)) {
      const validations = (abpError.validationErrors as Array<{ message: string; members?: string[] }>)
        .map(v => `  - ${v.members?.join(', ') ?? 'general'}: ${v.message}`)
        .join('\n');
      parts.push(`Validation errors:\n${validations}`);
    }

    // Auth hints
    if (response.status === 401) {
      parts.push('\nHint: Check your API key (FINIQ_API_KEY)');
    }
    if (response.status === 403) {
      parts.push('\nHint: The API key lacks the required permission for this operation');
    }

    return {
      content: [{ type: 'text', text: parts.join('\n') }],
      isError: true,
    };
  }

  // Generic error
  return {
    content: [{ type: 'text', text: `Error ${response.status}: ${JSON.stringify(data)}` }],
    isError: true,
  };
}
