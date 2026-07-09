import { DevmindStore } from "../memory/store";
import { buildContext } from "../context/builder";

const OLLAMA_URL = 'http://localhost:11434';
const MODEL = 'llama3.2';

export async function askOllama(prompt: string, store: DevmindStore): Promise<string> {
    console.log('Buiilding context from memory...');
    const context = await buildContext(prompt, store);

    const fullPromt = context + `USER PROMPT:\n${prompt}`;
    console.log('Sending prompt to Ollama...');

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
        return data.response;
    }
    catch(error){
        if(String(error).includes('fetch failed') || String(error).includes('ECONNREFUSED')){
            throw new Error(`Ollama is not running at ${OLLAMA_URL}`);
        }
        throw error;
    }
}