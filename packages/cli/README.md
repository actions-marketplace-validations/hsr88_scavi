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

## Optional semantic verification

Enable semantic checks in `scavi.config.ts` when a claim cannot be resolved through deterministic repository facts:

```ts
export default {
  context: ["AGENTS.md", "CLAUDE.md"],
  checks: {
    semantic: true,
    semanticConfidence: 0.6,
  },
  ai: {
    provider: "openai",
    model: "gpt-5-mini",
  },
};
```

Set `OPENAI_API_KEY` in your environment and run:

```bash
scavi check
```

Scavi indexes supported text files locally and sends only one claim plus its highest-ranked evidence chunks to the provider. It never sends the full repository. If no evidence is found, or the provider result is below `semanticConfidence`, the verdict is `uncertain` and no semantic warning is created.

Example:

```text
Claim:    Configuration is persisted in JSON files.
Evidence: src/storage.ts:1-8 uses settings.sqlite
Verdict:  stale (92%)
```

Semantic warnings do not fail CI by default. For fully local verification, configure `provider: "ollama"` and a local model instead.

Documentation and source: https://github.com/hsr88/scavi
