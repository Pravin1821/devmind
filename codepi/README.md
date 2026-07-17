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
- **API key** (free) from one of these providers:
  - **NVIDIA** (recommended) — free tier at [build.nvidia.com](https://build.nvidia.com)
  - **Anthropic** — [console.anthropic.com](https://console.anthropic.com)
  - **OpenAI** — [platform.openai.com](https://platform.openai.com)
- **Ollama** (optional) — local AI, no API key needed: [ollama.com](https://ollama.com)

## Installation

```bash
npm install -g @pravin-sk/codepi
```

## Quick Start

### 1. Get a free API key (pick one)

| Provider | Free Tier | Link |
|---|---|---|
| NVIDIA | Yes — generous free tier | [build.nvidia.com](https://build.nvidia.com) |
| Anthropic | Limited free credits | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | Requires billing | [platform.openai.com](https://platform.openai.com) |
| Ollama | Free — runs locally | [ollama.com](https://ollama.com) |

### 2. Add key to your project

Create a `.env` file in your project folder:

```bash
NVIDIA_API_KEY=your_key_here
```

### 3. Start using codepi

```bash
cd my-project
codepi init
codepi scan
codepi ask "Explain the architecture of this project"
codepi check "authentication middleware"
codepi status
```

No Ollama required. Works immediately with any free API key.

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
| `NVIDIA_API_KEY` | — | NVIDIA free API key (recommended) |
| `AI_PROVIDER` | auto-detect | Force provider: `nvidia`, `openai`, `anthropic`, `ollama` |
| `AI_MODEL` | per-provider default | Override model name |
| `AI_API_KEY` | — | Fallback API key for nvidia/openai/anthropic |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `AI_BASE_URL` | — | Custom API endpoint |
| `AI_TIMEOUT` | `300000` | Request timeout in milliseconds (default: 5 min) |
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
