import { Construct, GitHubStack } from './base.js';
import type { IConstruct } from './base.js';
import type { ActionConstructProps } from './action.js';
import { ActionConstruct } from './action.js';

/**
 * Base class for organization-specific action collections.
 * Provides a foundation for generated ActionsConstruct classes that expose
 * all actions from a specific GitHub organization.
 */
export abstract class ActionsConstruct extends Construct {
  constructor(scope: IConstruct | undefined, id: string) {
    super(scope, id);
  }

  /**
   * Helper method to create an ActionConstruct instance.
   * This is used by generated methods in organization-specific classes.
   */
  protected createActionConstruct<T extends ActionConstruct>(
    ActionConstructClass: new (
      scope: IConstruct | undefined,
      id: string,
      props: ActionConstructProps<any>
    ) => T,
    actionName: string,
    props: ActionConstructProps<any>
  ): T {
    const id = `${this.node.id}-${actionName}`;
    return new ActionConstructClass(this, id, props);
  }
}
