import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Config } from './config/schema.js';
import type { McpToolDefinition } from './tools/generator.js';
import { FinanceApiClient } from './api/client.js';
import { buildRequest } from './api/request-builder.js';
import { formatResponse, type McpToolResult } from './api/response-handler.js';
import { buildDynamicMode, handleDynamicCall } from './tools/modes/dynamic.js';

/**
 * Create and configure the MCP server with Finance API tools.
 * Uses the low-level Server class so we can register tools with raw JSON schemas
 * (the high-level McpServer requires Zod schemas which we can't generate dynamically).
 */
export function createServer(config: Config, tools: McpToolDefinition[]): Server {
  const server = new Server(
    { name: 'finiq-mcp-server', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  const apiClient = new FinanceApiClient(config);

  // Build tool index for fast lookup
  const toolIndex = new Map<string, McpToolDefinition>();

  // Determine which tools to expose in list vs. execute
  let listedTools: McpToolDefinition[];
  let allToolsForExec: McpToolDefinition[];

  if (config.toolMode === 'dynamic') {
    const { metaTools, allTools: realTools } = buildDynamicMode(tools);
    listedTools = metaTools;
    allToolsForExec = tools;
    for (const t of metaTools) toolIndex.set(t.name, t);
    for (const t of tools) toolIndex.set(t.name, t);
  } else {
    listedTools = tools;
    allToolsForExec = tools;
    for (const t of tools) toolIndex.set(t.name, t);
  }

  // Handle tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listedTools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: {
        type: 'object' as const,
        properties: t.inputSchema.properties ?? {},
        required: t.inputSchema.required,
      },
    })),
  }));

  // Handle tools/call
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const toolArgs = (args ?? {}) as Record<string, unknown>;

    // Dynamic mode meta-tools
    if (config.toolMode === 'dynamic') {
      const result = handleDynamicCall(name, toolArgs, allToolsForExec);
      if (result.isMetaTool) {
        // Proxy call — callEndpoint delegates to a real tool
        if (result.realToolName) {
          const realTool = toolIndex.get(result.realToolName);
          if (!realTool || !realTool.operation) {
            return errorResult(`Tool "${result.realToolName}" not found. Use listServices to discover tools.`);
          }
          return await executeToolCall(apiClient, realTool, result.realArgs ?? {});
        }
        return { content: [{ type: 'text' as const, text: result.content }] };
      }
    }

    // Direct tool call
    const tool = toolIndex.get(name);
    if (!tool) {
      return errorResult(`Unknown tool: ${name}`);
    }

    // Meta-tool without operation (shouldn't happen in non-dynamic mode)
    if (!tool.operation) {
      return errorResult(`Tool "${name}" is a meta-tool and cannot be called directly`);
    }

    return await executeToolCall(apiClient, tool, toolArgs);
  });

  return server;
}

async function executeToolCall(
  apiClient: FinanceApiClient,
  tool: McpToolDefinition,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const request = buildRequest(tool.operation, args);
  const response = await apiClient.request(
    request.method,
    request.path,
    { query: request.query, body: request.body },
  );
  return formatResponse(response);
}

function errorResult(message: string): McpToolResult {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  };
}

/**
 * Start the server with stdio transport.
 */
export async function startStdio(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
