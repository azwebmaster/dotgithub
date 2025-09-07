# Add Action Command

Create a CLI command to get a GitHub action from github.com, generate TypeScript code.

```shell
dotgithub add actions/my-action@v4 [--path <code-path>]
```

Acceptance Criteria:
* The CLI should checkout the github repository (ex: actions/checkout) using a ref such as a branch or tag (ex: v4).
* The CLI should read the action.yml file in the repository to generate the TypeScript code.
* Should generate a typescript file using the action YAML `.name` (ex: `my-action.ts`) and save in the output directory.
* If an index.ts file exists in the output directory, it should be updated to export all types from this action's typescript file (ex: `export * from './my-action.js';`)
* All business logic must live in the core package. Only CLI code should live in the CLI package.


## Example

Given github action repo `actions/my-action` with tag `v4`.

_action.yml_

```yaml
name: 'MyAction'
description: 'Action description'
inputs:
  prop1:
    description: Property 1
    required: true
  prop-2:
    description: Property 2
    default: p2

outputs:
  output1:
    description: 'Output 1'
runs:
  using: node24
  main: dist/index.js
  post: dist/index.js
```

_TypeScript_

```typescript
import {} from '@dotgithub/core'

export type MyActionInputs = {
    /* Property 1 */
    prop1: string;
    /* Property 2 (default p2) */
    prop2?: string;
};

export type MyActionOutputs = {
    /* Output 1 */
    output1: string;
}

/**
 * Action description
 * https://github.com/actions/my-action@v4
 */
export function myAction(inputs: MyActionInputs, step?: Partial<GitHubJobStep>, ref?: string) {
    return createStep("actions/my-action", inputs, step, ref ?? "v4");
}
```