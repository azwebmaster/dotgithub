import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  createDefaultConfig,
  type DotGithubContext,
  logger,
} from '@dotgithub/core';

const SUPPORTED_TEMPLATES = ['node-library', 'bun-app', 'monorepo'] as const;
type StarterTemplate = (typeof SUPPORTED_TEMPLATES)[number];

export interface InitCommandOptions {
  force?: boolean;
  output?: string;
  template?: StarterTemplate;
}

export function createInitCommand(
  createContext: (options?: any) => DotGithubContext
): Command {
  return new Command('init')
    .description(
      'Initialize a new GitHub Actions TypeScript workspace with synth-ready starter templates'
    )
    .option('--force', 'Overwrite existing files if they exist', false)
    .option(
      '--output <dir>',
      'Output directory for the workspace (default: .github)',
      '.github'
    )
    .option(
      '--template <name>',
      `Starter template: ${SUPPORTED_TEMPLATES.join(', ')}`,
      'node-library'
    )
    .action(async (options: InitCommandOptions) => {
      try {
        await initializeWorkspace(options, createContext);
        logger.success('Initialized GitHub Actions workspace');
      } catch (err) {
        logger.failure('Failed to initialize workspace', {
          error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
      }
    });
}

async function initializeWorkspace(
  options: InitCommandOptions,
  createContext: (options?: any) => DotGithubContext
): Promise<void> {
  // Step 1: Create the output directory
  const outputDir = options.output || '.github';
  const outputDirPath = path.resolve(outputDir);

  const template = normalizeTemplate(options.template);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  // Step 2: Create dotgithub.json in the output directory
  const configPath = path.join(outputDirPath, 'dotgithub.json');

  // Check if config already exists
  if (fs.existsSync(configPath) && !options.force) {
    throw new Error(
      `dotgithub.json already exists in ${outputDir}. Use --force to overwrite.`
    );
  }

  // Create default config with workspace output directory
  const defaultConfig = createDefaultConfig();
  defaultConfig.rootDir = 'src'; // Workspace directory inside the output directory
  defaultConfig.outputDir = '.';

  // Add a local construct definition
  defaultConfig.constructs = [
    {
      name: 'local',
      package: './index.ts',
      config: {
        environment: 'production',
        timeout: 10,
      },
      enabled: true,
    },
  ];

  // Add a default stack that uses the local construct
  defaultConfig.stacks = [
    {
      name: 'default',
      constructs: ['local'],
      config: {},
    },
  ];

  // Write the config file to the output directory
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2) + '\n');
  logger.info(`✓ Created dotgithub.json configuration file in ${outputDir}`);

  // Step 3: Read the config file to get the workspace directory
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configContent);
  const workspaceDir = path.join(outputDirPath, config.rootDir);

  // Create workspace directory structure
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // Check if package.json already exists
  const packageJsonPath = path.join(workspaceDir, 'package.json');
  if (fs.existsSync(packageJsonPath) && !options.force) {
    throw new Error(
      `package.json already exists in ${config.rootDir}. Use --force to overwrite.`
    );
  }

  // Generate package.json
  const packageJson = generatePackageJson(template);
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n'
  );

  // Generate tsconfig.json
  const tsconfigPath = path.join(workspaceDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath) && !options.force) {
    logger.info('✓ tsconfig.json already exists, skipping');
  } else {
    const tsconfig = generateTsConfig(template);
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  }

  // Create basic index.ts file
  const indexPath = path.join(workspaceDir, 'index.ts');
  if (!fs.existsSync(indexPath) || options.force) {
    const indexContent = generateIndexFile(template);
    fs.writeFileSync(indexPath, indexContent);
  }

  logger.info(`Template: ${template}`);
  logger.info('Generated files:');
  logger.debug(`  ${outputDir}/dotgithub.json`);
  logger.debug(`  ${workspaceDir}/package.json`);
  logger.debug(`  ${workspaceDir}/tsconfig.json`);
  logger.debug(`  ${workspaceDir}/index.ts`);
  logger.info('Next steps:');
  logger.info(`  cd ${workspaceDir}`);
  logger.info('  npm install');
}

function normalizeTemplate(value?: string): StarterTemplate {
  const candidate = (value || 'node-library') as StarterTemplate;
  if (SUPPORTED_TEMPLATES.includes(candidate)) {
    return candidate;
  }
  throw new Error(
    `Unsupported template "${value}". Valid templates: ${SUPPORTED_TEMPLATES.join(', ')}`
  );
}

function generatePackageJson(template: StarterTemplate): object {
  if (template === 'bun-app') {
    return {
      name: 'github-actions-bun-workspace',
      version: '1.0.0',
      description: 'DotGitHub Bun app workspace with TypeScript support',
      type: 'module',
      main: 'dist/index.js',
      scripts: {
        build: 'tsc',
        dev: 'bun --watch src/index.ts',
        clean: 'rm -rf dist',
      },
      dependencies: {
        '@dotgithub/core': '*',
        '@dotgithub/cli': '*',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
      },
      engines: {
        bun: '>=1.2.22',
      },
      packageManager: 'bun@1.2.22',
    };
  }

  if (template === 'monorepo') {
    return {
      name: 'github-actions-monorepo-workspace',
      version: '1.0.0',
      private: true,
      description: 'DotGitHub monorepo starter with TypeScript support',
      type: 'module',
      scripts: {
        build: 'tsc',
        clean: 'rm -rf dist',
      },
      workspaces: ['packages/*'],
      dependencies: {
        '@dotgithub/core': '*',
        '@dotgithub/cli': '*',
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
      },
      engines: {
        node: '>=18.0.0',
      },
    };
  }

  return {
    name: 'github-actions-workspace',
    version: '1.0.0',
    description: 'DotGitHub Node library workspace with TypeScript support',
    type: 'module',
    main: 'dist/index.js',
    module: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
      clean: 'rm -rf dist',
    },
    dependencies: {
      '@dotgithub/core': '*',
      '@dotgithub/cli': '*',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      typescript: '^5.0.0',
    },
    engines: {
      node: '>=18.0.0',
    },
  };
}

function generateTsConfig(template: StarterTemplate): object {
  const moduleResolution = template === 'bun-app' ? 'bundler' : 'bundler';
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      outDir: './dist',
      rootDir: './',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      removeComments: false,
      resolveJsonModule: true,
    },
    include: ['**/*.ts'],
    exclude: ['node_modules', 'dist'],
  };
}

function generateIndexFile(template: StarterTemplate): string {
  if (template === 'bun-app') {
    return `// Bun-oriented DotGitHub starter entry point\n// Use this to author CI/CD workflow constructs in TypeScript and synthesize YAML.\n\n${baseIndexContent()}`;
  }

  if (template === 'monorepo') {
    return `// Monorepo-oriented DotGitHub starter entry point\n// Tip: split constructs by package and export a composed default construct.\n\n${baseIndexContent()}`;
  }

  return `// Node library-oriented DotGitHub starter entry point\n// Author workflow logic in TypeScript and synthesize to GitHub Actions YAML.\n\n${baseIndexContent()}`;
}

function baseIndexContent(): string {
  return `import {
  GitHubConstruct,
  GitHubStack,
  JobConstruct,
  WorkflowConstruct,
  ActionsHelper,
} from '@dotgithub/core';
import type {
  ConstructDescription,
  GitHubWorkflowInput,
} from '@dotgithub/core';
import { z } from 'zod';

export type MyConstructInputs = {
  /**
   * Environment to deploy to
   */
  environment: GitHubWorkflowInput;
};

export class MyConstruct extends GitHubConstruct {
  readonly name = 'my-construct';
  readonly version = '1.0.0';
  readonly description = 'My custom GitHub Actions construct';

  private readonly configSchema = z.object({
    environment: z
      .string()
      .min(1, 'Environment is required')
      .describe('The environment to deploy to (e.g., production, staging)'),
    timeout: z
      .number()
      .min(1, 'Timeout must be at least 1 minute')
      .max(60, 'Timeout cannot exceed 60 minutes')
      .optional()
      .default(10)
      .describe('Job timeout in minutes'),
  });

  validate(stack: GitHubStack): void {
    this.configSchema.parse(stack.config);
  }

  describe(): ConstructDescription {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: 'Your Name',
      repository: 'https://github.com/your-org/your-repo',
      license: 'MIT',
      keywords: ['ci', 'github-actions'],
      category: 'ci',
      configSchema: this.configSchema,
      tags: ['ci', 'automation'],
      minDotGithubVersion: '2.0.0',
    };
  }

  async synthesize(stack: GitHubStack): Promise<void> {
    const { config } = stack;

    // Parse and validate config using the schema
    const validatedConfig = this.configSchema.parse(config);

    const { run } = new ActionsHelper(stack);

    // Create a workflow
    const workflow = new WorkflowConstruct(stack, 'ci', {
      name: 'CI Workflow',
      on: {
        push: {
          branches: ['main'],
        },
        pull_request: {},
      },
      jobs: {},
    });

    // Create a job
    new JobConstruct(workflow, 'test', {
      name: 'Test',
      'runs-on': 'ubuntu-latest',
      steps: [
        run('Hello World', 'echo "Hello from my construct!"').toStep(),
        run('Show Environment', \`echo "Environment: \${validatedConfig.environment}"\`).toStep(),
      ],
    });
  }
}

export default new MyConstruct();
`;
}
