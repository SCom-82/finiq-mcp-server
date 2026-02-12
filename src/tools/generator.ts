import type { ParsedOperation } from '../swagger/parser.js';
import { pathToToolName, generateDescription } from './naming.js';
import { operationToInputSchema, type JsonSchema } from './schema-mapper.js';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  operation: ParsedOperation;
}

/**
 * Generate MCP tool definitions from parsed OpenAPI operations.
 */
export function generateTools(operations: ParsedOperation[]): McpToolDefinition[] {
  const tools: McpToolDefinition[] = [];
  const nameCount = new Map<string, number>();

  for (const op of operations) {
    let name = pathToToolName(op.path, op.method);

    // Handle duplicate names by appending a suffix
    const count = nameCount.get(name) ?? 0;
    nameCount.set(name, count + 1);
    if (count > 0) {
      name = `${name}_${count}`;
    }

    const description = generateDescription(op.path, op.method, op.summary);
    const inputSchema = operationToInputSchema(op);

    tools.push({
      name,
      description,
      inputSchema,
      operation: op,
    });
  }

  return tools;
}
