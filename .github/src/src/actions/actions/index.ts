import { ActionsConstruct } from "@dotgithub/core";
import type { Construct, GitHubStepAction } from "@dotgithub/core";

import {
  Checkout as Checkout,
  type CheckoutInputs as CheckoutInputs,
} from "./checkout.js";

/**
 * Actions organization actions.
 * Provides convenient access to all actions from the actions organization.
 *
 * Usage:
 * ```typescript
 * const actions = new Actions(stack, "actions");
 * const checkoutStep = actions.checkout("Checkout code", { inputs: {...} }).toStep();
 * ```
 */
export class Actions extends ActionsConstruct {
  constructor(scope: Construct | undefined, id: string) {
    super(scope, id);
  }

  /**
   * Checkout a Git repository at a particular version
   *
   * @param name The name of the step
   * @param inputs Optional input parameters
   * @param stepOptions Optional step configuration overrides
   * @param ref Optional git reference override
   * @returns A Checkout instance
   */
  public checkout = (
    name: string,
    inputs?: CheckoutInputs,
    stepOptions?: Partial<Omit<GitHubStepAction, "uses" | "with" | "name">>,
    ref?: string,
  ): Checkout => {
    return this.createActionConstruct(Checkout, "Checkout", {
      inputs,
      stepOptions: { name, ...stepOptions },
      ref,
    });
  };
}
