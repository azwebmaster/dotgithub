import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

export interface InitCommandOptions {
  force?: boolean;
}

export function createInitCommand(): Command {
  return new Command('init')
    .description('Initialize a new GitHub Actions workspace with TypeScript and ESM support')
    .option('--force', 'Overwrite existing files if they exist', false)
    .action(async (options: InitCommandOptions) => {
      try {
        await initializeWorkspace(options);
        console.log('✓ Initialized GitHub Actions workspace in .github/src');
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

async function initializeWorkspace(options: InitCommandOptions): Promise<void> {
  const workspaceDir = path.join(process.cwd(), '.github', 'src');
  
  // Create directory structure
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // Check if package.json already exists
  const packageJsonPath = path.join(workspaceDir, 'package.json');
  if (fs.existsSync(packageJsonPath) && !options.force) {
    throw new Error('package.json already exists in .github/src. Use --force to overwrite.');
  }

  // Generate package.json
  const packageJson = generatePackageJson();
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  // Generate tsconfig.json
  const tsconfigPath = path.join(workspaceDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath) && !options.force) {
    console.log('✓ tsconfig.json already exists, skipping');
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

  console.log('Generated files:');
  console.log('  .github/src/package.json');
  console.log('  .github/src/tsconfig.json');
  console.log('  .github/src/index.ts');
  console.log('');
  console.log('Next steps:');
  console.log('  cd .github/src');
  console.log('  npm install');
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