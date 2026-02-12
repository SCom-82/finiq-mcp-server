import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOperations, filterAbpOperations } from '../../src/swagger/parser.js';
import { generateTools } from '../../src/tools/generator.js';
import { filterGroupedMode } from '../../src/tools/modes/grouped.js';
import type { OpenApiSpec } from '../../src/swagger/loader.js';

const fixtureSpec = JSON.parse(
  readFileSync(join(__dirname, '..', 'fixtures', 'finance-swagger.json'), 'utf-8'),
) as OpenApiSpec;

describe('generateTools (from fixture)', () => {
  const allOps = parseOperations(fixtureSpec);
  const abpOps = filterAbpOperations(allOps);
  const tools = generateTools(abpOps);

  it('generates tools only for /api/app/ paths', () => {
    // The fixture has 9 operations total, 8 under /api/app/, 1 under /api/identity/
    expect(abpOps.length).toBe(8);
    expect(tools.length).toBe(8);
  });

  it('generates expected tool names', () => {
    const names = tools.map(t => t.name);
    expect(names).toContain('warehouse_getList');
    expect(names).toContain('warehouse_create');
    expect(names).toContain('warehouse_get');
    expect(names).toContain('warehouse_update');
    expect(names).toContain('warehouse_delete');
    expect(names).toContain('warehouse_lookup');
  });

  it('resolves $ref schemas in request body', () => {
    const createTool = tools.find(t => t.name === 'warehouse_create')!;
    expect(createTool.inputSchema.properties!['code']).toBeDefined();
    expect(createTool.inputSchema.properties!['name']).toBeDefined();
    expect(createTool.inputSchema.required).toContain('code');
  });

  it('includes cash flow report tool with kebab-case conversion', () => {
    const names = tools.map(t => t.name);
    expect(names).toContain('cashFlowReport_create');
  });
});

describe('filterGroupedMode', () => {
  const allOps = parseOperations(fixtureSpec);
  const abpOps = filterAbpOperations(allOps);
  const tools = generateTools(abpOps);

  it('filters by service group', () => {
    const filtered = filterGroupedMode(tools, ['warehouse']);
    expect(filtered.length).toBe(6); // getList, create, get, update, delete, lookup
    expect(filtered.every(t => t.name.startsWith('warehouse_'))).toBe(true);
  });

  it('supports multiple groups', () => {
    const filtered = filterGroupedMode(tools, ['warehouse', 'cashFlowReport']);
    expect(filtered.length).toBe(7); // 6 warehouse + 1 cashFlowReport
  });

  it('returns all tools when no groups specified', () => {
    const filtered = filterGroupedMode(tools, []);
    expect(filtered.length).toBe(tools.length);
  });
});
