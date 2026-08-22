# Scavi

The context linter for AI coding agents.

Scavi checks whether repository instructions such as `AGENTS.md`, `CLAUDE.md`, Copilot instructions, and Cursor rules still match the codebase.

Run it directly in the repository you want to check:

```bash
cd path/to/your-repository
npx scavi-cli check
```

Or install it globally:

```bash
npm install --global scavi-cli
cd path/to/your-repository
scavi check
```

If the current directory has no supported context files, Scavi reports `None found`. You can also provide a repository path explicitly:

```bash
scavi check ./my-project
```

Available commands:

```bash
scavi init
scavi check
scavi check --format json
scavi fix
```

Deterministic checks are local and require no API key. Optional semantic verification supports OpenAI and local Ollama providers and is disabled by default.

Documentation and source: https://github.com/hsr88/scavi
