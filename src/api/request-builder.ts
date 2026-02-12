import type { ParsedOperation } from '../swagger/parser.js';

export interface BuiltRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

/**
 * Build an HTTP request from MCP tool arguments and the operation definition.
 * Routes arguments to the correct location: path params, query params, or request body.
 */
export function buildRequest(
  operation: ParsedOperation,
  args: Record<string, unknown>,
): BuiltRequest {
  let path = operation.path;
  const query: Record<string, string> = {};
  const bodyFields: Record<string, unknown> = {};

  // Collect known param names
  const pathParamNames = new Set<string>();
  const queryParamNames = new Set<string>();

  for (const param of operation.parameters) {
    if (param.in === 'path') pathParamNames.add(param.name);
    if (param.in === 'query') queryParamNames.add(param.name);
  }

  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;

    if (pathParamNames.has(key)) {
      // Substitute path parameter
      path = path.replace(`{${key}}`, encodeURIComponent(String(value)));
    } else if (queryParamNames.has(key)) {
      // Query parameter
      query[key] = String(value);
    } else if (key === 'body') {
      // Explicit body wrapper
      return {
        method: operation.method,
        path,
        query: Object.keys(query).length > 0 ? query : undefined,
        body: value,
      };
    } else {
      // Assume it's a body field (flattened from request body schema)
      bodyFields[key] = value;
    }
  }

  const hasBody = Object.keys(bodyFields).length > 0;

  return {
    method: operation.method,
    path,
    query: Object.keys(query).length > 0 ? query : undefined,
    body: hasBody ? bodyFields : undefined,
  };
}
