
import { Command } from 'commander';
import { createAddCommand } from './commands/add.js';
import { createGenerateCommand } from './commands/generate.js';
import { createTemplateCommand } from './commands/template.js';
import { createConfigCommand } from './commands/config.js';
import { createRemoveCommand } from './commands/remove.js';

export function helloCli(): string {
  return 'Hello from @dotgithub/cli!';
}

const program = new Command();

program.addCommand(createAddCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createTemplateCommand());
program.addCommand(createConfigCommand());
program.addCommand(createRemoveCommand());

if (require.main === module) {
  program.parse(process.argv);
}
