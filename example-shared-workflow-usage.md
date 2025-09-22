# SharedWorkflowConstruct Usage Example

The `SharedWorkflowConstruct` allows you to create reusable workflows that can be called from other workflows with typed inputs.

## Basic Usage

```typescript
import { SharedWorkflowConstruct } from '@dotgithub/core';

// Create a shared workflow construct
const sharedWorkflow = new SharedWorkflowConstruct(stack, 'my-shared-workflow', {
  // Define input parameters
  nodeVersion: {
    type: 'string',
    description: 'Node.js version to use',
    required: true,
    default: '20'
  },
  testCommand: {
    type: 'string', 
    description: 'Test command to run',
    required: false,
    default: 'npm test'
  }
}, {
  // Define the workflow (without 'on' trigger - it's automatically set to 'workflow_call')
  name: 'Shared Test Workflow',
  jobs: {
    test: {
      'runs-on': 'ubuntu-latest',
      steps: [
        {
          name: 'Checkout',
          uses: 'actions/checkout@v4'
        },
        {
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v4',
          with: {
            'node-version': '${{ inputs.nodeVersion }}'
          }
        },
        {
          name: 'Run tests',
          run: '${{ inputs.testCommand }}'
        }
      ]
    }
  }
});

// Call the shared workflow from another workflow
const job = sharedWorkflow.call({
  nodeVersion: '18',
  testCommand: 'npm run test:unit'
}, {
  'runs-on': 'ubuntu-latest',
  needs: ['build']
});
```

## Key Features

1. **Automatic `workflow_call` trigger**: The `on` event is automatically set to `workflow_call` for reusable workflows
2. **Input validation**: Required inputs are validated when calling the workflow
3. **Type safety**: TypeScript types ensure correct input structure
4. **Flexible job configuration**: Additional job properties can be passed to the `call()` method

## Constructor Parameters

- `scope`: The parent construct
- `id`: Unique identifier for the shared workflow
- `inputs`: Object defining the input parameters and their types
- `workflow`: The workflow definition (without the `on` trigger)

## Call Method

The `call()` method returns a `GitHubJob` that can be used in other workflows:

```typescript
call(inputs?: GitHubJobWith, jobConfig?: Partial<GitHubJob>): GitHubJob
```

- `inputs`: Values for the input parameters
- `jobConfig`: Additional job configuration (runs-on, needs, etc.)
