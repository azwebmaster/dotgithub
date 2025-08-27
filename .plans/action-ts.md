Generate typescript code from a GitHub Action action.yml file.

* ActionName - name of the action found in the action.yml with casing ActionName and a valid typescript type name
* actionName - name of the action found in the action.yml with casing actionName and a valid typescript type name

It should generate the following code:

* {ActionName}Inputs - a type representing all the action inputs
* {ActionName}Outputs - a type representing all the action outputs
* {actionName} - a function that creates a GitHubStep


## Sample

Repo: actions/create-user
ref: sha1

```yaml
name: create-user
description: Creates a user
inputs:
  name:
    description: This is a name
    default: "John Doe"
    required: true
  address:
    description: This is the address
    required: false
outputs:
  id:
    description: ID of user
```

```typescript
import { GitHubStep<T> } from '@dotgithub/core';

export type CreateUserInputs = {
    /* This is a name */
    name: string;
    /* This is the address */
    address?: string;
}

export type CreateUserOutputs = {
    /* ID of user */
    id: string;
}

/*
  Creates a user.
  https://github.com/actions/create-user/tree/sha1
*/
export function createUser(inputs: CreateUserInputs, step?: Partial<GitHubStep<CreateUserInputs>>, ref?: string): GitHubStep {
    const inputsWithDefaults = {
        name: "John Doe",
        ...inputs
    };
    return createStep("actions/my-action", inputsWithDefaults, step, ref ?? "sha1");
}
```