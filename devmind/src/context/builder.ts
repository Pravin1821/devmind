import {DevmindStore} from '../memory/store';
import {checkPrompt} from '../analyzer/dupDetector';

export async function buildContext(prompt: string, store: DevmindStore): Promise<string>{
    const files = store.getFiles();
    const tasks = store.getTasks();
    const decisions = store.getDecisions();

    const relatedFiles = await checkPrompt(prompt, store, 0.2);
    let context = `[DEVMIND PROJECT CONTEXT]\n\n`;

    if (files.length > 0) {
        context += `ALREADY BUILT (do not rebuild these):\n`
        files.forEach(file => {
            const fileName = file.path.split(/[\\/]/).pop()
            context += `  → ${fileName} (${file.language})\n`
        })
        context += '\n'
    }

    if (relatedFiles.length > 0) {
        context += `RELATED TO YOUR PROMPT:\n`
        relatedFiles.forEach(match => {
            context += `  → ${match.fileName} (${match.similarity * 100}% match)\n`
            context += `     ${match.verdict}\n`
        })
        context += '\n'
    }

    const doneTasks = tasks.filter(t => t.status === 'done')
    if (doneTasks.length > 0) {
        context += `COMPLETED TASKS:\n`
        doneTasks.forEach(task => {
            context += `  → ${task.prompt}\n`
        })
        context += '\n'
    }

    if (decisions.length > 0) {
        context += `ARCHITECTURAL DECISIONS:\n`
        decisions.forEach(d => {
            context += `  → ${d.decision}: ${d.reason}\n`
        })
        context += '\n'
    }

    context += `INSTRUCTIONS:\n`
    context += `  → Do not rebuild anything listed in ALREADY BUILT\n`
    context += `  → Check RELATED TO YOUR PROMPT before generating new code\n`
    context += `  → Follow existing patterns in the codebase\n`
    context += `  → Be concise and specific\n\n`
    context += `[END OF CONTEXT]\n\n`

    return context;
}