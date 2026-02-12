import type { McpToolDefinition } from '../generator.js';

/**
 * All mode: expose every endpoint as an individual MCP tool.
 */
export function filterAllMode(tools: McpToolDefinition[]): McpToolDefinition[] {
  return tools;
}
