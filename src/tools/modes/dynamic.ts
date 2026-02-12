import type { McpToolDefinition } from '../generator.js';
import { extractServiceGroup } from '../naming.js';

/**
 * Dynamic mode: instead of exposing all tools, expose 3 meta-tools:
 * - listServices: list available API service groups
 * - getEndpointSchema: get schema for a specific endpoint
 * - callEndpoint: call any endpoint by name
 *
 * Returns the meta-tool definitions plus keeps all real tools for execution lookup.
 */

export interface DynamicModeResult {
  metaTools: McpToolDefinition[];
  allTools: McpToolDefinition[];
}

export function buildDynamicMode(tools: McpToolDefinition[]): DynamicModeResult {
  // Build service group index
  const groups = new Map<string, string[]>();
  for (const tool of tools) {
    const group = extractServiceGroup(tool.operation.path);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(tool.name);
  }

  const serviceList = Array.from(groups.entries())
    .map(([name, endpoints]) => `${name} (${endpoints.length} endpoints)`)
    .join('\n');

  const toolIndex = new Map(tools.map(t => [t.name, t]));

  const listServices: McpToolDefinition = {
    name: 'listServices',
    description: 'List all available Finance API service groups and their endpoints',
    inputSchema: {
      type: 'object',
      properties: {
        group: {
          type: 'string',
          description: 'Optional: filter by service group name to see its endpoints',
        },
      },
    },
    operation: null as unknown as McpToolDefinition['operation'],
  };

  const getEndpointSchema: McpToolDefinition = {
    name: 'getEndpointSchema',
    description: 'Get the input schema and details for a specific API endpoint tool',
    inputSchema: {
      type: 'object',
      properties: {
        toolName: {
          type: 'string',
          description: 'The tool name to get schema for (e.g. warehouse_getList)',
        },
      },
      required: ['toolName'],
    },
    operation: null as unknown as McpToolDefinition['operation'],
  };

  const callEndpoint: McpToolDefinition = {
    name: 'callEndpoint',
    description: 'Call any Finance API endpoint by tool name with parameters',
    inputSchema: {
      type: 'object',
      properties: {
        toolName: {
          type: 'string',
          description: 'The tool name to call (e.g. warehouse_getList)',
        },
        params: {
          type: 'object',
          description: 'Parameters to pass to the endpoint',
        },
      },
      required: ['toolName'],
    },
    operation: null as unknown as McpToolDefinition['operation'],
  };

  return {
    metaTools: [listServices, getEndpointSchema, callEndpoint],
    allTools: tools,
  };
}

/**
 * Handle a dynamic mode meta-tool call.
 * Returns the response content or null if not a meta-tool.
 */
export function handleDynamicCall(
  toolName: string,
  args: Record<string, unknown>,
  tools: McpToolDefinition[],
): { isMetaTool: true; content: string; realToolName?: string; realArgs?: Record<string, unknown> } | { isMetaTool: false } {

  if (toolName === 'listServices') {
    const filterGroup = args.group as string | undefined;
    const groups = new Map<string, McpToolDefinition[]>();

    for (const tool of tools) {
      const group = extractServiceGroup(tool.operation.path);
      if (filterGroup && group.toLowerCase() !== filterGroup.toLowerCase()) continue;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(tool);
    }

    const lines: string[] = [];
    for (const [group, groupTools] of groups) {
      lines.push(`## ${group}`);
      for (const t of groupTools) {
        lines.push(`  - ${t.name}: ${t.description}`);
      }
      lines.push('');
    }

    return { isMetaTool: true, content: lines.join('\n') };
  }

  if (toolName === 'getEndpointSchema') {
    const target = args.toolName as string;
    const tool = tools.find(t => t.name === target);
    if (!tool) {
      return { isMetaTool: true, content: `Tool "${target}" not found. Use listServices to see available tools.` };
    }
    return {
      isMetaTool: true,
      content: JSON.stringify({
        name: tool.name,
        description: tool.description,
        method: tool.operation.method,
        path: tool.operation.path,
        inputSchema: tool.inputSchema,
      }, null, 2),
    };
  }

  if (toolName === 'callEndpoint') {
    const target = args.toolName as string;
    const params = (args.params ?? {}) as Record<string, unknown>;
    return { isMetaTool: true, content: '', realToolName: target, realArgs: params };
  }

  return { isMetaTool: false };
}
