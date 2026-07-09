import {Command} from 'commander';
import chalk from 'chalk';
import {initializeStore} from '../memory/store';
import {scanProject} from '../scanner/fileScanner';
import { findDuplicates, checkPrompt } from '../analyzer/dupDetector';
import { askOllama } from '../ai/ollama';

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
        console.log(chalk.gray(`Memory stored at: ${projectPath}/.devmind/memory.db`));
    } catch (error) {
        console.log(chalk.red(`Error initializing devmind memory: ${error}`));
    }
  });

program
  .command('scan')
  .description('Scan project files and store in memory')
  .action(async () => {
    try{
      const projectPath = process.cwd()
      const store = initializeStore(projectPath)
      store.clearFiles()
      console.log(chalk.blue('Scanning project...'))
      const files = await scanProject(projectPath, store)
      console.log(chalk.green(`Scanned and embedded ${files.length} files`))
      console.log(chalk.gray(`Memory stored at: ${projectPath}/.devmind/memory.db`))
    } catch (error) {
      console.log(chalk.red(`Error scanning project: ${error}`));
    }
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
      console.log(chalk.green(' File scanned: '+files.length));
      console.log(chalk.green(' Tasks recorded: '+tasks.length));
      console.log(chalk.green(' Decisions logged: '+decisions.length));
      console.log(chalk.green(' Duplicates flagged: '+duplicates.length));
    }
    catch (error) {
      console.log(chalk.red(`Error getting status: ${error}`));
    }
  });

  program
      .command('duplicates')
      .description('Find duplicate files in your project')
      .action(() => {
        try{
          const projectPath = process.cwd();
          const store = initializeStore(projectPath);
          console.log(chalk.blue('Scanning for duplicates'))
          const duplicates = findDuplicates(store);
          if(duplicates.length === 0)
          {
            console.log(chalk.green('No duplicates found'));
            return;
          }
          console.log(chalk.red(`\n Found ${duplicates.length} duplicates(s): \n`))
          duplicates.forEach((dup,i) => {
            console.log(chalk.yellow(`${i+1}. ${dup.verdict}`))
            console.log(chalk.gray(`File A: ${dup.fileA}`))
            console.log(chalk.gray(`File B: ${dup.fileB}`))
            console.log('')
          })      
        }
        catch(error){
          console.log(chalk.red(`Error finding duplicates: ${error}`));
        }
      });
  
  program
      .command('check <prompt>')
      .description('Check if a feature already exists before building')
      .action(async (prompt: string) => {
          try{
            const projectPath = process.cwd();
            const store = initializeStore(projectPath);
            console.log(chalk.blue(`\nChecking: ${prompt}\n`))
            const matches = await checkPrompt(prompt, store);
            if(matches.length === 0)
            {
              console.log(chalk.green('✓ Nothing similar found — safe to build!'))
              return
            }
            console.log(chalk.yellow(`⚠ Found ${matches.length} related file(s):\n`));
            matches.forEach((match, i) => {
                console.log(chalk.yellow(`${i + 1}. ${match.verdict}`))
                console.log(chalk.gray(`   File: ${match.fileName}`))
                console.log(chalk.gray(`   Path: ${match.filePath}`))
                console.log(chalk.gray(`   Language: ${match.language}`))
                console.log('')
            })
          }
          catch(error){
            console.log(chalk.red(`Error checking prompt: ${error}`));
          }
        });

program
  .command('ask <prompt>')
  .description('Ask AI with full project context injected')
  .action(async (prompt: string) => {
    try{
      const projectPath = process.cwd();
      const store = initializeStore(projectPath);
      console.log(chalk.blue(`\ndevmind ask: ${prompt}\n`));
      const response = await askOllama(prompt, store);
      console.log(chalk.green(`\n$AI Response: ${response}\n`));
      console.log('');
    }
    catch(error){
      console.log(chalk.red(`Error asking AI: ${error}`));
      console.log(chalk.gray('Make sure Ollama is running: Ollama server'));
    }
  })

program.parse(process.argv);
