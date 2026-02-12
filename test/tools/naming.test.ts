import { describe, it, expect } from 'vitest';
import { pathToToolName, extractServiceGroup } from '../../src/tools/naming.js';

describe('pathToToolName', () => {
  it('maps GET collection to getList', () => {
    expect(pathToToolName('/api/app/warehouse', 'GET')).toBe('warehouse_getList');
  });

  it('maps GET with {id} to get', () => {
    expect(pathToToolName('/api/app/warehouse/{id}', 'GET')).toBe('warehouse_get');
  });

  it('maps POST to create', () => {
    expect(pathToToolName('/api/app/warehouse', 'POST')).toBe('warehouse_create');
  });

  it('maps PUT with {id} to update', () => {
    expect(pathToToolName('/api/app/warehouse/{id}', 'PUT')).toBe('warehouse_update');
  });

  it('maps DELETE with {id} to delete', () => {
    expect(pathToToolName('/api/app/warehouse/{id}', 'DELETE')).toBe('warehouse_delete');
  });

  it('maps sub-path GET to action name', () => {
    expect(pathToToolName('/api/app/warehouse/lookup', 'GET')).toBe('warehouse_lookup');
  });

  it('converts kebab-case to camelCase', () => {
    expect(pathToToolName('/api/app/cash-flow-report', 'POST')).toBe('cashFlowReport_create');
  });

  it('handles multi-segment kebab paths', () => {
    expect(pathToToolName('/api/app/bank-account/by-code', 'GET')).toBe('bankAccount_byCode');
  });
});

describe('extractServiceGroup', () => {
  it('extracts simple service name', () => {
    expect(extractServiceGroup('/api/app/warehouse')).toBe('warehouse');
    expect(extractServiceGroup('/api/app/warehouse/{id}')).toBe('warehouse');
    expect(extractServiceGroup('/api/app/warehouse/lookup')).toBe('warehouse');
  });

  it('converts kebab-case to camelCase', () => {
    expect(extractServiceGroup('/api/app/cash-flow-report')).toBe('cashFlowReport');
    expect(extractServiceGroup('/api/app/bank-account')).toBe('bankAccount');
  });
});
