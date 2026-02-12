import { z } from 'zod';

export const ToolMode = z.enum(['all', 'grouped', 'dynamic']);
export type ToolMode = z.infer<typeof ToolMode>;

export const ConfigSchema = z.object({
  baseUrl: z.string().url('baseUrl must be a valid URL'),
  apiKey: z.string().min(1, 'apiKey is required'),
  toolMode: ToolMode.default('all'),
  enabledGroups: z.array(z.string()).default([]),
  swaggerPath: z.string().default('/swagger/v1/swagger.json'),
  localSwagger: z.string().optional(),
  httpPort: z.number().int().positive().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
