import type { PluginDescription } from './schemas.js';
import type { DotGitHubPlugin } from './types.js';

/**
 * Utility functions for working with plugins
 */

/**
 * Format plugin description for display
 */
export function formatPluginDescription(
  description: PluginDescription
): string {
  const lines: string[] = [];

  lines.push(`Name: ${description.name}`);

  if (description.version) {
    lines.push(`Version: ${description.version}`);
  }

  if (description.description) {
    lines.push(`Description: ${description.description}`);
  }

  if (description.author) {
    lines.push(`Author: ${description.author}`);
  }

  if (description.license) {
    lines.push(`License: ${description.license}`);
  }

  if (description.category) {
    lines.push(`Category: ${description.category}`);
  }

  if (description.keywords && description.keywords.length > 0) {
    lines.push(`Keywords: ${description.keywords.join(', ')}`);
  }

  if (description.dependencies && description.dependencies.length > 0) {
    lines.push(`Dependencies: ${description.dependencies.join(', ')}`);
  }

  if (description.conflicts && description.conflicts.length > 0) {
    lines.push(`Conflicts: ${description.conflicts.join(', ')}`);
  }

  // Add detailed configuration schema information
  if (description.configSchema) {
    const schemaInfo = extractConfigSchemaInfo(description.configSchema);
    lines.push('\n' + formatConfigSchemaInfo(schemaInfo));
  }

  if (description.repository) {
    lines.push(`\nRepository: ${description.repository}`);
  }

  if (description.homepage) {
    lines.push(`Homepage: ${description.homepage}`);
  }

  return lines.join('\n');
}

/**
 * Get configuration schema as JSON schema
 */
export function getConfigSchemaAsJsonSchema(
  plugin: DotGitHubPlugin
): any | null {
  if (plugin.describe) {
    const description = plugin.describe();
    if (
      description &&
      typeof description === 'object' &&
      'configSchema' in description
    ) {
      // Convert Zod schema to JSON schema if possible
      // This is a simplified version - in practice you might want to use a library like zod-to-json-schema
      return description.configSchema;
    }
  }
  return null;
}

/**
 * Validate plugin configuration against plugin's schema
 */
export function validatePluginConfigWithSchema(
  plugin: DotGitHubPlugin,
  config: unknown
): { success: true; data: any } | { success: false; error: string } {
  if (plugin.describe) {
    const description = plugin.describe();
    if (
      description &&
      typeof description === 'object' &&
      'configSchema' in description &&
      description.configSchema
    ) {
      try {
        const result = description.configSchema.parse(config);
        return { success: true, data: result };
      } catch (error) {
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Configuration validation failed' };
      }
    }
  }

  return {
    success: false,
    error: `Plugin "${plugin.name}" does not provide a configuration schema`,
  };
}

/**
 * Get plugin categories from a list of plugin descriptions
 */
export function getPluginCategories(
  descriptions: PluginDescription[]
): string[] {
  const categories = new Set<string>();

  for (const desc of descriptions) {
    if (desc.category) {
      categories.add(desc.category);
    }
  }

  return Array.from(categories).sort();
}

/**
 * Filter plugins by category
 */
export function filterPluginsByCategory(
  descriptions: PluginDescription[],
  category: string
): PluginDescription[] {
  return descriptions.filter((desc) => desc.category === category);
}

/**
 * Search plugins by keyword
 */
export function searchPluginsByKeyword(
  descriptions: PluginDescription[],
  keyword: string
): PluginDescription[] {
  const lowerKeyword = keyword.toLowerCase();

  return descriptions.filter((desc) => {
    // Search in name
    if (desc.name.toLowerCase().includes(lowerKeyword)) {
      return true;
    }

    // Search in description
    if (
      desc.description &&
      desc.description.toLowerCase().includes(lowerKeyword)
    ) {
      return true;
    }

    // Search in keywords
    if (desc.keywords) {
      for (const kw of desc.keywords) {
        if (kw.toLowerCase().includes(lowerKeyword)) {
          return true;
        }
      }
    }

    // Search in tags
    if (desc.tags) {
      for (const tag of desc.tags) {
        if (tag.toLowerCase().includes(lowerKeyword)) {
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Sort plugins by various criteria
 */
export function sortPlugins(
  descriptions: PluginDescription[],
  sortBy: 'name' | 'version' | 'category' = 'name'
): PluginDescription[] {
  return [...descriptions].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'version':
        // Simple version comparison - in practice you might want to use semver
        return (b.version || '0.0.0').localeCompare(a.version || '0.0.0');
      case 'category':
        const categoryA = a.category || 'uncategorized';
        const categoryB = b.category || 'uncategorized';
        return categoryA.localeCompare(categoryB);
      default:
        return 0;
    }
  });
}

/**
 * Extract detailed configuration information from a Zod schema
 */
export function extractConfigSchemaInfo(schema: any): {
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: any;
    validation?: string;
    options?: any[];
  }>;
  examples: any[];
} {
  const fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: any;
    validation?: string;
    options?: any[];
  }> = [];
  const examples: any[] = [];

  if (!schema || typeof schema !== 'object') {
    return { fields, examples };
  }

  // Handle Zod object schemas
  if (
    schema &&
    (schema._def?.typeName === 'ZodObject' || schema.def?.type === 'object')
  ) {
    let shape;
    if (schema._def?.shape) {
      shape =
        typeof schema._def.shape === 'function'
          ? schema._def.shape()
          : schema._def.shape;
    } else if (schema.def?.shape) {
      shape =
        typeof schema.def.shape === 'function'
          ? schema.def.shape()
          : schema.def.shape;
    }

    if (shape) {
      for (const [fieldName, fieldSchema] of Object.entries(shape)) {
        const fieldInfo = extractFieldInfo(fieldName, fieldSchema as any);
        fields.push(fieldInfo);
      }
    }
  }

  // Generate example configurations
  examples.push(generateExampleConfig(fields));

  return { fields, examples };
}

/**
 * Extract information about a single field from a Zod schema
 */
function extractFieldInfo(
  name: string,
  schema: any
): {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
  validation?: string;
  options?: any[];
} {
  const fieldInfo: any = {
    name,
    type: 'unknown',
    required: true,
  };

  if (!schema || (!schema._def && !schema.def)) {
    return fieldInfo;
  }

  const def = schema._def || schema.def;
  const typeName = def.typeName || def.type;

  // Extract type information
  if (typeName) {
    fieldInfo.type = getZodTypeName(typeName);
  }

  // Handle nested types (like ZodDefault, ZodOptional)
  let currentSchema = schema;
  let currentDef = def;
  let currentTypeName = typeName;

  // Unwrap nested types to get the actual type
  while (
    currentTypeName === 'ZodDefault' ||
    currentTypeName === 'default' ||
    currentTypeName === 'ZodOptional' ||
    currentTypeName === 'optional'
  ) {
    if (currentTypeName === 'ZodOptional' || currentTypeName === 'optional') {
      fieldInfo.required = false;
    }

    // Get the inner type
    const innerType = currentDef.innerType;
    if (innerType) {
      currentSchema = innerType;
      currentDef = innerType._def || innerType.def;
      currentTypeName = currentDef?.typeName || currentDef?.type;
    } else {
      break;
    }
  }

  // Set the final type
  if (currentTypeName) {
    fieldInfo.type = getZodTypeName(currentTypeName);
  }

  // Extract description from the original schema (descriptions are often on the outermost wrapper)
  if (schema.description) {
    fieldInfo.description = schema.description;
  } else if (currentSchema.description) {
    fieldInfo.description = currentSchema.description;
  }

  // Extract default value
  if (def.defaultValue !== undefined) {
    try {
      fieldInfo.defaultValue =
        typeof def.defaultValue === 'function'
          ? def.defaultValue()
          : def.defaultValue;
    } catch (error) {
      // defaultValue might be a getter, try accessing it directly
      fieldInfo.defaultValue = def.defaultValue;
    }
  }

  // Extract description - check multiple possible locations
  if (def.description) {
    fieldInfo.description = def.description;
  } else if (currentDef.description) {
    fieldInfo.description = currentDef.description;
  } else if (currentSchema.description) {
    fieldInfo.description = currentSchema.description;
  }

  // Extract validation rules from the unwrapped schema
  const validations: string[] = [];

  // String validations
  if (currentTypeName === 'ZodString' || currentTypeName === 'string') {
    if (currentDef.checks) {
      for (const check of currentDef.checks) {
        switch (check.kind) {
          case 'min':
            validations.push(`minimum length: ${check.value}`);
            break;
          case 'max':
            validations.push(`maximum length: ${check.value}`);
            break;
          case 'regex':
            validations.push(`pattern: ${check.regex.source}`);
            break;
          case 'email':
            validations.push('must be a valid email');
            break;
          case 'url':
            validations.push('must be a valid URL');
            break;
        }
      }
    }
  }

  // Number validations
  if (currentTypeName === 'ZodNumber' || currentTypeName === 'number') {
    if (currentDef.checks) {
      for (const check of currentDef.checks) {
        switch (check.kind) {
          case 'min':
            validations.push(`minimum: ${check.value}`);
            break;
          case 'max':
            validations.push(`maximum: ${check.value}`);
            break;
          case 'int':
            validations.push('must be an integer');
            break;
        }
      }
    }
  }

  // Array validations
  if (currentTypeName === 'ZodArray' || currentTypeName === 'array') {
    if (currentDef.minLength !== undefined) {
      validations.push(`minimum items: ${currentDef.minLength.value}`);
    }
    if (currentDef.maxLength !== undefined) {
      validations.push(`maximum items: ${currentDef.maxLength.value}`);
    }
  }

  // Enum validations
  if (currentTypeName === 'ZodEnum' || currentTypeName === 'enum') {
    fieldInfo.options = currentDef.values;
    validations.push(`options: ${currentDef.values.join(', ')}`);
  }

  if (validations.length > 0) {
    fieldInfo.validation = validations.join(', ');
  }

  return fieldInfo;
}

/**
 * Get a human-readable type name from Zod type name
 */
function getZodTypeName(zodTypeName: string): string {
  const typeMap: Record<string, string> = {
    ZodString: 'string',
    ZodNumber: 'number',
    ZodBoolean: 'boolean',
    ZodArray: 'array',
    ZodObject: 'object',
    ZodEnum: 'enum',
    ZodOptional: 'optional',
    ZodDefault: 'default',
    ZodUnion: 'union',
    ZodLiteral: 'literal',
    ZodDate: 'date',
    ZodAny: 'any',
    ZodUnknown: 'unknown',
  };

  return typeMap[zodTypeName] || zodTypeName;
}

/**
 * Generate example configuration based on field information
 */
function generateExampleConfig(
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
    options?: any[];
  }>
): any {
  const example: any = {};

  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      example[field.name] = field.defaultValue;
    } else if (field.options && field.options.length > 0) {
      example[field.name] = field.options[0];
    } else {
      // Generate example value based on type
      switch (field.type) {
        case 'string':
          example[field.name] =
            field.name === 'environment' ? 'production' : 'example-value';
          break;
        case 'number':
          example[field.name] = 10;
          break;
        case 'boolean':
          example[field.name] = true;
          break;
        case 'array':
          example[field.name] = [];
          break;
        case 'object':
          example[field.name] = {};
          break;
        default:
          example[field.name] = null;
      }
    }
  }

  return example;
}

/**
 * Format configuration schema information for display
 */
export function formatConfigSchemaInfo(schemaInfo: {
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    defaultValue?: any;
    validation?: string;
    options?: any[];
  }>;
  examples: any[];
}): string {
  const lines: string[] = [];

  if (schemaInfo.fields.length === 0) {
    lines.push('No configuration schema available');
    return lines.join('\n');
  }

  lines.push('Configuration Schema:');
  lines.push('');

  for (const field of schemaInfo.fields) {
    const required = field.required ? '✅ Required' : '❌ Optional';
    lines.push(`  ${field.name} (${field.type}) - ${required}`);

    if (field.description) {
      lines.push(`    Description: ${field.description}`);
    }

    if (field.defaultValue !== undefined) {
      lines.push(`    Default: ${JSON.stringify(field.defaultValue)}`);
    }

    if (field.validation) {
      lines.push(`    Validation: ${field.validation}`);
    }

    if (field.options && field.options.length > 0) {
      lines.push(
        `    Options: ${field.options.map((opt) => JSON.stringify(opt)).join(', ')}`
      );
    }

    lines.push('');
  }

  if (schemaInfo.examples.length > 0) {
    lines.push('Example Configuration:');
    lines.push('```json');
    lines.push(JSON.stringify(schemaInfo.examples[0], null, 2));
    lines.push('```');
  }

  return lines.join('\n');
}

/**
 * Generate plugin documentation in markdown format
 */
export function generatePluginMarkdown(description: PluginDescription): string {
  const lines: string[] = [];

  lines.push(`# ${description.name}`);
  lines.push('');

  if (description.description) {
    lines.push(description.description);
    lines.push('');
  }

  if (description.version) {
    lines.push(`**Version:** ${description.version}`);
  }

  if (description.author) {
    lines.push(`**Author:** ${description.author}`);
  }

  if (description.license) {
    lines.push(`**License:** ${description.license}`);
  }

  if (description.category) {
    lines.push(`**Category:** ${description.category}`);
  }

  lines.push('');

  if (description.keywords && description.keywords.length > 0) {
    lines.push(
      `**Keywords:** ${description.keywords.map((k) => `\`${k}\``).join(', ')}`
    );
    lines.push('');
  }

  if (description.dependencies && description.dependencies.length > 0) {
    lines.push('## Dependencies');
    lines.push('');
    for (const dep of description.dependencies) {
      lines.push(`- ${dep}`);
    }
    lines.push('');
  }

  if (description.conflicts && description.conflicts.length > 0) {
    lines.push('## Conflicts');
    lines.push('');
    for (const conflict of description.conflicts) {
      lines.push(`- ${conflict}`);
    }
    lines.push('');
  }

  // Add detailed configuration schema information
  if (description.configSchema) {
    const schemaInfo = extractConfigSchemaInfo(description.configSchema);
    if (schemaInfo.fields.length > 0) {
      lines.push('## Configuration Schema');
      lines.push('');

      for (const field of schemaInfo.fields) {
        const required = field.required ? '**Required**' : '*Optional*';
        lines.push(`### \`${field.name}\` (${field.type}) - ${required}`);
        lines.push('');

        if (field.description) {
          lines.push(field.description);
          lines.push('');
        }

        if (field.defaultValue !== undefined) {
          lines.push(`**Default:** \`${JSON.stringify(field.defaultValue)}\``);
          lines.push('');
        }

        if (field.validation) {
          lines.push(`**Validation:** ${field.validation}`);
          lines.push('');
        }

        if (field.options && field.options.length > 0) {
          lines.push(
            `**Options:** ${field.options.map((opt) => `\`${JSON.stringify(opt)}\``).join(', ')}`
          );
          lines.push('');
        }
      }

      if (schemaInfo.examples.length > 0) {
        lines.push('### Example Configuration');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(schemaInfo.examples[0], null, 2));
        lines.push('```');
        lines.push('');
      }
    }
  }

  if (description.repository) {
    lines.push(`## Repository`);
    lines.push('');
    lines.push(`[${description.repository}](${description.repository})`);
    lines.push('');
  }

  if (description.homepage) {
    lines.push(`## Homepage`);
    lines.push('');
    lines.push(`[${description.homepage}](${description.homepage})`);
    lines.push('');
  }

  return lines.join('\n');
}
