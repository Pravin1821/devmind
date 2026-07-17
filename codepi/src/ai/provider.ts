import { CodePiStore } from "../memory/store";
import { buildContext } from "../context/builder";
import { askOllama } from "./providers/ollama";
import Anthropic from "@anthropic-ai/sdk";
import chalk from "chalk";

type AIProvider = "openai" | "nvidia" | "anthropic" | "ollama";

interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

function getConfig(provider?: AIProvider): AIConfig {
  const raw = (provider || process.env.AI_PROVIDER || "").toLowerCase();
  const resolvedProvider = (["openai", "nvidia", "anthropic", "ollama"].includes(raw)
    ? raw
    : "ollama") as AIProvider;
  const apiKey =
    process.env.NVIDIA_API_KEY ||
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY;
  const baseURL = process.env.AI_BASE_URL;

  const modelMap: Record<AIProvider, string> = {
    openai: process.env.AI_MODEL || "gpt-4o",
    nvidia: process.env.AI_MODEL || "meta/llama-3.3-70b-instruct",
    anthropic: process.env.AI_MODEL || "claude-sonnet-4-20250514",
    ollama: process.env.AI_MODEL || "llama3.2",
  };

  return { provider: resolvedProvider, model: modelMap[resolvedProvider], apiKey, baseURL };
}

async function detectProvider(): Promise<AIConfig> {
  if (process.env.AI_PROVIDER) {
    return getConfig();
  }

  if (process.env.NVIDIA_API_KEY || process.env.AI_API_KEY) {
    return {
      provider: 'nvidia',
      model: process.env.AI_MODEL || 'meta/llama-3.1-8b-instruct',
      apiKey: process.env.NVIDIA_API_KEY || process.env.AI_API_KEY as string,
      baseURL: process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'openai',
      model: process.env.AI_MODEL || 'gpt-4o',
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'anthropic',
      model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.AI_BASE_URL || '',
    };
  }

  try {
    const res = await fetch('http://localhost:11434', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      return {
        provider: 'ollama',
        model: process.env.AI_MODEL || 'llama3.2',
        baseURL: process.env.OLLAMA_URL || 'http://localhost:11434',
      };
    }
  } catch {
    // Ollama not running
  }

  throw new Error('NO_PROVIDER');
}

async function askOpenAI(
  prompt: string,
  store: CodePiStore,
  config: AIConfig,
  fullPrompt: string
): Promise<string> {
  const timeout = parseInt(process.env.AI_TIMEOUT || '300000', 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${config.baseURL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: fullPrompt }],
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || '';
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error(`Request timed out after ${timeout / 1000}s`);
    throw e;
  }
}

async function askAnthropic(
  _prompt: string,
  _store: CodePiStore,
  config: AIConfig,
  fullPrompt: string
): Promise<string> {
  const client = new Anthropic({
    apiKey: config.apiKey,
  });

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 4096,
    messages: [{ role: "user", content: fullPrompt }],
  });

  return response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("\n");
}

export async function askAI(
  prompt: string,
  store: CodePiStore
): Promise<string> {
  const config = await detectProvider();

  console.log(chalk.gray('  ◇ Building context...'));
  const context = await buildContext(prompt, store);
  const fullPrompt = context + `USER PROMPT:\n${prompt}`;
  const promptTokens = Math.round(fullPrompt.length / 4);

  const providerLabel = config.provider === 'nvidia' ? 'NVIDIA' : config.provider === 'openai' ? 'OpenAI' : config.provider === 'anthropic' ? 'Anthropic' : 'Ollama';
  console.log(chalk.gray(`  ◇ Querying ${providerLabel} (${config.model})...`))
  console.log(chalk.yellow(`  ◇ Free tier may take 30-60 seconds — please wait...`))

  try {
    let response: string;

    switch (config.provider) {
      case "openai": {
        if (!config.apiKey)
          throw new Error(
            "Set AI_API_KEY or OPENAI_API_KEY in .env for OpenAI provider"
          );
        response = await askOpenAI(prompt, store, config, fullPrompt);
        break;
      }
      case "nvidia": {
        const nvConfig = {
          ...config,
          baseURL:
            config.baseURL || "https://integrate.api.nvidia.com/v1",
        };
        if (!nvConfig.apiKey)
          throw new Error(
            "Set AI_API_KEY in .env for NVIDIA provider"
          );
        response = await askOpenAI(prompt, store, nvConfig, fullPrompt);
        break;
      }
      case "anthropic": {
        if (!config.apiKey)
          throw new Error(
            "Set AI_API_KEY or ANTHROPIC_API_KEY in .env for Anthropic provider"
          );
        response = await askAnthropic(prompt, store, config, fullPrompt);
        break;
      }
      case "ollama": {
        response = await askOllama(prompt, store, fullPrompt, promptTokens);
        break;
      }
      default: {
        const exhaustive: never = config.provider;
        throw new Error(`Unknown provider: ${exhaustive}`);
      }
    }

    const files = store.getFiles();
    const fullCodebaseSize = files.reduce((sum: number, f: any) => {
      return sum + (f.summary?.length || 0);
    }, 0);
    const savedTokens = Math.round(
      (fullCodebaseSize - fullPrompt.length) / 4
    );
    store.addTask(prompt, response, "done");
    store.addTokenLog("ask", promptTokens, Math.max(0, savedTokens));
    console.log(chalk.gray(`  ◇ Context: ${promptTokens} tokens · ~${savedTokens} saved (${Math.round((savedTokens / (promptTokens + savedTokens)) * 100)}% efficiency)`));

    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`  ✗ ${msg}`));
    throw error;
  }
}
