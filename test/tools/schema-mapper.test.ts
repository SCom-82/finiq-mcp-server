import { describe, it, expect } from 'vitest';
import { operationToInputSchema } from '../../src/tools/schema-mapper.js';
import type { ParsedOperation } from '../../src/swagger/parser.js';

describe('operationToInputSchema', () => {
  it('maps path parameters as required', () => {
    const op: ParsedOperation = {
      path: '/api/app/warehouse/{id}',
      method: 'GET',
      operationId: 'Warehouse_Get',
      summary: 'Get warehouse',
      tags: ['Warehouse'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBodyRequired: false,
    };

    const schema = operationToInputSchema(op);
    expect(schema.type).toBe('object');
    expect(schema.properties!['id'].type).toBe('string');
    expect(schema.required).toContain('id');
  });

  it('maps query parameters with ABP pagination defaults', () => {
    const op: ParsedOperation = {
      path: '/api/app/warehouse',
      method: 'GET',
      operationId: 'Warehouse_GetList',
      summary: 'Get list',
      tags: ['Warehouse'],
      parameters: [
        { name: 'skipCount', in: 'query', schema: { type: 'integer' } },
        { name: 'maxResultCount', in: 'query', schema: { type: 'integer' } },
        { name: 'filter', in: 'query', schema: { type: 'string' } },
      ],
      requestBodyRequired: false,
    };

    const schema = operationToInputSchema(op);
    expect(schema.properties!['skipCount'].default).toBe(0);
    expect(schema.properties!['maxResultCount'].default).toBe(10);
  });

  it('flattens request body properties into schema', () => {
    const op: ParsedOperation = {
      path: '/api/app/warehouse',
      method: 'POST',
      operationId: 'Warehouse_Create',
      summary: 'Create warehouse',
      tags: ['Warehouse'],
      parameters: [],
      requestBodySchema: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      requestBodyRequired: true,
    };

    const schema = operationToInputSchema(op);
    expect(schema.properties!['code'].type).toBe('string');
    expect(schema.properties!['name'].type).toBe('string');
    expect(schema.properties!['isActive'].type).toBe('boolean');
    expect(schema.required).toContain('code');
    expect(schema.required).toContain('name');
  });

  it('merges path params and body into one schema', () => {
    const op: ParsedOperation = {
      path: '/api/app/warehouse/{id}',
      method: 'PUT',
      operationId: 'Warehouse_Update',
      summary: 'Update warehouse',
      tags: ['Warehouse'],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBodySchema: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
          name: { type: 'string' },
        },
      },
      requestBodyRequired: true,
    };

    const schema = operationToInputSchema(op);
    expect(schema.properties!['id']).toBeDefined();
    expect(schema.properties!['code']).toBeDefined();
    expect(schema.required).toContain('id');
    expect(schema.required).toContain('code');
  });
});
