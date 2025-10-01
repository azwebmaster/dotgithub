#!/usr/bin/env node

/**
 * Test script to demonstrate the new plugin describe functionality
 */

import { PluginManager, formatPluginDescription, generatePluginMarkdown } from './packages/core/dist/index.js';

async function testPluginDescribe() {
  console.log('🔌 Testing Plugin Describe Functionality\n');

  try {
    // Create a plugin manager
    const manager = new PluginManager({
      projectRoot: process.cwd()
    });

    // Example plugin configurations
    const pluginConfigs = [
      {
        name: 'example',
        package: './example/src/index.ts',
        config: {
          environment: 'production',
          timeout: 15,
          nodeVersion: '18.17'
        },
        enabled: true
      }
    ];

    console.log('📦 Loading plugins...');
    const loadResults = await manager.loadPlugins(pluginConfigs);
    console.log(`✅ Loaded ${loadResults.length} plugin(s)\n`);

    // List all plugins
    console.log('📋 Listing all plugins:');
    const pluginList = await manager.listPlugins();
    for (const { name, description } of pluginList) {
      console.log(`\n🔌 Plugin: ${name}`);
      if (description) {
        console.log('✅ Has description');
        console.log(`   Version: ${description.version || 'N/A'}`);
        console.log(`   Category: ${description.category || 'N/A'}`);
        console.log(`   Keywords: ${description.keywords?.join(', ') || 'N/A'}`);
      } else {
        console.log('❌ No description available');
      }
    }

    // Describe specific plugin
    console.log('\n📖 Describing example plugin:');
    const description = await manager.describePlugin('example');
    if (description) {
      console.log('\n' + '='.repeat(50));
      console.log(formatPluginDescription(description));
      console.log('='.repeat(50));
    }

    // Generate markdown documentation
    if (description) {
      console.log('\n📝 Markdown Documentation:');
      console.log('\n' + '='.repeat(50));
      console.log(generatePluginMarkdown(description));
      console.log('='.repeat(50));
    }

    // Test configuration validation
    console.log('\n🔍 Testing configuration validation:');
    const validationResult = await manager.validatePluginConfigAgainstSchema('example', {
      environment: 'staging',
      timeout: 30,
      nodeVersion: '20.5'
    });

    if (validationResult.success) {
      console.log('✅ Configuration validation passed');
      console.log('Validated config:', JSON.stringify(validationResult.data, null, 2));
    } else {
      console.log('❌ Configuration validation failed:', validationResult.error);
    }

  } catch (error) {
    console.error('❌ Error testing plugin describe:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testPluginDescribe().catch(console.error);
