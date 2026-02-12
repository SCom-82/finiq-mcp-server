#!/usr/bin/env node

import { init } from '../src/index.js';

init().catch((error: Error) => {
  process.stderr.write(`[finiq-mcp] Fatal error: ${error.message}\n`);
  if (error.stack) {
    process.stderr.write(`${error.stack}\n`);
  }
  process.exit(1);
});
