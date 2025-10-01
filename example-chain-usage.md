# GitHubAction Chain Method Usage Example

This example demonstrates how to use the new `chain` method on the `GitHubAction` class to chain multiple action calls together.

## Basic Usage

```typescript
import { Checkout, SetupNode } from './actions';

// Create action instances
const checkout = new Checkout(collection);
const setupNode = new SetupNode(collection);

// Chain multiple actions together
const steps = checkout
  .chain(checkout.invoke("Checkout code", { ref: "main" }).step)
  .then((outputs) => {
    // Use outputs from checkout step
    console.log("Checkout ref:", outputs.ref);
    return setupNode.invoke("Setup Node.js", { "node-version": "18" }).step;
  })
  .then((outputs) => {
    // Use outputs from setup-node step
    console.log("Node version:", outputs["node-version"]);
    return {
      name: "Run tests",
      run: "npm test"
    };
  })
  .steps();

// Use the chained steps in a workflow
const workflow = {
  name: "CI",
  on: { push: { branches: ["main"] } },
  jobs: {
    test: {
      "runs-on": "ubuntu-latest",
      steps: steps
    }
  }
};
```

## Advanced Usage with Output Handling

```typescript
// More complex chaining with proper output handling
const complexSteps = checkout
  .chain(checkout.invoke("Checkout", { 
    ref: "main",
    "fetch-depth": 0 
  }).step)
  .then((checkoutOutputs) => {
    // Access checkout outputs
    const commitSha = checkoutOutputs.commit;
    const ref = checkoutOutputs.ref;
    
    return setupNode.invoke("Setup Node.js", {
      "node-version": "18",
      "cache": "npm"
    }).step;
  })
  .then((setupOutputs) => {
    // Access setup-node outputs
    const nodeVersion = setupOutputs["node-version"];
    const cacheHit = setupOutputs["cache-hit"];
    
    return {
      name: "Install dependencies",
      run: "npm ci"
    };
  })
  .then(() => {
    return {
      name: "Run tests",
      run: "npm test"
    };
  })
  .then(() => {
    return {
      name: "Build",
      run: "npm run build"
    };
  })
  .steps();
```

## Benefits

1. **Fluent API**: Chain multiple actions together in a readable way
2. **Output Access**: Access outputs from previous steps in the chain
3. **Type Safety**: Full TypeScript support with proper typing
4. **Flexibility**: Mix actions with custom run steps
5. **Reusability**: Create reusable step chains

## API Reference

### `chain(initialStep: GitHubStepAny): StepChainBuilder<T>`

Creates a step chain builder starting with the provided step.

### `then(stepFactory: (outputs: O) => GitHubStepAny): StepChainBuilder<O>`

Adds a step to the chain, providing access to outputs from the previous step.

### `steps(): GitHubSteps`

Returns all steps in the chain as an array.

### `[Symbol.iterator]()`

Allows the chain to be spread into an array or used in for...of loops.
