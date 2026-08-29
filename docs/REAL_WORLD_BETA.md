# Real-world beta

Scavi's deterministic checks were run against five real repositories on 2026-08-29. Public repositories were cloned with `--depth 1`; no repository code was executed and semantic providers were disabled.

## Results

| Repository | Revision | Context files | Time | Result |
| --- | --- | ---: | ---: | --- |
| `hsr88/scavi` | local `main` | 1 | 34 ms | clean |
| `hsr88/scavi-site` | local `main` | 0 | 3 ms | clean, no supported context found |
| `openai/codex` | `6478a75` | 1 | 326 ms | 1 error |
| `cloudflare/agents` | `8ffb3ad` | 1 | 224 ms | clean |
| `openai/codex-security` | `7115caa` | 1 | 30 ms | clean |

The remaining `openai/codex` finding is:

```text
MISSING_REFERENCED_FILE
AGENTS.md:35
codex-rs/codex-mcp/src/mcp_connection_manager.rs
```

The referenced file is absent at the tested revision. This is retained as a high-confidence deterministic finding rather than suppressed.

## What the beta changed

The first scan produced 19 findings in `openai/codex` and 6 in `cloudflare/agents`. Inspection showed that most were false positives caused by:

- system executable paths such as `/usr/bin/sandbox-exec`
- RPC examples such as `thread/read`
- paths relative to a workspace package rather than the repository root
- scripts declared in nested workspace `package.json` files
- runtime claims such as `Python 3+` being treated as npm dependencies
- nested test repositories being traversed during dogfooding

Scavi now handles those cases conservatively. The post-fix scan reduced 25 findings to one evidence-backed issue.

## Reproducing

Build Scavi, then run deterministic checks against an explicit checkout:

```bash
pnpm build
node packages/cli/dist/index.js check path/to/repository --format json
```

The cloned beta repositories live under the ignored `work/` directory and are not part of the Scavi repository.
