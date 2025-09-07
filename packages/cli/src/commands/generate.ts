import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  createTemplateLoader,
  generateWorkflowYaml,
  generateGithubFiles,
  createWorkflow
} from '@dotgithub/core';

export interface GenerateCommandOptions {
  output: string;
  config?: string;
  overwrite?: boolean;
  'dry-run'?: boolean;
  interactive?: boolean;
  'merge-strategy'?: 'combine' | 'override' | 'namespace';
}

export function createGenerateCommand(): Command {
  return new Command('generate')
    .alias('gen')
    .argument('<templates...>', 'Template names to generate from (supports multiple)')
    .description('Generate complete .github setup from one or more templates')
    .requiredOption('-o, --output <dir>', 'Output directory (default: .github)', '.github')
    .option('-c, --config <file>', 'Configuration file for template variables')
    .option('--overwrite', 'Overwrite existing files', false)
    .option('--dry-run', 'Show what would be generated without writing files', false)
    .option('--interactive', 'Interactive mode for setting variables', false)
    .option('--merge-strategy <strategy>', 'Strategy for merging multiple templates (combine|override|namespace)', 'combine')
    .action(async (templates: string[], options: GenerateCommandOptions) => {
      try {
        const result = await generateFromTemplates(templates, options);
        
        if (options['dry-run']) {
          console.log('Dry run - no files were written');
          console.log(`Would generate ${result.totalFiles} files:`);
          result.files.forEach(file => console.log(`  ${file}`));
        } else {
          console.log(`Generated ${result.totalFiles} files in ${options.output}`);
          if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            result.warnings.forEach(warning => console.log(`  ${warning}`));
          }
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

interface GenerateResult {
  totalFiles: number;
  files: string[];
  warnings: string[];
  workflowsGenerated: number;
  githubFilesGenerated: number;
}

async function generateFromTemplates(templateNames: string[], options: GenerateCommandOptions): Promise<GenerateResult> {
  const templateLoader = createTemplateLoader();
  const result: GenerateResult = {
    totalFiles: 0,
    files: [],
    warnings: [],
    workflowsGenerated: 0,
    githubFilesGenerated: 0
  };

  // Load configuration if provided
  const config = await loadConfiguration(options.config);
  
  // Process each template
  const processedTemplates = [];
  for (const templateName of templateNames) {
    console.log(`Processing template: ${templateName}`);
    
    // Get template-specific config
    const templateConfig = config[templateName] || {};
    
    // Interactive mode for variables if needed
    if (options.interactive) {
      // TODO: Implement interactive variable collection
      // For now, we'll use provided config
    }
    
    try {
      const processed = await templateLoader.processTemplate(templateName, templateConfig);
      processedTemplates.push({
        name: templateName,
        processed
      });
    } catch (error) {
      throw new Error(`Failed to process template "${templateName}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Merge templates according to strategy
  const merged = await mergeTemplates(processedTemplates, options['merge-strategy'] || 'combine');

  // Generate workflow files
  if (Object.keys(merged.workflows).length > 0) {
    const workflowsResult = await generateWorkflowFiles(merged.workflows, options);
    result.files.push(...workflowsResult.files);
    result.workflowsGenerated = workflowsResult.files.length;
    result.warnings.push(...workflowsResult.warnings);
  }

  // Generate GitHub files
  if (Object.keys(merged.githubFiles).length > 0) {
    const githubResult = await generateGitHubFiles(merged.githubFiles, options);
    result.files.push(...githubResult.files);
    result.githubFilesGenerated = githubResult.files.length;
    result.warnings.push(...githubResult.warnings);
  }

  result.totalFiles = result.files.length;
  return result;
}

async function loadConfiguration(configPath?: string): Promise<{ [templateName: string]: { [key: string]: any } }> {
  if (!configPath) {
    return {};
  }

  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const ext = path.extname(configPath).toLowerCase();
    
    switch (ext) {
      case '.json':
        return JSON.parse(content);
      case '.yml':
      case '.yaml':
        // For now, we'll handle JSON only. YAML support can be added later
        throw new Error('YAML configuration files not yet supported. Use JSON.');
      default:
        throw new Error(`Unsupported configuration file format: ${ext}`);
    }
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`);
  }
}

interface MergedTemplates {
  workflows: { [filename: string]: string };
  githubFiles: { [filename: string]: string };
  configs: any[];
}

async function mergeTemplates(
  templates: Array<{ name: string; processed: any }>,
  strategy: string
): Promise<MergedTemplates> {
  const merged: MergedTemplates = {
    workflows: {},
    githubFiles: {},
    configs: []
  };

  for (const { name, processed } of templates) {
    merged.configs.push(processed.config);

    // Merge workflows based on strategy
    for (const [filename, content] of Object.entries(processed.workflows)) {
      const key = strategy === 'namespace' ? `${name}-${filename}` : filename;
      
      if (strategy === 'override' || !merged.workflows[key]) {
        merged.workflows[key] = content as string;
      } else if (strategy === 'combine') {
        // For combine strategy, later templates override earlier ones for same filename
        merged.workflows[key] = content as string;
      }
    }

    // Merge GitHub files based on strategy  
    for (const [filepath, content] of Object.entries(processed.githubFiles)) {
      const key = strategy === 'namespace' ? path.join(name, filepath) : filepath;
      
      if (strategy === 'override' || !merged.githubFiles[key]) {
        merged.githubFiles[key] = content as string;
      } else if (strategy === 'combine') {
        merged.githubFiles[key] = content as string;
      }
    }
  }

  return merged;
}

async function generateWorkflowFiles(
  workflows: { [filename: string]: string },
  options: GenerateCommandOptions
): Promise<{ files: string[]; warnings: string[] }> {
  const files: string[] = [];
  const warnings: string[] = [];
  const workflowsDir = path.join(options.output, 'workflows');

  // Ensure workflows directory exists
  if (!options['dry-run'] && !fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }

  for (const [filename, typescriptContent] of Object.entries(workflows)) {
    try {
      // Convert TypeScript workflow to YAML
      // For now, we'll treat the content as workflow YAML directly
      // In a full implementation, we'd evaluate the TypeScript and generate YAML
      const yamlContent = typescriptContent; // Simplified for now
      
      const yamlFilename = filename.replace(/\.ts$/, '.yml');
      const outputPath = path.join(workflowsDir, yamlFilename);
      
      // Check if file exists and handle overwrite logic
      if (!options['dry-run'] && fs.existsSync(outputPath) && !options.overwrite) {
        warnings.push(`Skipped existing file: ${outputPath}`);
        continue;
      }

      if (!options['dry-run']) {
        fs.writeFileSync(outputPath, yamlContent, 'utf8');
      }
      
      files.push(path.relative(process.cwd(), outputPath));
    } catch (error) {
      warnings.push(`Failed to generate workflow ${filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { files, warnings };
}

async function generateGitHubFiles(
  githubFiles: { [filename: string]: string },
  options: GenerateCommandOptions
): Promise<{ files: string[]; warnings: string[] }> {
  const files: string[] = [];
  const warnings: string[] = [];

  if (options['dry-run']) {
    // For dry run, just return what would be created
    for (const filepath of Object.keys(githubFiles)) {
      const outputPath = path.join(options.output, filepath);
      files.push(path.relative(process.cwd(), outputPath));
    }
    return { files, warnings };
  }

  try {
    const result = generateGithubFiles({
      outputDir: options.output,
      files: githubFiles,
      overwrite: options.overwrite,
      createDirectories: true
    });

    files.push(...result.generatedFiles.map(f => path.relative(process.cwd(), f)));
    
    if (result.skippedFiles.length > 0) {
      warnings.push(`Skipped ${result.skippedFiles.length} existing files (use --overwrite to replace)`);
    }
  } catch (error) {
    warnings.push(`Error generating GitHub files: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { files, warnings };
}