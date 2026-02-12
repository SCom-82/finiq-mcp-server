import { ConfigSchema, type Config } from './schema.js';

/**
 * Parse CLI arguments into a config-like object.
 * Supports: --base-url, --api-key, --tool-mode, --enabled-groups, --swagger-path, --local-swagger, --http-port
 */
function parseCliArgs(argv: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--base-url':
        result.baseUrl = next; i++; break;
      case '--api-key':
        result.apiKey = next; i++; break;
      case '--tool-mode':
        result.toolMode = next; i++; break;
      case '--enabled-groups':
        result.enabledGroups = next?.split(',').map(s => s.trim()); i++; break;
      case '--swagger-path':
        result.swaggerPath = next; i++; break;
      case '--local-swagger':
        result.localSwagger = next; i++; break;
      case '--http':
      case '--http-port':
        result.httpPort = next ? parseInt(next, 10) : 3000; i++; break;
    }
  }
  return result;
}

/**
 * Load config from environment variables.
 */
function loadEnv(): Record<string, unknown> {
  const env = process.env;
  const result: Record<string, unknown> = {};

  if (env.FINIQ_BASE_URL) result.baseUrl = env.FINIQ_BASE_URL;
  if (env.FINIQ_API_KEY) result.apiKey = env.FINIQ_API_KEY;
  if (env.FINIQ_TOOL_MODE) result.toolMode = env.FINIQ_TOOL_MODE;
  if (env.FINIQ_ENABLED_GROUPS) {
    result.enabledGroups = env.FINIQ_ENABLED_GROUPS.split(',').map(s => s.trim());
  }
  if (env.FINIQ_SWAGGER_PATH) result.swaggerPath = env.FINIQ_SWAGGER_PATH;
  if (env.FINIQ_LOCAL_SWAGGER) result.localSwagger = env.FINIQ_LOCAL_SWAGGER;
  if (env.FINIQ_HTTP_PORT) result.httpPort = parseInt(env.FINIQ_HTTP_PORT, 10);

  return result;
}

/**
 * Load and validate configuration.
 * Priority: CLI args > env vars > defaults.
 */
export function loadConfig(argv?: string[]): Config {
  const envConfig = loadEnv();
  const cliConfig = parseCliArgs(argv ?? process.argv.slice(2));

  // CLI overrides env
  const merged = { ...envConfig, ...cliConfig };

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    const errors = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid configuration:\n${errors}`);
  }
  return result.data;
}
