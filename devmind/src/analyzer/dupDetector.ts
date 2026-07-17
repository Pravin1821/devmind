import path from 'path';
import chalk from 'chalk';
import { DevmindStore } from '../memory/store';
import { generateEmbedding, cosineSimilarity } from '../embeddings/embedder';

export interface DuplicateResult {
    fileA: string;
    fileB: string;
    similarity: number;
    verdict: string;
}

export function findDuplicates(store: DevmindStore, threshold: number = 0.85): DuplicateResult[]{
    const files = store.getFiles();
    if(files.length < 2)
    {
        console.log('No files to compare');
        return [];
    }
    const filesWithEmbedding = files.filter(file => file.embedding != null)
    if(filesWithEmbedding.length < 2)
    {
        console.log('Not enough embedded files to compare');
        return [];
    }
    const duplicates: DuplicateResult[] = [];
    for(let i=0;i<filesWithEmbedding.length;i++)
    {
        for(let j=i+1;j<filesWithEmbedding.length;j++)
        {
            const fileA = filesWithEmbedding[i];
            const fileB = filesWithEmbedding[j];
            
            let embeddingA: number[];
            let embeddingB: number[];

            try{
                embeddingA = JSON.parse(fileA.embedding);
                embeddingB = JSON.parse(fileB.embedding);
            }catch(error){
                console.log(`Failed to parse embeddings for ${fileA.path} and ${fileB.path}: ${error}`);
                continue;
            }

            const similarity = cosineSimilarity(embeddingA, embeddingB);
            const score = Math.round(similarity*100)/100;
            if(score >= threshold){
                const percent = Math.round(score*100);
                const verdict = percent >= 95 
                    ? `${percent}% similar - very likely duplicate`
                    : percent >= 90
                    ? `${percent}% similar - probable duplicate`
                    : `${percent}% similar - possible duplicates`
                const result: DuplicateResult = {
                    fileA: fileA.path,
                    fileB: fileB.path,
                    similarity: score,
                    verdict
                }
                duplicates.push(result);
                store.addDuplicate(fileA.path, fileB.path, score);
            }
        }
    }
    duplicates.sort((a,b) => b.similarity - a.similarity);
    return duplicates;
}

export interface PromptMatch{
    filePath: string
    fileName: string
    similarity: number
    language: string
    verdict: string
}

export async function checkPrompt(
    prompt: string,
    store: DevmindStore,
    threshold: number = 0.2
): Promise<PromptMatch[]>{
    console.log(chalk.gray('  ◇ Analyzing prompt...'));
    const promptEmbedding = await generateEmbedding(prompt)
    if(promptEmbedding.length === 0){
        console.log('Failed to generate embedding for prompt');
        return [];
    }

    const files = store.getFiles().filter(f => f.embedding !== null)
    // console.log(`Debug: found ${files.length} files, ${files.filter(f => f.embedding).length} with embeddings`)
    // for (const file of files) {
    // try {
    //     const emb = JSON.parse(file.embedding)
    //     const sim = cosineSimilarity(promptEmbedding, emb)
    //     console.log(`  ${path.basename(file.path)}: ${Math.round(sim * 100)}%`)
    // } catch {}
    // }
    if(files.length ===0 )
    {
        console.log('No files in memory - run devmind scan first');
        return [];
    }

    const matches: PromptMatch[] = [];
    for(const file of files){
        let fileEmbedding: number[];
        try{
            fileEmbedding = JSON.parse(file.embedding);
        }
        catch{
            continue;
        }

        const similarity = cosineSimilarity(promptEmbedding, fileEmbedding)
        const score = Math.round(similarity*100)/100;
        if(score >= threshold){
            const percent = Math.round(score*100);
            const verdict = percent >= 50
                ? `${percent}% match — this likely already exists here`
                : percent >= 35
                ? `${percent}% match — related code found here`
                : `${percent}% match — loosely related`
            matches.push({
                filePath: file.path,
                fileName: path.basename(file.path),
                similarity: score,
                language: file.language,
                verdict
            })
        }
    }
    matches.sort((a,b) => b.similarity - a.similarity)
    return matches.slice(0,5);
}