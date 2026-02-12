import type { McpToolDefinition } from '../generator.js';
import { extractServiceGroup } from '../naming.js';

/**
 * Grouped mode: only expose tools for selected service groups.
 */
export function filterGroupedMode(
  tools: McpToolDefinition[],
  enabledGroups: string[],
): McpToolDefinition[] {
  if (enabledGroups.length === 0) return tools;

  const groupSet = new Set(enabledGroups.map(g => g.toLowerCase()));

  return tools.filter(tool => {
    const group = extractServiceGroup(tool.operation.path).toLowerCase();
    return groupSet.has(group);
  });
}
