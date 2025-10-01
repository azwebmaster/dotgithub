
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
  // Get global options from the program
  const globalOpts = program.opts();
  const configPath = commandOptions.config || globalOpts.config || '.github/dotgithub.json';
  return DotGithubContext.fromConfig(configPath);
}

// Create a context function that uses the program instance
function createContextForCommandWithProgram() {
  return (commandOptions: GlobalCliOptions = {}): DotGithubContext => {
    // Get global options from the program after it's been parsed
    const globalOpts = program.opts();
    const configPath = commandOptions.config || globalOpts.config || '.github/dotgithub.json';
    return DotGithubContext.fromConfig(configPath);
  };
}

program.addCommand(createInitCommand(createContextForCommandWithProgram()));
program.addCommand(createAddCommand(createContextForCommandWithProgram()));
program.addCommand(createUpdateCommand(createContextForCommandWithProgram()));
program.addCommand(createConfigCommand(createContextForCommandWithProgram()));
program.addCommand(createRemoveCommand(createContextForCommandWithProgram()));
program.addCommand(createRegenerateCommand(createContextForCommandWithProgram()));
program.addCommand(createListCommand(createContextForCommandWithProgram()));
program.addCommand(createSynthCommand(createContextForCommandWithProgram()));
program.addCommand(createPluginCommand(createContextForCommandWithProgram()));

// Enable global options to be passed to subcommands
program.passThroughOptions();

if (require.main === module) {
  program.parse(process.argv);
}
