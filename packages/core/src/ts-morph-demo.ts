#!/usr/bin/env bun

/**
 * Demonstration script showing how to use ts-morph for TypeScript code generation
 * 
 * This script demonstrates:
 * 1. Generating TypeScript interfaces for GitHub Actions
 * 2. Creating factory functions for workflow steps
 * 3. Building complete plugin classes
 * 4. Formatting and saving generated code
 */

import { TypeScriptGenerator } from './ts-morph-example.js';
// Note: MonorepoPlugin would be imported from the actual plugin location
// import { MonorepoPlugin } from '../../.github/src/plugins/monorepo-plugin';

async function demonstrateTsMorph() {
  console.log('🚀 TypeScript Code Generation with ts-morph\n');

  const generator = new TypeScriptGenerator();

  // Example 1: Generate interface for a GitHub Action
  console.log('📝 Example 1: Generating TypeScript interface for GitHub Action');
  console.log('=' .repeat(60));
  
  const checkoutInputs = {
    repository: 'string',
    ref: 'string',
    token: 'string',
    clean: 'boolean',
    fetchDepth: 'number',
    submodules: 'boolean',
  };

  const checkoutInterface = generator.generateActionInputsInterface('actions/checkout', checkoutInputs);
  console.log(checkoutInterface);
  console.log('\n');

  // Example 2: Generate factory function
  console.log('🔧 Example 2: Generating factory function');
  console.log('=' .repeat(60));
  
  const checkoutFactory = generator.generateActionFactoryFunction('actions/checkout', checkoutInputs);
  console.log(checkoutFactory);
  console.log('\n');

  // Example 3: Generate complete action module
  console.log('📦 Example 3: Complete action module');
  console.log('=' .repeat(60));
  
  const completeModule = generator.generateActionModule('actions/checkout', checkoutInputs);
  console.log(completeModule);
  console.log('\n');

  // Example 4: Generate plugin class
  console.log('🔌 Example 4: Plugin class generation');
  console.log('=' .repeat(60));
  
  const pluginWorkflows = {
    ci: {
      name: 'CI',
      on: { push: { branches: ['main'] } },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          steps: [
            { name: 'Checkout', uses: 'actions/checkout@v4' },
            { name: 'Setup Node', uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
            { name: 'Install', run: 'npm install' },
            { name: 'Test', run: 'npm test' },
          ],
        },
      },
    },
  };

  const pluginClass = generator.generatePluginClass('ci', pluginWorkflows);
  console.log(pluginClass);
  console.log('\n');

  // Example 5: Workflow type generation (simulated)
  console.log('🏗️  Example 5: Workflow type generation');
  console.log('=' .repeat(60));
  
  const workflowInputs = {
    trigger: 'string',
    concurrency: 'string',
    environment: 'Record<string, string>',
  };
  
  const workflowInterface = generator.generateActionInputsInterface('workflow/ci', workflowInputs);
  const workflowFactory = generator.generateActionFactoryFunction('workflow/ci', workflowInputs);
  console.log(workflowInterface);
  console.log('\n');
  console.log(workflowFactory);
  console.log('\n');

  // Example 6: Code formatting
  console.log('✨ Example 6: Code formatting');
  console.log('=' .repeat(60));
  
  const unformattedCode = `export interface Test{name:string;value:number;description:string;}`;
  const formattedCode = generator.formatCode(unformattedCode);
  
  console.log('Before formatting:');
  console.log(unformattedCode);
  console.log('\nAfter formatting:');
  console.log(formattedCode);
  console.log('\n');

  // Example 7: Multiple action types
  console.log('🎯 Example 7: Generating multiple action types');
  console.log('=' .repeat(60));
  
  const actions = [
    {
      name: 'actions/setup-node',
      inputs: {
        'node-version': 'string',
        'registry-url': 'string',
        scope: 'string',
        cache: 'string',
      },
    },
    {
      name: 'actions/upload-artifact',
      inputs: {
        name: 'string',
        path: 'string',
        'retention-days': 'number',
        'if-no-files-found': 'string',
      },
    },
    {
      name: 'actions/download-artifact',
      inputs: {
        name: 'string',
        path: 'string',
        'github-token': 'string',
      },
    },
  ];

  for (const action of actions) {
    console.log(`\n--- ${action.name} ---`);
    const module = generator.generateActionModule(action.name, action.inputs);
    console.log(module);
  }

  console.log('\n🎉 TypeScript code generation demonstration complete!');
  console.log('\nKey benefits of using ts-morph:');
  console.log('• Type-safe code generation');
  console.log('• Automatic formatting and syntax validation');
  console.log('• Rich AST manipulation capabilities');
  console.log('• JSDoc comment generation');
  console.log('• Import/export management');
  console.log('• Easy integration with existing TypeScript projects');
}

// Run the demonstration
if (import.meta.main) {
  demonstrateTsMorph().catch(console.error);
}

export { demonstrateTsMorph };
