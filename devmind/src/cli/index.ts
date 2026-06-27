import {Command} from 'commander';
import chalk from 'chalk';

const program = new Command();
program
  .name('devmind')
  .description('AI memory layer for your codebase')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize devmind memory for this project')
  .action(() => {
    console.log(chalk.green('Initializing devmind memory...'));
  });

program
  .command('scan')
  .description('Scan project files and store in memory')
  .action(() => {
    console.log(chalk.blue('Scanning project files...'));
  });

program
  .command('status')
  .description('Show what is built and pending')
  .action(() => {
    console.log(chalk.yellow('Fetching project status...'));
  });

program.parse();