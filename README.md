# devmind

> Persistent project intelligence layer for AI coding assistants.

devmind remembers what's built in your project, detects duplicate code before you generate it, and injects smart context into every AI prompt — so your AI assistant never builds something twice.

## The Problem

AI coding assistants have no memory of your project between conversations. Every time you ask "build a login form" or "add authentication", the AI starts from scratch — wasting tokens, time, and often rebuilding things that already exist.

## The Solution

devmind sits between you and your AI assistant. It:

- **Scans** your project and stores file summaries + embeddings in a local SQLite database
- **Remembers** every task completed and architectural decision made
- **Detects** when you're about to build something that already exists (via semantic similarity)
- **Injects** context into every AI prompt — what's built, what's related, what patterns to follow

## Prerequisites

- **Node.js** 18 or later
- **Ollama** (for local/AI provider) — [ollama.com](https://ollama.com)
  ```bash
  ollama pull llama3.2
  ```
  Or use a cloud provider: OpenAI, Anthropic, or NVIDIA (free tier available).

## Installation

```bash
npm install -g devmind
```

## Quick Start

```bash
# 1. Initialize devmind in your project
cd my-project
devmind init

# 2. Scan your codebase
devmind scan

# 3. Ask a question with full project context
devmind ask "Explain the architecture of this project"

# 4. Check if something already exists before building
devmind check "authentication middleware"

# 5. See what devmind knows about your project
devmind status
```

## Commands

| Command | Description |
|---|---|
| `devmind init` | Initialize devmind memory in the current project |
| `devmind scan` | Scan all project files, generate embeddings, store in memory |
| `devmind status` | Show scanned files, completed tasks, duplicates, token savings |
| `devmind ask <prompt>` | Ask AI with full project context injected |
| `devmind check <prompt>` | Check if a feature already exists via semantic search |
| `devmind duplicates` | Find duplicate code across your project |
| `devmind history` | Show past prompts and AI responses |

### Examples

```bash
# Initialize
devmind init

# Scan (re-scans and replaces old data)
devmind scan

# Check before building
devmind check "user authentication system"

# Ask a question
devmind ask "What patterns do we use for error handling?"

# View history
devmind history

# Find duplicates
devmind duplicates
```

## Environment Variables

Create a `.env` file in your project root:

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `ollama` | AI provider: `ollama`, `openai`, `anthropic`, `nvidia` |
| `AI_MODEL` | `llama3.2` | Model name for the chosen provider |
| `AI_API_KEY` | — | API key for cloud providers (OpenAI, Anthropic, NVIDIA) |
| `AI_BASE_URL` | — | Custom API endpoint (e.g., NVIDIA: `https://integrate.api.nvidia.com/v1`) |
| `AI_TIMEOUT` | `300000` | Request timeout in milliseconds (default: 5 min) |
| `ANTHROPIC_API_KEY` | — | Fallback Anthropic API key |
| `OPENAI_API_KEY` | — | Fallback OpenAI API key |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |

## Supported AI Providers

| Provider | Default Model | Free Tier |
|---|---|---|
| **Ollama** (local) | `llama3.2` | Yes — fully local |
| **NVIDIA** | `meta/llama-3.1-8b-instruct` | Yes — free API key |
| **OpenAI** | `gpt-4o` | No — requires billing |
| **Anthropic** | `claude-sonnet-4-20250514` | No — requires billing |

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  devmind    │────▶│  File       │────▶│  SQLite     │
│  scan       │     │  Scanner    │     │  Memory DB  │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
┌─────────────┐     ┌──────────────┐          │
│  devmind    │────▶│  Context    │◀─────────┘
│  ask        │     │  Builder    │
└─────────────┘     └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  AI Provider │
                    │  (Ollama /   │
                    │   OpenAI /   │
                    │   Anthropic  │
                    │   / NVIDIA)  │
                    └──────────────┘
```

1. **`devmind scan`** recursively walks your project, reads file contents, detects language, generates vector embeddings, and stores everything in a local SQLite database (`.devmind/memory.db`).

2. **`devmind ask`** builds a context block from memory — listing built files, related files (via embedding similarity), completed tasks, and architectural decisions — then sends it alongside your prompt to the configured AI provider.

3. **`devmind check`** compares your prompt against all file embeddings using cosine similarity, returning files that match above a configurable threshold.

4. **`devmind duplicates`** compares every file embedding against every other file, flagging pairs with similarity above 85%.

5. **Token tracking** records prompt tokens and estimated savings — showing you how much context you're saving versus sending the full codebase.

## Tech Stack

- **TypeScript** — Full type safety
- **SQLite** (via `better-sqlite3`) — Local persistent memory
- **Transformers.js** (via `@xenova/transformers`) — Local embeddings
- **Commander.js** — CLI framework
- **Chalk** — Terminal styling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `npm run build` to verify compilation
4. Submit a pull request

## License

MIT © [PRAVIN SK](LICENSE)
