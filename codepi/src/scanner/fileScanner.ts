import path from 'path';
import fs from 'fs';
import { CodePiStore } from '../memory/store';
import { generateEmbedding } from '../embeddings/embedder';
import chalk from 'chalk';

const IGNORED_DIRS = [
    'node_modules',
    '.git',
    '.codepi',
    'dist',
    'build',
    'coverage',
    '.next'
]

const IGNORED_FILES = [
    '.env',
    '.env.example',
    '.env.local',
    'package-lock.json',
    '.gitignore',
    'package.json',
]

const IGNORED_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
    '.log',
    '.lock',
    '.zip', '.tar', '.gz',
    '.ttf', '.woff', '.woff2',
    '.mp4', '.mp3',
    '.env'
]

const LANGUAGE_MAP : Record<string,string> = {
  '.ts'   : 'TypeScript',
  '.tsx'  : 'TypeScript',
  '.js'   : 'JavaScript',
  '.jsx'  : 'JavaScript',
  '.java' : 'Java',
  '.py'   : 'Python',
  '.go'   : 'Go',
  '.rs'   : 'Rust',
  '.cpp'  : 'C++',
  '.c'    : 'C',
  '.cs'   : 'C#',
  '.php'  : 'PHP',
  '.rb'   : 'Ruby',
  '.html' : 'HTML',
  '.css'  : 'CSS',
  '.scss' : 'SCSS',
  '.json' : 'JSON',
  '.md'   : 'Markdown',
  '.sql'  : 'SQL',
  '.sh'   : 'Shell',
  '.yml'  : 'YAML',
  '.yaml' : 'YAML',
  '.env'  : 'ENV'
}

function getLanguage(filePath: string): string{
    const extension = path.extname(filePath).toLowerCase();
    return LANGUAGE_MAP[extension] || 'Unknown';
}

function shouldIgnore(filePath: string): boolean{
    const dirName = path.basename(filePath);
    if(IGNORED_FILES.includes(dirName)){
        return true;
    }
    if(IGNORED_DIRS.includes(dirName)){
        return true;
    }
    const extension = path.extname(filePath).toLowerCase();
    if(IGNORED_EXTENSIONS.includes(extension)){
        return true;
    }
    return false;
}

function collectFiles(dirPath: string, result: string[] = []): string[]{
    let items: string[];
    try{
        items = fs.readdirSync(dirPath);
    }catch(error){
        console.log(chalk.red(`Error reading directory ${dirPath}: ${error}`));
        return [];
    }

    for(const item of items)
    {
        const filePath = path.join(dirPath, item);
        if(shouldIgnore(filePath)) {continue;}
        let stat
        try{
            stat = fs.statSync(filePath);
        }catch(error){
            continue;
        }
        if(stat.isDirectory()){
            collectFiles(filePath, result);
        }else{
            result.push(filePath);
        }
    }
    return result;
}

export async function scanProject(projectPath: string, store: CodePiStore): Promise<string[]>{
    const allFiles = collectFiles(projectPath);
    for(const filePath of allFiles){
        const language = getLanguage(filePath);
        let summary = '';
        try{
            const content = fs.readFileSync(filePath, 'utf8');
            summary = content.split('\n').slice(0, 50).join('\n');
        }catch(error){
            summary = '';
        }
        store.addFile(filePath, language, summary);
        const textToEmbed = `file: ${filePath}\nlanguage: ${language}\nsummary: ${summary}`;
        const embedding = await generateEmbedding(textToEmbed);
        if(embedding.length > 0){
            store.updateEmbedding(filePath, embedding);
        }
        console.log(chalk.green(`Embedded ${filePath}`));
    }
    return allFiles;
}