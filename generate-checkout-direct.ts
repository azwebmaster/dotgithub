import { generateActionFiles } from './packages/core/src/index';

async function generateCheckout() {
  console.log('Generating checkout action directly...');
  
  try {
    const result = await generateActionFiles({
      orgRepoRef: 'actions/checkout@v4',
      outputDir: './examples'
    });
    
    console.log('Generated:', result.filePath);
    console.log('Action name:', result.actionName);
  } catch (error) {
    console.error('Error:', error);
  }
}

generateCheckout();