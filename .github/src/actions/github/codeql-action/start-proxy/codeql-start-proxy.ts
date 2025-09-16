import { createStep } from "@dotgithub/core";
import type {
  GitHubStep,
  GitHubStepBase,
  GitHubActionInputValue,
} from "@dotgithub/core";

export type CodeQLStartProxyInputs = {
  /** The URLs and credentials of package registries | default: "[]" */
  registry_secrets?: GitHubActionInputValue;
  /** Base64 encoded JSON configuration for the URLs and credentials of the package registries */
  registries_credentials?: GitHubActionInputValue;
  /** GitHub token to use for authenticating with this instance of GitHub. The token must be the built-in GitHub Actions token, and the workflow must have the `security-events: write` permission. Most of the time it is advisable to avoid specifying this input so that the workflow falls back to using the default value. | default: "${{ github.token }}" */
  token?: GitHubActionInputValue;
  /** The programming language to setup the proxy for the correct ecosystem */
  language?: GitHubActionInputValue;
};
export type CodeQLStartProxyOutputs = {
  /** The IP address of the proxy */
  proxy_host: string;
  /** The port of the proxy */
  proxy_port: string;
  /** The proxy's internal CA certificate in PEM format */
  proxy_ca_certificate: string;
  /** A stringified JSON array of objects containing the types and URLs of the configured registries. */
  proxy_urls: string;
};
/**
  [Experimental] Start HTTP proxy server. This action is for internal GitHub used only and will change without notice.

  https://github.com/github/codeql-action/start-proxy/tree/v3
*/
export function codeQLStartProxy(
  inputs?: CodeQLStartProxyInputs,
  step?: Partial<GitHubStepBase>,
  ref?: string,
): GitHubStep<CodeQLStartProxyInputs> {
  return createStep(
    "github/codeql-action/start-proxy",
    { ...step, with: inputs },
    ref ?? "528ca598d956c91826bd742262cdfc5d02b77710",
  );
}
