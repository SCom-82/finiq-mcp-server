import type { OpenApiParameter, OpenApiSchema } from '../swagger/loader.js';
import type { ParsedOperation } from '../swagger/parser.js';

export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  description?: string;
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  format?: string;
}

/**
 * ABP pagination defaults added to getList endpoints.
 */
const ABP_PAGINATION_DEFAULTS: Record<string, { type: string; description: string; default: unknown }> = {
  skipCount: { type: 'integer', description: 'Number of records to skip (pagination offset)', default: 0 },
  maxResultCount: { type: 'integer', description: 'Maximum number of records to return', default: 10 },
  sorting: { type: 'string', description: 'Sorting expression (e.g. "name asc")', default: undefined },
  filter: { type: 'string', description: 'Text filter for searching', default: undefined },
};

/**
 * Convert an OpenAPI operation into a flat JSON Schema for MCP tool inputSchema.
 * Merges path params, query params, and request body into a single schema.
 */
export function operationToInputSchema(operation: ParsedOperation): JsonSchema {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];

  // 1. Path parameters (always required)
  for (const param of operation.parameters) {
    if (param.in === 'path') {
      properties[param.name] = paramToProperty(param);
      required.push(param.name);
    }
  }

  // 2. Query parameters
  for (const param of operation.parameters) {
    if (param.in === 'query') {
      const prop = paramToProperty(param);

      // Apply ABP pagination defaults
      if (param.name in ABP_PAGINATION_DEFAULTS) {
        const abpDef = ABP_PAGINATION_DEFAULTS[param.name];
        if (abpDef.default !== undefined) {
          prop.default = abpDef.default;
        }
        prop.description = prop.description || abpDef.description;
      }

      properties[param.name] = prop;
      if (param.required) {
        required.push(param.name);
      }
    }
  }

  // 3. Request body — flatten top-level properties into the schema
  if (operation.requestBodySchema) {
    const bodySchema = operation.requestBodySchema;

    if (bodySchema.properties) {
      for (const [key, prop] of Object.entries(bodySchema.properties)) {
        properties[key] = openApiToJsonSchema(prop);
      }
      // Add body required fields
      if (bodySchema.required) {
        for (const field of bodySchema.required) {
          if (!required.includes(field)) {
            required.push(field);
          }
        }
      }
    } else {
      // Non-object body — wrap it as "body" param
      properties['body'] = openApiToJsonSchema(bodySchema);
      if (operation.requestBodyRequired) {
        required.push('body');
      }
    }
  }

  return {
    type: 'object',
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    required: required.length > 0 ? required : undefined,
  };
}

function paramToProperty(param: OpenApiParameter): JsonSchemaProperty {
  if (param.schema) {
    return openApiToJsonSchema(param.schema, param.description);
  }
  return {
    type: param.type ?? 'string',
    description: param.description,
    enum: param.enum,
    format: param.format,
  };
}

/**
 * Convert an OpenAPI schema to a JSON Schema property.
 */
function openApiToJsonSchema(schema: OpenApiSchema, description?: string): JsonSchemaProperty {
  const result: JsonSchemaProperty = {
    type: mapType(schema),
    description: description ?? schema.description ?? cleanSchemaDescription(schema),
  };

  if (schema.enum) {
    result.enum = schema.enum;
    const names = schema['x-enumNames'];
    if (names && names.length === schema.enum.length) {
      const enumDesc = schema.enum.map((v, i) => `${v}=${names[i]}`).join(', ');
      result.description = result.description
        ? `${result.description} (${enumDesc})`
        : enumDesc;
    }
  }
  if (schema.default !== undefined) result.default = schema.default;
  if (schema.format) result.format = schema.format;

  if (schema.type === 'array' && schema.items) {
    result.items = openApiToJsonSchema(schema.items);
  }

  if (schema.type === 'object' && schema.properties) {
    result.properties = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      result.properties[key] = openApiToJsonSchema(prop);
    }
    if (schema.required) {
      result.required = schema.required;
    }
  }

  return result;
}

function mapType(schema: OpenApiSchema): string {
  if (schema.enum && !schema.type) return 'string';
  if (schema.type === 'integer') return 'integer';
  if (schema.type === 'number') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  if (schema.type === 'array') return 'array';
  if (schema.type === 'string') return 'string';
  if (schema.properties) return 'object';
  return 'string';
}

/**
 * Try to produce a short description from schema metadata.
 */
function cleanSchemaDescription(schema: OpenApiSchema): string | undefined {
  // ABP uses full namespace as schema IDs — strip for readability
  if (schema.description) {
    return schema.description.replace(/^Finance\.\w+\./, '');
  }
  return undefined;
}
