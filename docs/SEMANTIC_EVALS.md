# Semantic evaluation

Scavi includes 14 evidence-retrieval cases covering storage, authentication, frontend and backend architecture, queues, environment configuration, databases, logging, tests, uploads, and deliberately uncertain claims.

Each case defines:

- a repository-context claim
- an expected semantic verdict: `consistent`, `stale`, or `uncertain`
- the expected top repository evidence file when evidence should exist

## Retrieval-only evaluation

This evaluation is local, deterministic, and free:

```bash
pnpm eval:semantic
```

Current baseline:

```text
Retrieval: 14/14 (100%)
```

## OpenAI

```bash
OPENAI_API_KEY=... pnpm eval:semantic:openai
```

The default model is `gpt-5-mini`. The runner reports retrieval accuracy, semantic verdict accuracy, confidence, top evidence, and token usage.

## Ollama

Set a local model explicitly, then run:

```bash
SCAVI_AI_MODEL=your-local-model pnpm eval:semantic:ollama
```

Use the same cases for both providers. Do not compare models using different evidence sets or thresholds.

The evaluation runner exits with code `1` when retrieval or semantic verdicts miss the expected result, making it suitable for controlled regression checks. Live provider evaluations are intentionally separate from the default test suite because they cost money or require a local model.
