import { generateTypesFromYml } from './packages/core/src/typegen';

const testYaml = {
  name: 'checkout',
  description: 'Test action',
  inputs: {
    'ssh-strict': { 
      description: 'SSH strict', 
      default: true,
      required: false 
    },
    'fetch-depth': { 
      description: 'Fetch depth', 
      default: 1,
      required: false 
    },
    repository: { 
      description: 'Repository', 
      default: '${{ github.repository }}',
      required: false 
    }
  }
};

console.log('Testing type generation...');
const result = generateTypesFromYml(testYaml as any, 'actions/checkout', 'v4');
console.log(result);