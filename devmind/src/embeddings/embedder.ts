import { pipeline, env} from '@xenova/transformers';
import chalk from 'chalk';

env.cacheDir = './.devmind/models'
let embedder: any = null;

async function getEmbedder() {
    if(!embedder){
        console.log(chalk.gray('  ◇ Loading embedding model...'));
        embedder = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
        console.log(chalk.gray('  ◇ Embedding model ready'));
    }
    return embedder;
}

export async function generateEmbedding(text: string): Promise<number[]> {
    try{
        const trimmedText = text.slice(0, 8000);
        const embed = await getEmbedder();
        const result = await embed(trimmedText, {
            pooling: 'mean',
            normalize: true,
        });
        return Array.from(result.data) as number[];
    }catch(e){
        console.log('Error generating embedding', e);
        return [];
    }
}
export function cosineSimilarity(vecA: number[], vecB: number[]): number{
    if(vecA.length === 0 || vecB.length === 0)  return 0;
    if(vecA.length !== vecB.length)  return 0;
    let dotProduct = 0;
    for(let i=0;i<vecA.length;i++)
    {
        dotProduct += vecA[i] * vecB[i];
    }
    let magnitudeA = 0;
    let magnitudeB = 0;
    for(let i=0;i<vecA.length;i++)
    {
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);
    if(magnitudeA === 0 || magnitudeB === 0)  return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}