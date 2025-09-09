
import { Command } from 'commander';
import { setConfigPath } from '@dotgithub/core';
import { createAddCommand } from './commands/add.js';
import { createTemplateCommand } from './commands/template.js';
import { createConfigCommand } from './commands/config.js';
import { createRemoveCommand } from './commands/remove.js';
import { createRegenerateCommand } from './commands/regenerate.js';
import { createListCommand } from './commands/list.js';
import { createInitCommand } from './commands/init.js';

export function helloCli(): string {
  return 'Hello from @dotgithub/cli!';
}

const program = new Command();

program
  .option('-c, --config <path>', 'path to config file (default: .github/dotgithub.json)')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    if (options.config) {
      setConfigPath(options.config);
    }
  });

program.addCommand(createInitCommand());
program.addCommand(createAddCommand());
program.addCommand(createTemplateCommand());
program.addCommand(createConfigCommand());
program.addCommand(createRemoveCommand());
program.addCommand(createRegenerateCommand());
program.addCommand(createListCommand());

if (require.main === module) {
  program.parse(process.argv);
}
