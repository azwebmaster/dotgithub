
import { Command } from 'commander';
import { createAddCommand } from './commands/add.js';
import { createGenerateCommand } from './commands/generate.js';
import { createTemplateCommand } from './commands/template.js';

export function helloCli(): string {
  return 'Hello from @dotgithub/cli!';
}

const program = new Command();

program.addCommand(createAddCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createTemplateCommand());

if (require.main === module) {
  program.parse(process.argv);
}
