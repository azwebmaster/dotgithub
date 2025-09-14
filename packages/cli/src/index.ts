
import { Command } from 'commander';
import { DotGithubContext } from '@dotgithub/core';
import { createAddCommand } from './commands/add.js';
import { createConfigCommand } from './commands/config.js';
import { createRemoveCommand } from './commands/remove.js';
import { createRegenerateCommand } from './commands/regenerate.js';
import { createListCommand } from './commands/list.js';
import { createInitCommand } from './commands/init.js';
import { createUpdateCommand } from './commands/update.js';
import { createSynthCommand } from './commands/synth.js';
import { createPluginCommand } from './commands/plugin.js';

export function helloCli(): string {
  return 'Hello from @dotgithub/cli!';
}

interface GlobalCliOptions {
  config?: string;
  verbose?: boolean;
  token?: string;
}

const program = new Command();

program
  .option('-c, --config <path>', 'path to config file (default: .github/dotgithub.json)', '.github/dotgithub.json')
  .option('-v, --verbose', 'enable verbose logging')
  .option('-t, --token <token>', 'GitHub token (overrides env GITHUB_TOKEN)');

// Create context function that can be called by commands
function createContextForCommand(commandOptions: GlobalCliOptions = {}): DotGithubContext {
  const configPath = commandOptions.config || program.opts().config || '.github/dotgithub.json';
  return DotGithubContext.fromConfig(configPath);
}

program.addCommand(createInitCommand(createContextForCommand));
program.addCommand(createAddCommand(createContextForCommand));
program.addCommand(createUpdateCommand(createContextForCommand));
program.addCommand(createConfigCommand(createContextForCommand));
program.addCommand(createRemoveCommand(createContextForCommand));
program.addCommand(createRegenerateCommand(createContextForCommand));
program.addCommand(createListCommand(createContextForCommand));
program.addCommand(createSynthCommand(createContextForCommand));
program.addCommand(createPluginCommand(createContextForCommand));

if (require.main === module) {
  program.parse(process.argv);
}
