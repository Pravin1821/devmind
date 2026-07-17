# codepi

> Persistent project intelligence for AI coding assistants — no duplicate code, smart context, token savings.

codepi remembers what's built in your project, detects duplicate code before you generate it, and injects smart context into every AI prompt — so your AI assistant never builds something twice.

## The Problem

AI coding assistants have no memory of your project between conversations. Every time you ask "build a login form" or "add authentication", the AI starts from scratch — wasting tokens, time, and often rebuilding things that already exist.

## The Solution

codepi sits between you and your AI assistant. It:

- **Scans** your project and stores file summaries + embeddings in a local SQLite database
- **Remembers** every task completed and architectural decision made
- **Detects** when you're about to build something that already exists (via semantic similarity)
- **Injects** context into every AI prompt — what's built, what's related, what patterns to follow

## Prerequisites

- **Node.js** 18 or later
- **Ollama** (for local AI provider) — [ollama.com](https://ollama.com)
  ```bash
  ollama pull llama3.2
  ```
  Or use a cloud provider: OpenAI, Anthropic, or NVIDIA (free tier available).

## Installation

```bash
npm install -g codepi
```

## Quick Start

```bash
# 1. Initialize codepi in your project
cd my-project
codepi init

# 2. Scan your codebase
codepi scan

# 3. Ask a question with full project context
codepi ask "Explain the architecture of this project"

# 4. Check if something already exists before building
codepi check "authentication middleware"

# 5. See what codepi knows about your project
codepi status
```

## Commands

| Command | Description |
|---|---|
| `codepi init` | Initialize codepi memory in the current project |
| `codepi scan` | Scan all project files, generate embeddings, store in memory |
| `codepi status` | Show scanned files, completed tasks, duplicates, token savings |
| `codepi ask <prompt>` | Ask AI with full project context injected |
| `codepi check <prompt>` | Check if a feature already exists via semantic search |
| `codepi duplicates` | Find duplicate code across your project |
| `codepi history` | Show past prompts and AI responses |

### Examples

```bash
# Initialize
codepi init

# Scan (re-scans and replaces old data)
codepi scan

# Check before building
codepi check "user authentication system"

# Ask a question
codepi ask "What patterns do we use for error handling?"

# View history
codepi history

# Find duplicates
codepi duplicates
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
│  codepi     │────▶│  File       │────▶│  SQLite     │
│  scan       │     │  Scanner    │     │  Memory DB  │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
┌─────────────┐     ┌──────────────┐          │
│  codepi     │────▶│  Context    │◀─────────┘
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

1. **`codepi scan`** recursively walks your project, reads file contents, detects language, generates vector embeddings, and stores everything in a local SQLite database (`.codepi/memory.db`).

2. **`codepi ask`** builds a context block from memory — listing built files, related files (via embedding similarity), completed tasks, and architectural decisions — then sends it alongside your prompt to the configured AI provider.

3. **`codepi check`** compares your prompt against all file embeddings using cosine similarity, returning files that match above a configurable threshold.

4. **`codepi duplicates`** compares every file embedding against every other file, flagging pairs with similarity above 85%.

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
