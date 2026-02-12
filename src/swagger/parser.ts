import type { OpenApiSpec, OpenApiOperation, OpenApiParameter, OpenApiSchema } from './loader.js';

export interface ParsedOperation {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  tags: string[];
  parameters: OpenApiParameter[];
  requestBodySchema?: OpenApiSchema;
  requestBodyRequired: boolean;
  responseSchema?: OpenApiSchema;
}

/**
 * Extract all operations from the OpenAPI spec, resolving $ref references.
 */
export function parseOperations(spec: OpenApiSpec): ParsedOperation[] {
  const operations: ParsedOperation[] = [];
  const schemas = spec.components?.schemas ?? spec.definitions ?? {};

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch'].indexOf(method) === -1) continue;

      const operation = op as OpenApiOperation;
      const operationId = operation.operationId ?? `${method}_${path}`;

      // Resolve parameters
      const parameters = (operation.parameters ?? []).map(p => ({
        ...p,
        schema: p.schema ? resolveSchema(p.schema, schemas) : undefined,
      }));

      // Resolve request body
      let requestBodySchema: OpenApiSchema | undefined;
      let requestBodyRequired = false;
      if (operation.requestBody) {
        requestBodyRequired = operation.requestBody.required ?? false;
        const content = operation.requestBody.content;
        if (content) {
          const jsonContent = content['application/json'] ?? content['text/json'];
          if (jsonContent?.schema) {
            requestBodySchema = resolveSchema(jsonContent.schema, schemas);
          }
        }
      }

      // Resolve response schema (200/201)
      let responseSchema: OpenApiSchema | undefined;
      if (operation.responses) {
        const successResponse = operation.responses['200'] ?? operation.responses['201'];
        if (successResponse?.content) {
          const jsonContent = successResponse.content['application/json'] ?? successResponse.content['text/json'];
          if (jsonContent?.schema) {
            responseSchema = resolveSchema(jsonContent.schema, schemas);
          }
        }
      }

      operations.push({
        path,
        method: method.toUpperCase(),
        operationId,
        summary: operation.summary ?? operation.description ?? '',
        tags: operation.tags ?? [],
        parameters,
        requestBodySchema,
        requestBodyRequired,
        responseSchema,
      });
    }
  }

  return operations;
}

/**
 * Resolve $ref references in a schema, handling nested structures.
 * Uses a depth limit to prevent infinite recursion on circular refs.
 */
export function resolveSchema(
  schema: OpenApiSchema,
  schemas: Record<string, OpenApiSchema>,
  depth = 0,
): OpenApiSchema {
  if (depth > 8) return { type: 'object', description: '(deeply nested schema)' };

  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '').replace('#/definitions/', '');
    const resolved = schemas[refName];
    if (!resolved) return { type: 'object', description: `Unresolved: ${refName}` };
    return resolveSchema(resolved, schemas, depth + 1);
  }

  if (schema.allOf) {
    // Merge allOf schemas
    const merged: OpenApiSchema = { type: 'object', properties: {}, required: [] };
    for (const sub of schema.allOf) {
      const resolved = resolveSchema(sub, schemas, depth + 1);
      if (resolved.properties) {
        merged.properties = { ...merged.properties, ...resolved.properties };
      }
      if (resolved.required) {
        merged.required = [...(merged.required ?? []), ...resolved.required];
      }
    }
    return merged;
  }

  const result: OpenApiSchema = { ...schema };

  if (result.properties) {
    const resolvedProps: Record<string, OpenApiSchema> = {};
    for (const [key, prop] of Object.entries(result.properties)) {
      resolvedProps[key] = resolveSchema(prop, schemas, depth + 1);
    }
    result.properties = resolvedProps;
  }

  if (result.items) {
    result.items = resolveSchema(result.items, schemas, depth + 1);
  }

  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = resolveSchema(result.additionalProperties, schemas, depth + 1);
  }

  return result;
}

/**
 * Filter operations to only ABP app-service endpoints.
 */
export function filterAbpOperations(operations: ParsedOperation[]): ParsedOperation[] {
  return operations.filter(op => op.path.startsWith('/api/app/'));
}
