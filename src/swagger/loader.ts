import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Config } from '../config/schema.js';

export interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, OpenApiSchema> };
  definitions?: Record<string, OpenApiSchema>;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema: OpenApiSchema }>;
  };
  responses?: Record<string, { description?: string; content?: Record<string, { schema: OpenApiSchema }> }>;
}

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: OpenApiSchema;
  description?: string;
  type?: string;
  format?: string;
  enum?: unknown[];
}

export interface OpenApiSchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
  description?: string;
  nullable?: boolean;
  default?: unknown;
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  additionalProperties?: boolean | OpenApiSchema;
  'x-enumNames'?: string[];
}

const CACHE_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.finiq-mcp', 'cache');

/**
 * Fetch the Swagger/OpenAPI spec from the Finance API or a local file.
 */
export async function loadSwagger(config: Config): Promise<OpenApiSpec> {
  // Local file mode
  if (config.localSwagger) {
    const raw = await readFile(config.localSwagger, 'utf-8');
    return JSON.parse(raw) as OpenApiSpec;
  }

  const url = `${config.baseUrl.replace(/\/$/, '')}${config.swaggerPath}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-ApiKey': config.apiKey,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Authentication failed (${response.status}). Check your API key.`);
    }
    throw new Error(`Failed to fetch Swagger JSON: ${response.status} ${response.statusText}`);
  }

  const spec = (await response.json()) as OpenApiSpec;

  // Cache locally for offline use
  await cacheSpec(spec, config.baseUrl);

  return spec;
}

async function cacheSpec(spec: OpenApiSpec, baseUrl: string): Promise<void> {
  try {
    const hostname = new URL(baseUrl).hostname;
    const cacheFile = join(CACHE_DIR, `${hostname}.json`);
    if (!existsSync(dirname(cacheFile))) {
      await mkdir(dirname(cacheFile), { recursive: true });
    }
    await writeFile(cacheFile, JSON.stringify(spec, null, 2));
  } catch {
    // Cache failure is non-critical
  }
}
