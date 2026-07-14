import { DevmindStore } from "../memory/store";
import { buildContext } from "../context/builder";
import chalk from 'chalk';


const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'llama3.2';

async function checkOllama(): Promise<boolean> {
    try {
        const res = await fetch('http://localhost:11434')
        return res.ok
    } catch {
        return false
    }
}

export async function askOllama(prompt: string, store: DevmindStore): Promise<string> {
    const isRunning = await checkOllama()
    if (!isRunning) {
        console.log(chalk.red('✗ Ollama not running!'))
        console.log(chalk.yellow('  1. Install Ollama from ollama.com'))
        console.log(chalk.yellow('  2. Run: ollama pull llama3.2'))
        console.log(chalk.yellow('  3. Ollama starts automatically after install'))
        return ''
    }

    console.log('Buiilding context from memory...');
    const context = await buildContext(prompt, store);
    const fullPromt = context + `USER PROMPT:\n${prompt}`;
    const promptTokens = Math.round(fullPromt.length / 4);
    const files = store.getFiles();
    const fullCodebaseSize = files.reduce((sum: number, f: any) => {
        return sum+(f.summary?.length || 0)
    },0)
    const savedTokens = Math.round((fullCodebaseSize - fullPromt.length) / 4);

    console.log(chalk.gray(`Context: ${promptTokens} tokens used, ~${savedTokens} tokens saved`))
    console.log('Sending to Ollama...\n')

    try{
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: fullPromt,
                stream: false
            }),
        });
        if(!response.ok){
            throw new Error(`Ollama error: ${response.status}`)
        }
        const data = await response.json() as { response: string}
        store.addTask(prompt, data.response, 'done');
        store.addTokenLog('ask', promptTokens, Math.max(0,savedTokens));
        return data.response;
    }
    catch(error){
        if(String(error).includes('fetch failed') || String(error).includes('ECONNREFUSED')){
            throw new Error(`Ollama is not running at ${OLLAMA_URL}`);
        }
        throw error;
    }
}