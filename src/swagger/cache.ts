import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { OpenApiSpec } from './loader.js';

const CACHE_DIR = join(process.env.HOME || process.env.USERPROFILE || '.', '.finiq-mcp', 'cache');

/**
 * Try to load a cached swagger spec for the given base URL.
 * Returns null if no cached version exists.
 */
export async function loadCachedSpec(baseUrl: string): Promise<OpenApiSpec | null> {
  try {
    const hostname = new URL(baseUrl).hostname;
    const cacheFile = join(CACHE_DIR, `${hostname}.json`);
    if (!existsSync(cacheFile)) return null;
    const raw = await readFile(cacheFile, 'utf-8');
    return JSON.parse(raw) as OpenApiSpec;
  } catch {
    return null;
  }
}
