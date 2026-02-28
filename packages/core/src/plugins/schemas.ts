import { z } from 'zod';
import { GitHubStack } from '../constructs/base.js';
import { ActionsHelper } from './actions-helper.js';
import { SharedWorkflowHelper } from './shared-workflow-helper.js';
import { GitHubConstruct } from './types.js';

/**
 * Base schema for construct configuration
 */
export const ConstructConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Construct name is required')
    .regex(/^[a-zA-Z0-9-_]+$/, {
      message:
        'Construct name must contain only alphanumeric characters, hyphens, and underscores',
    }),
  package: z.string().min(1, 'Construct package is required'),
  config: z.record(z.string(), z.any()).optional(),
  actions: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional().default(true),
});

/**
 * Schema for stack configuration
 */
export const StackConfigSchema = z.object({
  name: z
    .string()
    .min(1, 'Stack name is required')
    .regex(/^[a-zA-Z0-9-_]+$/, {
      message:
        'Stack name must contain only alphanumeric characters, hyphens, and underscores',
    }),
  constructs: z
    .array(z.string())
    .min(1, 'Stack must have at least one construct')
    .refine((constructs) => new Set(constructs).size === constructs.length, {
      message: 'Stack constructs must be unique',
    }),
  config: z.record(z.string(), z.any()).optional(),
  actions: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for individual actions in the configuration
 */
export const ActionConfigSchema = z.object({
  orgRepo: z
    .string()
    .min(1, 'Organization/repository is required')
    .regex(/^[^\/]+\/[^\/]+$/, { message: 'Must be in format org/repo' }),
  ref: z.string().min(1, 'Git reference is required'),
  versionRef: z.string().min(1, 'Version reference is required'),
  functionName: z.string().min(1, 'Function name is required'),
  outputPath: z.string().min(1, 'Output path is required'),
  actionPath: z.string().optional(),
  generateCode: z.boolean().optional().default(false),
});

/**
 * Schema for the main dotgithub configuration
 */
export const DotGithubConfigSchema = z.object({
  version: z
    .string()
    .min(1, 'Version is required')
    .regex(/^\d+\.\d+\.\d+/, {
      message: 'Version must follow semantic versioning (e.g., 1.0.0)',
    }),
  rootDir: z.string().min(1, 'Root directory is required').default('src'),
  outputDir: z.string().min(1, 'Output directory is required').default('./'),
  actions: z.array(ActionConfigSchema).default([]),
  constructs: z
    .array(ConstructConfigSchema)
    .refine(
      (constructs) => {
        const names = constructs.map((c) => c.name);
        return new Set(names).size === names.length;
      },
      { message: 'Construct names must be unique' }
    )
    .default([]),
  stacks: z
    .array(StackConfigSchema)
    .refine(
      (stacks) => {
        const names = stacks.map((s) => s.name);
        return new Set(names).size === names.length;
      },
      { message: 'Stack names must be unique' }
    )
    .default([]),
  options: z
    .object({
      tokenSource: z.enum(['env', 'github']).optional().default('env'),
      formatting: z
        .object({
          prettier: z.boolean().optional().default(true),
        })
        .optional(),
    })
    .optional(),
});

/**
 * Construct metadata type (used by construct classes)
 */
export interface ConstructMetadata {
  name: string;
  version?: string;
  description?: string;
  dependencies?: string[];
  conflicts?: string[];
}

/**
 * Construct execution result type
 */
export interface ConstructExecutionResult {
  construct: GitHubConstruct;
  success: boolean;
  error?: Error;
  duration: number;
}

/**
 * Construct load result type
 */
export interface ConstructLoadResult {
  construct: GitHubConstruct;
  config: ConstructConfig;
  resolved: boolean;
}

/**
 * Construct description type
 */
export interface ConstructDescription {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  dependencies?: string[];
  conflicts?: string[];
  configSchema?: z.ZodType;
  tags?: string[];
  category?: string;
  minDotGithubVersion?: string;
  maxDotGithubVersion?: string;
}

/**
 * Utility function to validate construct configuration
 */
export function validateConstructConfig(
  config: unknown
): z.infer<typeof ConstructConfigSchema> {
  return ConstructConfigSchema.parse(config);
}

/**
 * Utility function to validate stack configuration
 */
export function validateStackConfig(
  config: unknown
): z.infer<typeof StackConfigSchema> {
  return StackConfigSchema.parse(config);
}

/**
 * Utility function to validate dotgithub configuration
 */
export function validateDotGithubConfig(
  config: unknown
): z.infer<typeof DotGithubConfigSchema> {
  return DotGithubConfigSchema.parse(config);
}

/**
 * Utility function to safely validate with error handling
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage?: string
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorDetails = error.issues
        .map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return {
        success: false,
        error: errorMessage ? `${errorMessage}: ${errorDetails}` : errorDetails,
      };
    }
    return {
      success: false,
      error: errorMessage || 'Validation failed',
    };
  }
}

/**
 * Type exports for use in other files
 */
export type ConstructConfig = z.infer<typeof ConstructConfigSchema>;
export type StackConfig = z.infer<typeof StackConfigSchema>;
export type ActionConfig = z.infer<typeof ActionConfigSchema>;
export type DotGithubConfig = z.infer<typeof DotGithubConfigSchema>;
