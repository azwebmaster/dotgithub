#!/usr/bin/env node

/**
 * Test script to verify the --name option works correctly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing --name option for dotgithub add command...\n');

// Create a temporary directory for testing
const testDir = path.join(__dirname, 'test-temp-name-override');
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true });
}
fs.mkdirSync(testDir, { recursive: true });

try {
  // Change to test directory
  process.chdir(testDir);
  
  // Initialize a new dotgithub project
  console.log('1. Initializing dotgithub project...');
  execSync('npx @dotgithub/cli init', { stdio: 'inherit' });
  
  // Add an action with custom name
  console.log('\n2. Adding actions/setup-node with custom name "setupNode"...');
  execSync('npx @dotgithub/cli add actions/setup-node@v4 --generate-code --name setupNode', { stdio: 'inherit' });
  
  // Check if the generated file exists and has the correct function name
  console.log('\n3. Checking generated files...');
  const configPath = path.join(testDir, '.github', 'dotgithub.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('✅ Config file created');
    console.log('Actions in config:', config.actions?.length || 0);
    
    if (config.actions && config.actions.length > 0) {
      const action = config.actions[0];
      console.log('Action details:');
      console.log(`  - orgRepo: ${action.orgRepo}`);
      console.log(`  - functionName: ${action.functionName}`);
      console.log(`  - outputPath: ${action.outputPath}`);
      
      // Check if the function name is correct
      if (action.functionName === 'setupNode') {
        console.log('✅ Custom function name "setupNode" applied correctly');
      } else {
        console.log(`❌ Expected function name "setupNode", got "${action.functionName}"`);
      }
    }
  } else {
    console.log('❌ Config file not found');
  }
  
  // Check if the generated TypeScript file exists
  const outputPath = path.join(testDir, 'src', 'actions', 'actions', 'setup-node.ts');
  if (fs.existsSync(outputPath)) {
    console.log('✅ Generated TypeScript file exists');
    
    // Check the content of the generated file
    const content = fs.readFileSync(outputPath, 'utf8');
    
    // Look for the function name in the generated code
    if (content.includes('export function setupNode(')) {
      console.log('✅ Generated function has correct name "setupNode"');
    } else {
      console.log('❌ Generated function does not have the expected name');
      console.log('Looking for "export function setupNode(" in content...');
    }
    
    // Look for the type name
    if (content.includes('SetupNodeInputs')) {
      console.log('✅ Generated type has correct name "SetupNodeInputs"');
    } else {
      console.log('❌ Generated type does not have the expected name');
      console.log('Looking for "SetupNodeInputs" in content...');
    }
    
    console.log('\n📄 Generated file preview:');
    console.log('---');
    console.log(content.split('\n').slice(0, 20).join('\n'));
    console.log('---');
    
  } else {
    console.log('❌ Generated TypeScript file not found at:', outputPath);
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup
  console.log('\n🧹 Cleaning up test directory...');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
}

console.log('\n✅ Test completed!');
