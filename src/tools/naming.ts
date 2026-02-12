/**
 * Convert ABP API path to MCP tool name.
 *
 * ABP route: /api/app/{service-name}/{action}
 * MCP tool:  {serviceName}_{action}
 *
 * Examples:
 *   /api/app/warehouse          GET  -> warehouse_getList
 *   /api/app/warehouse/{id}     GET  -> warehouse_get
 *   /api/app/warehouse          POST -> warehouse_create
 *   /api/app/warehouse/{id}     PUT  -> warehouse_update
 *   /api/app/warehouse/{id}     DELETE -> warehouse_delete
 *   /api/app/warehouse/lookup   GET  -> warehouse_getLookup
 *   /api/app/cash-flow-report   POST -> cashFlowReport_generate
 */
export function pathToToolName(path: string, method: string): string {
  // Remove /api/app/ prefix
  const stripped = path.replace(/^\/api\/app\//, '');

  // Split into segments, removing path params like {id}
  const segments = stripped.split('/').filter(s => !s.startsWith('{'));

  if (segments.length === 0) return 'unknown';

  // First segment is the service name (kebab-case -> camelCase)
  const serviceName = kebabToCamel(segments[0]);

  // Remaining segments form the action
  const actionParts = segments.slice(1);

  if (actionParts.length === 0) {
    // Root endpoint — action derived from HTTP method
    return `${serviceName}_${methodToAction(method, path)}`;
  }

  // Join action parts as camelCase
  const action = actionParts.map((part, i) => {
    const camel = kebabToCamel(part);
    return i === 0 ? camel : capitalize(camel);
  }).join('');

  // Prefix with method hint if needed for disambiguation
  const prefix = getActionPrefix(method, path);
  return `${serviceName}_${prefix}${prefix ? capitalize(action) : action}`;
}

/**
 * Extract the service group name from a path.
 * /api/app/warehouse/lookup -> warehouse
 * /api/app/cash-flow-report -> cashFlowReport
 */
export function extractServiceGroup(path: string): string {
  const stripped = path.replace(/^\/api\/app\//, '');
  const firstSegment = stripped.split('/')[0];
  return kebabToCamel(firstSegment);
}

function methodToAction(method: string, path: string): string {
  const hasId = path.includes('{');
  switch (method.toUpperCase()) {
    case 'GET': return hasId ? 'get' : 'getList';
    case 'POST': return 'create';
    case 'PUT': return 'update';
    case 'DELETE': return 'delete';
    case 'PATCH': return 'patch';
    default: return method.toLowerCase();
  }
}

function getActionPrefix(method: string, path: string): string {
  // For sub-actions with method context, we might need a prefix
  // e.g., POST /api/app/cash-flow-report -> generate (not create, since it's a report)
  // For most cases, no prefix needed since the action segment is descriptive
  return '';
}

function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function capitalize(str: string): string {
  if (!str) return str;
  return str[0].toUpperCase() + str.slice(1);
}

/**
 * Generate a human-readable description for a tool from its operation details.
 */
export function generateDescription(
  path: string,
  method: string,
  summary: string,
): string {
  if (summary) return summary;

  const serviceName = extractServiceGroup(path);
  const hasId = path.includes('{');

  switch (method.toUpperCase()) {
    case 'GET':
      return hasId ? `Get a ${serviceName} by ID` : `List ${serviceName} records`;
    case 'POST':
      return `Create a new ${serviceName}`;
    case 'PUT':
      return `Update a ${serviceName}`;
    case 'DELETE':
      return `Delete a ${serviceName}`;
    default:
      return `${method} ${path}`;
  }
}
