// GitHub Actions workspace entry point
import { createStep } from "@dotgithub/core";

// Example: Create a checkout step
export const checkoutStep = createStep("actions/checkout@v4", {
  // Add your step configuration here
});

// Export your workflow definitions here
export * from "./workflows/index.js";
