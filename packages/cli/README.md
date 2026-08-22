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
scavi check --color
scavi check --no-color
scavi fix
```

Colors are enabled automatically in compatible interactive terminals. Use `--color` for recordings or `--no-color` for plain text. JSON output never contains ANSI styling, and the `NO_COLOR` environment variable is respected.

Deterministic checks are local and require no API key. Optional semantic verification supports OpenAI and local Ollama providers and is disabled by default.

Documentation and source: https://github.com/hsr88/scavi
