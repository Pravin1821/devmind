#!/usr/bin/env node
import 'dotenv/config'
import {Command} from 'commander';
import chalk from 'chalk';
import {initializeStore} from '../memory/store';
import {scanProject} from '../scanner/fileScanner';
import { findDuplicates, checkPrompt } from '../analyzer/dupDetector';
import { askAI } from '../ai/provider';

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
  .description('Show what is built, pending and token saved')
  .action(() => {
    try{
      const projectPath = process.cwd();
      const store = initializeStore(projectPath);

      const files = store.getFiles();
      const tasks = store.getTasks();
      const decisions = store.getDecisions();
      const duplicates = store.getDuplicates();
      const tokenLogs = store.getTokenLogs();

      console.log(chalk.bold.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
      console.log(chalk.bold.white('  devmind — project intelligence'))
      console.log(chalk.bold.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))

      console.log(chalk.bold.yellow('  MEMORY'))
      console.log(chalk.green(`  ✓ Files scanned:       ${files.length}`))
      console.log(chalk.green(`  ✓ Tasks completed:     ${tasks.filter((t:any) => t.status === 'done').length}`))
      console.log(chalk.green(`  ✓ Decisions logged:    ${decisions.length}`))
      console.log(chalk.red(`  ⚠ Duplicates flagged:  ${duplicates.length}`))

       if (tasks.length > 0) {
        console.log(chalk.bold.yellow('\n  RECENT PROMPTS'))
        tasks.slice(-5).reverse().forEach((task: any) => {
          const status = task.status === 'done'
            ? chalk.green('✓')
            : chalk.yellow('⏳')
          console.log(`  ${status} ${chalk.white(task.prompt)}`)
          console.log(chalk.gray(`    → ${task.result?.slice(0, 80)}...`))
          console.log(chalk.gray(`    → ${task.created_at}`))
        })
      }

      if (duplicates.length > 0) {
        console.log(chalk.bold.yellow('\n  DUPLICATES FLAGGED'))
        duplicates.forEach((dup: any) => {
          const fileA = dup.file_a.split(/[\\/]/).pop()
          const fileB = dup.file_b.split(/[\\/]/).pop()
          console.log(chalk.red(`  ⚠ ${fileA} ↔ ${fileB} (${Math.round(dup.similarity * 100)}% similar)`))
        })
      }

      if (tokenLogs.length > 0) {
        const totalPromptTokens = tokenLogs.reduce((sum: number, log: any) => sum + log.prompt_tokens, 0)
        const totalSavedTokens = tokenLogs.reduce((sum: number, log: any) => sum + log.saved_tokens, 0)
        const savingPercent = totalPromptTokens > 0
          ? Math.round((totalSavedTokens / (totalPromptTokens + totalSavedTokens)) * 100)
          : 0

        console.log(chalk.bold.yellow('\n  TOKEN SAVINGS'))
        console.log(chalk.green(`  ✓ Tokens used:         ${totalPromptTokens}`))
        console.log(chalk.green(`  ✓ Tokens saved:        ${totalSavedTokens}`))
        console.log(chalk.green(`  ✓ Efficiency:          ${savingPercent}% saved`))
      }

      console.log(chalk.bold.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))

    } catch (error) {
      console.log(chalk.red('✗ Could not read devmind memory'))
      console.log(chalk.gray('  Run devmind init first'))
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
      console.log(chalk.bold.cyan('\n╭─ devmind ask ─────────────────────────────────╮'));
      console.log(chalk.white(`  ${prompt}`));
      console.log(chalk.bold.cyan('╰────────────────────────────────────────────────╯\n'));
      const response = await askAI(prompt, store);
      console.log(chalk.bold('\n── Response ──────────────────────────────────────'));
      console.log(chalk.white(`${response}`));
      console.log(chalk.bold('──────────────────────────────────────────────────\n'));
    }
    catch(error){
      console.log(chalk.red(`\n✗ Error: ${error}`));
      console.log(chalk.gray('  Check your .env config or AI provider setup\n'));
    }
  })

program
  .command('history')
  .description('Show past prompts and AI responses')
  .action(() => {
    try{
      const projectPath = process.cwd();
      const store = initializeStore(projectPath);
      const tasks = store.getTasks();

      if(tasks.length === 0){
        console.log(chalk.yellow('No history yet - use devmind ask to start a conversation!'));
        return;
      }
      console.log(chalk.bold.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
      console.log(chalk.bold.white('  devmind history'))
      console.log(chalk.bold.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))

      tasks.reverse().forEach((task: any, i: number) => {
        console.log(chalk.bold.yellow(`  ${i + 1}. ${task.prompt}`))
        console.log(chalk.gray(`     ${task.created_at}`))
        console.log(chalk.white(`     ${task.result?.slice(0, 150)}...`))
        console.log('')
      })

      console.log(chalk.bold.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))

    } catch (error) {
      console.log(chalk.red('✗ Could not read history'))
      console.log(chalk.gray('  Run devmind init first'))
    }
  })

program.parse(process.argv);
