import chalk from 'chalk';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.AI_MODEL || 'llama3.2';

async function checkOllama(): Promise<boolean> {
    try {
        const res = await fetch(OLLAMA_URL)
        return res.ok
    } catch {
        return false
    }
}

export async function askOllama(prompt: string, store: any, fullPrompt: string, promptTokens: number): Promise<string> {
    const isRunning = await checkOllama()
    if (!isRunning) {
        console.log(chalk.red('✗ Ollama not running!'))
        console.log(chalk.yellow(`  Start Ollama or set AI_PROVIDER to openai/nvidia/anthropic in .env`))
        console.log(chalk.yellow(`  Install: ollama.com`))
        return ''
    }

    console.log(chalk.gray('  ◇ Starting generation...\n'))

    try{
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                prompt: fullPrompt,
                stream: false
            }),
        });
        if(!response.ok){
            throw new Error(`Ollama error: ${response.status}`)
        }
        const data = await response.json() as { response: string}
        store.addTask(prompt, data.response, 'done');
        store.addTokenLog('ask', promptTokens, 0);
        return data.response;
    }
    catch(error){
        if(String(error).includes('fetch failed') || String(error).includes('ECONNREFUSED')){
            throw new Error(`Ollama is not running at ${OLLAMA_URL}`);
        }
        throw error;
    }
}
