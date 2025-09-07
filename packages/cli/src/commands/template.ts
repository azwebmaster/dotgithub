import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { validateTemplate, createTemplateLoader } from '@dotgithub/core';

export function createTemplateCommand(): Command {
  const templateCmd = new Command('template')
    .alias('tmpl')
    .description('Template management commands');

  // dotgithub template create
  templateCmd
    .command('create <name>')
    .description('Create a new template')
    .option('--from-github <path>', 'Create template from existing .github directory')
    .option('--from-workflow <file>', 'Create template from single workflow file')
    .option('--package', 'Initialize as publishable NPM package', false)
    .option('-o, --output <dir>', 'Output directory', '.')
    .option('--interactive', 'Interactive template creation', false)
    .option('--scope <scope>', 'NPM scope for package name')
    .option('--category <category>', 'Template category')
    .action(async (name: string, options) => {
      try {
        await createTemplate(name, options);
        console.log(`Template "${name}" created successfully`);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // dotgithub template validate
  templateCmd
    .command('validate <path>')
    .description('Validate template structure and configuration')
    .option('--strict', 'Enable strict validation', false)
    .option('--no-files', 'Skip file structure checks', false)
    .option('--no-syntax', 'Skip syntax checks', false)
    .action(async (templatePath: string, options) => {
      try {
        const result = await validateTemplate(templatePath, {
          strictVariableValidation: options.strict,
          checkFiles: options.files !== false,
          checkSyntax: options.syntax !== false
        });

        if (result.valid) {
          console.log('✅ Template validation passed');
          if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            result.warnings.forEach(w => console.log(`  ⚠️  ${w.message}`));
          }
        } else {
          console.log('❌ Template validation failed');
          console.log('\nErrors:');
          result.errors.forEach(e => console.log(`  ❌ ${e.message}`));
          
          if (result.warnings.length > 0) {
            console.log('\nWarnings:');
            result.warnings.forEach(w => console.log(`  ⚠️  ${w.message}`));
          }
          process.exit(1);
        }
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  // dotgithub template list
  templateCmd
    .command('list')
    .description('List available templates')
    .option('--local', 'Show only local templates', false)
    .option('--remote', 'Show only NPM registry templates', false)
    .action(async (options) => {
      try {
        await listTemplates(options);
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  return templateCmd;
}

async function createTemplate(name: string, options: any): Promise<void> {
  const templateDir = path.resolve(options.output, name);
  
  if (fs.existsSync(templateDir)) {
    throw new Error(`Directory already exists: ${templateDir}`);
  }

  // Create template directory structure
  fs.mkdirSync(templateDir, { recursive: true });
  fs.mkdirSync(path.join(templateDir, 'workflows'));
  fs.mkdirSync(path.join(templateDir, 'github-files'));

  // Create template.json
  const templateConfig: any = {
    name: name,
    description: `Template for ${name}`,
    category: options.category || 'custom',
    version: '1.0.0',
    variables: {
      // Example variables - user would customize these
      appName: {
        type: 'string',
        description: 'Application name',
        required: true
      }
    },
    files: {
      workflows: [] as string[],
      github: [] as string[]
    }
  };

  fs.writeFileSync(
    path.join(templateDir, 'template.json'),
    JSON.stringify(templateConfig, null, 2)
  );

  // Create README.md
  const readme = `# ${name} Template

${templateConfig.description}

## Variables

- \`appName\` (string, required): Application name

## Usage

\`\`\`bash
dotgithub generate ${name} --config config.json
\`\`\`

## Configuration Example

\`\`\`json
{
  "${name}": {
    "appName": "my-awesome-app"
  }
}
\`\`\`
`;

  fs.writeFileSync(path.join(templateDir, 'README.md'), readme);

  // Create example workflow if requested
  if (options.fromWorkflow) {
    if (!fs.existsSync(options.fromWorkflow)) {
      throw new Error(`Workflow file not found: ${options.fromWorkflow}`);
    }
    
    const workflowContent = fs.readFileSync(options.fromWorkflow, 'utf8');
    const workflowName = path.basename(options.fromWorkflow, path.extname(options.fromWorkflow));
    fs.writeFileSync(
      path.join(templateDir, 'workflows', `${workflowName}.ts`),
      workflowContent
    );
    
    templateConfig.files.workflows = [`${workflowName}.ts`];
  }

  // Copy from existing .github directory if requested
  if (options.fromGithub) {
    if (!fs.existsSync(options.fromGithub)) {
      throw new Error(`GitHub directory not found: ${options.fromGithub}`);
    }
    
    // Copy workflows
    const workflowsSource = path.join(options.fromGithub, 'workflows');
    if (fs.existsSync(workflowsSource)) {
      const workflows = fs.readdirSync(workflowsSource);
      templateConfig.files.workflows = workflows;
      
      for (const workflow of workflows) {
        const content = fs.readFileSync(path.join(workflowsSource, workflow), 'utf8');
        fs.writeFileSync(
          path.join(templateDir, 'workflows', workflow.replace('.yml', '.ts')),
          content
        );
      }
    }

    // Copy other GitHub files
    const githubFiles = fs.readdirSync(options.fromGithub).filter(f => f !== 'workflows');
    for (const file of githubFiles) {
      const sourcePath = path.join(options.fromGithub, file);
      const stat = fs.statSync(sourcePath);
      
      if (stat.isFile()) {
        const content = fs.readFileSync(sourcePath, 'utf8');
        fs.writeFileSync(path.join(templateDir, 'github-files', file), content);
        templateConfig.files.github = templateConfig.files.github || [];
        templateConfig.files.github.push(file);
      }
    }
  }

  // Create NPM package if requested
  if (options.package) {
    const packageName = options.scope ? `${options.scope}/${name}` : `@dotgithub/template-${name}`;
    const packageJson = {
      name: packageName,
      version: '1.0.0',
      description: templateConfig.description,
      keywords: ['dotgithub-template', 'github', 'workflows', templateConfig.category],
      main: 'template.json',
      files: [
        'template.json',
        'workflows/',
        'github-files/',
        'README.md'
      ],
      dotgithub: {
        templateType: 'complete',
        category: templateConfig.category
      }
    };

    fs.writeFileSync(
      path.join(templateDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create .gitignore
    fs.writeFileSync(
      path.join(templateDir, '.gitignore'),
      'node_modules/\n*.log\n.DS_Store\n'
    );
  }

  // Update template.json with discovered files
  fs.writeFileSync(
    path.join(templateDir, 'template.json'),
    JSON.stringify(templateConfig, null, 2)
  );
}

async function listTemplates(options: any): Promise<void> {
  console.log('Available Templates:\n');

  // TODO: Implement template discovery
  // For now, show a placeholder
  if (!options.remote) {
    console.log('📁 Local Templates:');
    console.log('  (No local templates found)');
    console.log('');
  }

  if (!options.local) {
    console.log('📦 NPM Registry Templates:');
    console.log('  (NPM registry search not yet implemented)');
    console.log('');
  }

  console.log('💡 Tip: Create your first template with:');
  console.log('   dotgithub template create my-template --package');
}