import { checkout } from './examples/checkout';

// Test the checkout function
console.log('Testing checkout action...');

// Test with no inputs (using defaults)
const step1 = checkout();
console.log('✓ Basic checkout step created:', step1.uses);

// Test with custom inputs
const step2 = checkout({
  ref: 'main',
  'fetch-depth': '0',
  token: '${{ secrets.GITHUB_TOKEN }}'
});
console.log('✓ Checkout with custom inputs:', step2.with);

// Test with step configuration
const step3 = checkout(
  { ref: 'develop' },
  { name: 'Checkout develop branch', if: 'github.ref == "refs/heads/main"' },
  'v4'
);
console.log('✓ Checkout with step config:', step3.name, step3.if);

console.log('All checkout tests passed! ✅');