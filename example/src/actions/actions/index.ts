import { ActionCollection } from "@dotgithub/core";
import { Checkout } from "./checkout.js";
import { SetupNode } from "./setup-node.js";

export class ActionsCollection extends ActionCollection {
  checkout = new Checkout(this);
  setupNode = new SetupNode(this);
}
