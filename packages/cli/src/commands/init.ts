import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createConfigFile, writeConfig, createDefaultConfig, type DotGithubContext, logger } from '@dotgithub/core';

export interface InitCommandOptions {
  force?: boolean;
  output?: string;
}

export function createInitCommand(createContext: (options?: any) => DotGithubContext): Command {
  return new Command('init')
    .description('Initialize a new GitHub Actions workspace with TypeScript and ESM support')
    .option('--force', 'Overwrite existing files if they exist', false)
    .option('--output <dir>', 'Output directory for the workspace (default: src)', 'src')
    .action(async (options: InitCommandOptions) => {
      try {
        await initializeWorkspace(options, createContext);
        logger.success('Initialized GitHub Actions workspace');
      } catch (err) {
        logger.failure('Failed to initialize workspace', { 
          error: err instanceof Error ? err.message : String(err)
        });
        process.exit(1);
      }
    });
}

async function initializeWorkspace(options: InitCommandOptions, createContext: (options?: any) => DotGithubContext): Promise<void> {
  // Step 1: Create the output directory
  const outputDir = options.output || 'src';
  const outputDirPath = path.resolve(outputDir);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDirPath)) {
    fs.mkdirSync(outputDirPath, { recursive: true });
  }

  // Step 2: Create dotgithub.json in the output directory
  const configPath = path.join(outputDirPath, 'dotgithub.json');
  
  // Check if config already exists
  if (fs.existsSync(configPath) && !options.force) {
    throw new Error(`dotgithub.json already exists in ${outputDir}. Use --force to overwrite.`);
  }

  // Create default config with workspace output directory
  const defaultConfig = createDefaultConfig();
  defaultConfig.rootDir = 'src'; // This will be the workspace directory inside the output directory
  
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
    throw new Error(`package.json already exists in ${config.rootDir}. Use --force to overwrite.`);
  }

  // Generate package.json
  const packageJson = generatePackageJson();
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  // Generate tsconfig.json
  const tsconfigPath = path.join(workspaceDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath) && !options.force) {
    logger.info('✓ tsconfig.json already exists, skipping');
  } else {
    const tsconfig = generateTsConfig();
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  }

  // Create basic index.ts file
  const indexPath = path.join(workspaceDir, 'index.ts');
  if (!fs.existsSync(indexPath) || options.force) {
    const indexContent = generateIndexFile();
    fs.writeFileSync(indexPath, indexContent);
  }

  logger.info('Generated files:');
  logger.debug(`  ${outputDir}/dotgithub.json`);
  logger.debug(`  ${workspaceDir}/package.json`);
  logger.debug(`  ${workspaceDir}/tsconfig.json`);
  logger.debug(`  ${workspaceDir}/index.ts`);
  logger.info('Next steps:');
  logger.info(`  cd ${workspaceDir}`);
  logger.info('  npm install');
}

function generatePackageJson(): object {
  return {
    name: "github-actions-workspace",
    version: "1.0.0",
    description: "GitHub Actions workspace with TypeScript support",
    type: "module",
    main: "dist/index.js",
    module: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      build: "tsc",
      dev: "tsc --watch",
      clean: "rm -rf dist"
    },
    dependencies: {
      "@dotgithub/core": "*",
      "@dotgithub/cli": "*"
    },
    devDependencies: {
      "@types/node": "^20.0.0",
      "typescript": "^5.0.0"
    },
    engines: {
      node: ">=18.0.0"
    }
  };
}

function generateTsConfig(): object {
  return {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "bundler",
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      outDir: "./dist",
      rootDir: "./",
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      removeComments: false,
      resolveJsonModule: true
    },
    include: [
      "**/*.ts"
    ],
    exclude: [
      "node_modules",
      "dist"
    ]
  };
}

function generateIndexFile(): string {
  return `// GitHub Actions workspace entry point
import { App } from '@dotgithub/core';
`;
}