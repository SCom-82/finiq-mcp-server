import { loadConfig } from './config/loader.js';
import { loadSwagger } from './swagger/loader.js';
import { parseOperations, filterAbpOperations } from './swagger/parser.js';
import { generateTools } from './tools/generator.js';
import { filterGroupedMode } from './tools/modes/grouped.js';
import { createServer, startStdio } from './server.js';
import type { Config } from './config/schema.js';
import type { McpToolDefinition } from './tools/generator.js';

export { loadConfig } from './config/loader.js';
export { loadSwagger } from './swagger/loader.js';
export { createServer, startStdio } from './server.js';
export type { Config } from './config/schema.js';

/**
 * Initialize the MCP server: load config, fetch swagger, generate tools, start.
 */
export async function init(argv?: string[]): Promise<void> {
  const config = loadConfig(argv);

  log(`FinIQ MCP Server starting...`);
  log(`Base URL: ${config.baseUrl}`);
  log(`Tool mode: ${config.toolMode}`);

  // Load and parse Swagger
  log(`Fetching Swagger spec...`);
  const spec = await loadSwagger(config);
  const allOps = parseOperations(spec);
  const abpOps = filterAbpOperations(allOps);
  log(`Parsed ${allOps.length} operations, ${abpOps.length} ABP app-service endpoints`);

  // Generate tools
  let tools: McpToolDefinition[] = generateTools(abpOps);
  log(`Generated ${tools.length} tool definitions`);

  // Apply mode filtering
  if (config.toolMode === 'grouped') {
    tools = filterGroupedMode(tools, config.enabledGroups);
    log(`Grouped mode: ${tools.length} tools after filtering (groups: ${config.enabledGroups.join(', ')})`);
  }

  // Create and start server
  const server = createServer(config, tools);

  if (config.httpPort) {
    log(`HTTP transport not yet implemented. Use stdio transport.`);
  }

  log(`Starting stdio transport...`);
  await startStdio(server);
  log(`Server connected via stdio`);
}

function log(msg: string): void {
  process.stderr.write(`[finiq-mcp] ${msg}\n`);
}
