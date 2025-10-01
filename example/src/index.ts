// GitHub Actions workspace entry point
import { createStep, DotGithubContext, DotGitHubPlugin, GitHubJob, GitHubStack, PluginContext, PluginDescription } from '@dotgithub/core';
import { z } from 'zod';
import { Checkout, CheckoutInputs, CheckoutOutputs } from './actions/actions/checkout';
import { ActionsCollection } from './actions/actions/index';

export class ExamplePlugin implements DotGitHubPlugin {
    readonly name = 'example';
    readonly version = '1.0.0';
    readonly description = 'Example plugin for demonstrating plugin functionality';

    private readonly configSchema = z.object({
        environment: z.string()
            .min(1, 'Environment is required')
            .describe('The environment to deploy to (e.g., production, staging)'),
        timeout: z.number()
            .min(1, 'Timeout must be at least 1 minute')
            .max(60, 'Timeout cannot exceed 60 minutes')
            .optional()
            .default(10)
            .describe('Job timeout in minutes'),
        nodeVersion: z.string()
            .regex(/^\d+\.\d+$/, 'Node version must be in format X.Y (e.g., 18.17)')
            .optional()
            .default('18.17')
            .describe('Node.js version to use')
    });

    validate(context: PluginContext): void {
        this.configSchema.parse(context.config);
    }

    describe(): PluginDescription {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: 'DotGitHub Team',
            repository: 'https://github.com/azwebmaster/dotgithub',
            license: 'MIT',
            keywords: ['example', 'ci', 'github-actions'],
            category: 'ci',
            configSchema: this.configSchema,
            tags: ['ci', 'testing', 'automation'],
            minDotGithubVersion: '1.0.0'
        };
    }

    async synthesize(context: PluginContext): Promise<void> {
        const { stack, config, actions: contextActions } = context;
        const { run } = contextActions;
        // Create ActionCollection with the plugin context
        const actions = new ActionsCollection(context);

        // Parse and validate config using the schema
        const validatedConfig = this.configSchema.parse(config);
        
        const { checkout, setupNode } = actions;

        
    

        const checkoutResult = checkout.invoke("Checkout Code", {
            "fetch-depth": 1
        }, { id: 'checkout' });

        const setupNodeResult = setupNode.invoke('Setup Node', {
            "node-version": validatedConfig.nodeVersion,
            "always-auth": true
        });

        const buildJob: GitHubJob = {
            'runs-on': 'ubuntu-latest',
            environment: validatedConfig.environment,
            'timeout-minutes': validatedConfig.timeout,
            outputs: {
                checkout_commit: checkoutResult.outputs.commit.toExpr()
            },
            steps: [
                ...checkout.chain("Checkout Code", {
                    "fetch-depth": 1
                }).then(outputs => {
                    const x = outputs.ref.toExpr();
                    return run('Echo', `echo "Checkout ref: ${x}"`);
                }).then(outputs => {
                    const x = outputs.commit.toExpr();
                    return run('Echo', `echo "Checkout commit: ${x}"`);
                }),
                setupNodeResult.step,
                run('Echo', 'echo "Hello, world!"')
            ]
        };

        const ciWorkflow = stack.addWorkflow('ci',
            {
                on: { push: {}, pull_request: {} },
                jobs: {
                    build: buildJob
                }
            }
        );

        // const testJob: GitHubJob = {
        //     'runs-on': 'ubuntu-latest',
        //     steps: [
        //         actions.checkout({
        //             "fetch-tags": 
        //         })
        //     ]
        // }
    }
}

export default new ExamplePlugin();