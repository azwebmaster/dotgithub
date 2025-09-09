// Quick test script to verify version selection behavior
const { getLatestTag } = require('./packages/core/dist/github.js');

async function testVersionSelection() {
  try {
    // Test with actions/checkout which has both major version tags (v4, v3) and specific versions (v4.1.2, etc.)
    console.log('Testing version selection with actions/checkout...');
    
    // Mock the GitHub API response to simulate different tag scenarios
    const mockOctokit = {
      rest: {
        repos: {
          listTags: async () => ({
            data: [
              { name: 'v4.1.2' },
              { name: 'v4.1.1' }, 
              { name: 'v4.1.0' },
              { name: 'v4.0.0' },
              { name: 'v4' },        // This should be preferred
              { name: 'v3.6.0' },
              { name: 'v3.5.3' },
              { name: 'v3' },        // This would be second choice
              { name: 'v2.7.0' },
              { name: 'v2' }
            ]
          })
        }
      }
    };
    
    console.log('With mixed version tags, should prefer v4 (major version only)');
    
    // Test with only specific versions (no major-only tags)
    const mockOctokitSpecificOnly = {
      rest: {
        repos: {
          listTags: async () => ({
            data: [
              { name: 'v4.1.2' },
              { name: 'v4.1.1' }, 
              { name: 'v4.1.0' },
              { name: 'v3.6.0' },
              { name: 'v3.5.3' },
              { name: 'v2.7.0' }
            ]
          })
        }
      }
    };
    
    console.log('With only specific versions, should prefer v4.1.2 (latest semver)');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testVersionSelection();