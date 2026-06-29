import {Command} from 'commander';
import chalk from 'chalk';
import {initializeStore} from '../memory/store';

const program = new Command();
program
  .name('devmind')
  .description('AI memory layer for your codebase')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize devmind memory for this project')
  .action(() => {
    try{
        const projectPath = process.cwd();
        console.log(chalk.blue(`Initializing devmind memory for ${projectPath}`));
        const store = initializeStore(projectPath);
        console.log(chalk.green('Devmind memory initialized!'));
        console.log(chalk.gray('Memory stored at: ${projectPath}/.devmind/memory.db'));
    } catch (error) {
        console.log(chalk.red(`Error initializing devmind memory: ${error}`));
    }
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
    try{
      const projectPath = process.cwd();
      const store = initializeStore(projectPath);

      const files = store.getFiles();
      const tasks = store.getTasks();
      const decisions = store.getDecisions();
      const duplicates = store.getDuplicates();

      console.log(chalk.bold('\n devmind status \n'));
      console.log(chalk.green(' File scanned: ${files.length}'));
      console.log(chalk.green(' Tasks recorded: ${tasks.length}'));
      console.log(chalk.green(' Decisions logged: ${decisions.length}'));
      console.log(chalk.green(' Duplicates flagged: ${duplicates.length}'));
    }
    catch (error) {
      console.log(chalk.red(`Error getting status: ${error}`));
    }
  });

program.parse(process.argv);

program.on('command:*', () => {
  });

program.parse();