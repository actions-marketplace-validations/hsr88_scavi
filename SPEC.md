# Scavi v0.1 — Technical Specification

> **The context linter for AI coding agents.**
> *Keep your agents in sync with your code.*

Scavi is an open-source developer tool that validates AI coding context against the actual state of a repository.

Its job is to detect stale, conflicting, invalid, or misleading instructions across files such as:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
.github/copilot-instructions.md
.cursor/rules/*.mdc
```

Scavi should behave like a linter: fast, explainable, CI-friendly, conservative, and evidence-based.

---

# 1. Core principle

> **Scavi should never use an LLM when the repository can provide a deterministic answer.**

Examples:

A path can be checked against the filesystem.

A package script can be checked against `package.json`.

The package manager can often be inferred from lockfiles and `packageManager`.

A dependency version can be checked against manifests.

These checks must not invoke an LLM.

LLMs are reserved for claims that require semantic interpretation of code or architecture.

---

# 2. Goals for v0.1

Scavi v0.1 should provide a genuinely usable developer workflow through:

* CLI
* GitHub Actions
* deterministic repository checks
* cross-context conflict detection
* optional semantic verification
* repository retrieval / RAG
* minimal suggested fixes
* clear terminal output
* CI-compatible exit codes

The first public release should already be useful without enabling AI features.

---

# 3. Non-goals for v0.1

Scavi v0.1 will not attempt to:

* rewrite entire context files automatically
* act as an autonomous coding agent
* modify application source code
* replace project documentation
* maintain a hosted SaaS dashboard
* provide organization-wide analytics
* support every LLM provider
* understand every programming language equally well
* guarantee that every semantic claim is correct

Scavi should prefer:

```text
uncertain
```

over producing an unsupported conclusion.

---

# 4. CLI

Initial CLI commands:

```bash
scavi init
scavi check
scavi fix
```

Running without global installation should also work:

```bash
npx scavi check
```

---

## 4.1 `scavi init`

Purpose:

Initialize Scavi inside an existing repository.

Responsibilities:

1. Detect repository root.
2. Detect supported AI context files.
3. Detect project ecosystem.
4. Detect likely package manager.
5. Create a Scavi configuration file.
6. Optionally create a GitHub Actions workflow.
7. Print a summary.

Example:

```text
🐾 Scavi initialization

Repository:
  /home/user/project

Detected context:
  ✓ AGENTS.md
  ✓ CLAUDE.md
  ✓ .cursor/rules/project.mdc

Environment:
  Node.js
  TypeScript
  pnpm

Created:
  scavi.config.ts

Run:

  scavi check
```

`init` must not overwrite an existing configuration without confirmation.

---

## 4.2 `scavi check`

Purpose:

Analyze AI coding context against repository evidence.

Basic flow:

```text
discover context
      ↓
parse instructions
      ↓
extract verifiable claims
      ↓
deterministic checks
      ↓
cross-file checks
      ↓
semantic candidates
      ↓
retrieval / RAG
      ↓
LLM verification
      ↓
report
```

Example output:

```text
🐾 Scavi is digging through your repo...

Context files:
  ✓ AGENTS.md
  ✓ CLAUDE.md

Repository checks:

✗ AGENTS.md:24
  STALE_PATH

  "Frontend is located in /frontend"

  Path does not exist.

  Possible match:
  /apps/web


✗ CLAUDE.md:41
  INVALID_COMMAND

  "Run npm run integration"

  Script "integration" was not found in package.json.


⚠ AGENTS.md ↔ CLAUDE.md
  PACKAGE_MANAGER_CONFLICT

  AGENTS.md:
    Use pnpm.

  CLAUDE.md:
    Use npm.

  Repository evidence:
    pnpm-lock.yaml
    packageManager: pnpm@10.x


Summary:

  2 errors
  1 warning
  3 issues

AI Context Health: 76/100

Scavi exited with code 1.
```

---

## 4.3 `scavi fix`

Purpose:

Generate minimal changes for problems that Scavi can resolve with sufficient confidence.

Scavi must never silently apply changes.

Example:

```text
🐾 Scavi prepared a fix:

AGENTS.md:24

- Frontend is located in /frontend.
+ Frontend is located in /apps/web.

Evidence:
  /apps/web exists
  /frontend does not exist

Apply fix? [y/N]
```

For semantic fixes:

```text
⚠ AI-generated suggestion

Evidence confidence: 91%

Review carefully before applying.
```

Requirements:

* show diff before modification
* request confirmation by default
* preserve formatting where possible
* prefer changing the smallest possible span
* never rewrite an entire context file unless explicitly requested

Potential future flag:

```bash
scavi fix --yes
```

This does not need to be included in the first implementation.

---

# 5. Supported context files

Required for v0.1:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
.github/copilot-instructions.md
.cursor/rules/*.mdc
```

Scavi should also support custom context paths through configuration.

Example:

```ts
context: [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/**/*.mdc",
  "docs/ai-context.md"
]
```

---

# 6. Repository discovery

Scavi must determine the repository root before analysis.

Detection order:

1. explicit CLI path
2. nearest `.git` directory
3. current working directory

Example:

```bash
scavi check ./my-project
```

Internal representation:

```ts
interface Repository {
  root: string
  gitRoot?: string
  ecosystem: Ecosystem[]
  packageManagers: PackageManager[]
}
```

---

# 7. Context parsing

Scavi must convert context files into structured claims.

Example source:

```md
## Frontend

The frontend lives in `/frontend`.

Run `npm test` before committing.

We use React 18.

Configuration is persisted in JSON files.
```

Possible extracted claims:

```ts
[
  {
    type: "path",
    value: "/frontend",
    source: "AGENTS.md",
    line: 3
  },
  {
    type: "command",
    value: "npm test",
    source: "AGENTS.md",
    line: 5
  },
  {
    type: "dependency-version",
    package: "react",
    version: "18",
    source: "AGENTS.md",
    line: 7
  },
  {
    type: "semantic",
    text: "Configuration is persisted in JSON files.",
    source: "AGENTS.md",
    line: 9
  }
]
```

Important:

The parser does not need to fully understand natural language.

It should identify obvious deterministic candidates first and leave ambiguous claims for semantic analysis.

---

# 8. Deterministic checks

These are the highest-priority checks in Scavi.

They must run locally and without AI.

---

## 8.1 Path validation

Detect references to:

```text
src/auth
/apps/web
./scripts/build.ts
config/example.json
```

Checks:

* file exists
* directory exists
* case mismatch
* likely renamed/moved path

Example issue:

```text
STALE_PATH

Referenced:
  /frontend

Not found.

Possible matches:
  /apps/web
  /src/frontend-old
```

Potential similarity techniques:

* basename similarity
* Levenshtein distance
* repository tree similarity
* Git rename history later

---

## 8.2 Command validation

Detect commands in inline code and code blocks.

Example:

```md
Run `npm run test:e2e`.
```

Check against:

* `package.json`
* Makefile
* Taskfile
* Cargo scripts where applicable
* repository scripts directories
* known package-manager semantics

Example:

```text
INVALID_COMMAND

npm run test:e2e

package.json does not define:
  test:e2e
```

---

## 8.3 Package manager validation

Sources of truth:

```text
packageManager
pnpm-lock.yaml
yarn.lock
package-lock.json
bun.lock
bun.lockb
```

Possible conflict:

```text
CLAUDE.md:
  Use npm.

Repository:
  pnpm-lock.yaml
  packageManager: pnpm@10.1.0
```

Report:

```text
PACKAGE_MANAGER_MISMATCH
```

---

## 8.4 Dependency validation

Detect claims about dependencies:

```text
We use React 18.
Built with Vite 5.
Requires Node 20.
```

Sources:

```text
package.json
Cargo.toml
pyproject.toml
requirements.txt
go.mod
```

Initial implementation may focus on Node.js repositories.

---

## 8.5 Script validation

Check referenced scripts:

```text
npm run build
pnpm lint
npm run dev
```

against:

```json
{
  "scripts": {}
}
```

---

## 8.6 Referenced file validation

Example:

```md
Copy `.env.example` to `.env`.
```

If `.env.example` does not exist:

```text
MISSING_REFERENCED_FILE
```

---

# 9. Cross-context conflict detection

Scavi must detect when different context files give incompatible instructions.

Example:

```text
AGENTS.md
  Use pnpm.

CLAUDE.md
  Use npm.

.cursor/rules/project.mdc
  Use yarn.
```

Result:

```text
CONTEXT_CONFLICT

3 incompatible package manager instructions detected.

Repository evidence suggests:
  pnpm
```

Initial conflict categories:

* package manager
* test command
* build command
* source directory
* frontend directory
* backend directory
* package versions
* runtime version

Semantic contradiction detection can be added later within the AI layer.

---

# 10. Semantic checks

Semantic checks are used only when deterministic validation cannot resolve a claim.

Example:

```md
User configuration is persisted in JSON files.
```

The repository may instead contain:

```text
src/database/settings.ts
src/storage/sqlite.ts
```

There is no simple deterministic proof from a single manifest.

This becomes a semantic candidate.

---

# 11. Semantic verification pipeline

Required pipeline:

```text
claim
 ↓
query generation
 ↓
repository retrieval
 ↓
candidate evidence
 ↓
reranking
 ↓
LLM verification
 ↓
verdict
```

Allowed verdicts:

```ts
type Verdict =
  | "consistent"
  | "stale"
  | "uncertain"
```

Example output:

```text
POSSIBLY_STALE

Claim:
  "Configuration is stored in config.json."

Verdict:
  stale

Confidence:
  0.91

Evidence:
  src/storage/settings.ts
  src/database/schema.ts

Reason:
  Current implementation persists settings through SQLite.
```

---

# 12. Retrieval / RAG

Scavi should not send the entire repository to an LLM.

Instead, it retrieves only relevant evidence.

Pipeline:

```text
repository
 ↓
file filtering
 ↓
code/document chunking
 ↓
index
 ↓
claim
 ↓
retrieval
 ↓
top relevant chunks
 ↓
LLM
```

---

## 12.1 Initial retrieval strategy

v0.1 should prioritize simplicity.

Possible first implementation:

1. keyword search
2. symbol/path matching
3. lightweight lexical ranking
4. optional embeddings

Do not introduce a remote vector database unless clearly necessary.

A local index is preferable.

Possible future options:

```text
SQLite
LanceDB
local vector index
```

The first semantic implementation may combine lexical retrieval with embeddings.

---

# 13. Evidence requirements

Every semantic warning must contain repository evidence.

Bad:

```text
This instruction appears outdated.
```

Good:

```text
This instruction appears outdated.

Evidence:
  src/storage/sqlite.ts:18
  src/config/store.ts:41
```

Scavi must not report semantic conclusions without showing why.

---

# 14. Confidence

Semantic findings require confidence.

Suggested internal scale:

```text
0.00 – 0.59 → uncertain
0.60 – 0.79 → warning
0.80 – 1.00 → strong warning
```

Thresholds must remain configurable.

Scavi should not fail CI by default for low-confidence semantic findings.

---

# 15. Configuration

Preferred initial format:

```text
scavi.config.ts
```

Reasoning:

* native fit for a TypeScript tool
* comments supported
* typed configuration
* future extensibility
* easier conditional configuration

Example:

```ts
import { defineConfig } from "scavi"

export default defineConfig({
  context: [
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
    ".github/copilot-instructions.md",
    ".cursor/rules/**/*.mdc"
  ],

  checks: {
    paths: true,
    commands: true,
    dependencies: true,
    conflicts: true,
    semantic: true
  },

  ai: {
    enabled: false,
    provider: "openai",
    model: "default"
  }
})
```

AI should be disabled unless configured.

Running deterministic Scavi must never require an API key.

---

# 16. AI providers

v0.1 should not attempt broad provider support.

Recommended initial support:

```text
OpenAI-compatible API
Ollama
```

Using an OpenAI-compatible interface allows later support for multiple providers without coupling core logic to one vendor.

Environment variable:

```text
OPENAI_API_KEY
```

For local mode:

```text
SCAVI_AI_PROVIDER=ollama
```

Exact API details can be finalized during implementation.

---

# 17. Privacy

Scavi must clearly separate local and external analysis.

Deterministic analysis:

```text
100% local
```

Semantic analysis with remote LLM:

```text
only retrieved evidence is transmitted
```

Scavi should tell the user when external AI is being used.

Example:

```text
AI semantic analysis enabled.

Provider:
  OpenAI

Repository content may be sent to this provider.

Continue? [y/N]
```

Interactive confirmation may later be disabled through configuration for CI.

---

# 18. GitHub Action

GitHub Actions support is required for v0.1.

Main workflow:

```text
pull request
 ↓
checkout
 ↓
Scavi
 ↓
git diff
 ↓
affected context analysis
 ↓
report
```

Example workflow:

```yaml
name: Scavi

on:
  pull_request:

jobs:
  scavi:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: scavi/scavi-action@v0
```

Exact repository naming can be decided later.

---

# 19. PR-aware analysis

For Pull Requests, Scavi should prefer targeted analysis.

Instead of:

```text
scan everything every time
```

use:

```text
git diff
 ↓
changed paths
 ↓
related context
 ↓
affected claims
 ↓
checks
```

Full scan must remain available.

Possible commands:

```bash
scavi check

scavi check --diff origin/main
```

GitHub Action can use diff mode automatically.

---

# 20. GitHub PR report

Example:

```text
## 🐾 Scavi Context Check

**2 potential context issues found**

### 🔴 AGENTS.md

`AGENTS.md:42`

The repository instruction says:

> Authentication code lives in `/lib/auth`.

This PR moved authentication to:

`/services/auth`

**Suggested fix available.**

---

### 🟡 CLAUDE.md

`CLAUDE.md:18`

This architecture description may have been affected by the PR.

Confidence: **82%**

Evidence:

- `src/services/auth.ts`
- `src/app/router.ts`

---

**AI Context Health:** 84/100
```

---

# 21. Exit codes

Suggested contract:

```text
0  no blocking issues
1  deterministic errors found
2  configuration/runtime error
3  reserved
```

Semantic warnings should not produce exit code `1` by default.

Configuration may later allow:

```ts
failOn: {
  deterministic: true,
  semanticConfidence: 0.9
}
```

---

# 22. Severity levels

Initial levels:

```text
info
warning
error
```

Examples:

```text
missing context file
→ info

possible semantic drift
→ warning

nonexistent path explicitly referenced
→ error
```

---

# 23. Issue model

Internal issue interface:

```ts
interface ScaviIssue {
  id: string
  rule: string

  severity:
    | "info"
    | "warning"
    | "error"

  source: {
    file: string
    line?: number
    column?: number
  }

  message: string

  claim?: string

  evidence?: Evidence[]

  confidence?: number

  fix?: ScaviFix
}
```

---

# 24. Fix model

```ts
interface ScaviFix {
  description: string

  edits: {
    file: string
    start: number
    end: number
    replacement: string
  }[]

  generatedBy:
    | "deterministic"
    | "ai"

  confidence?: number
}
```

---

# 25. Output formats

Terminal output is required.

Also plan for:

```bash
scavi check --format json
```

JSON enables:

* GitHub Action integration
* third-party tooling
* testing
* future editor integrations

Possible future formats:

```text
sarif
markdown
```

SARIF would allow GitHub code scanning integration later.

---

# 26. Suggested repository architecture

Scavi should start as a TypeScript monorepo.

Recommended:

```text
scavi/
├── packages/
│   ├── cli/
│   ├── core/
│   ├── rules/
│   ├── parser/
│   ├── retrieval/
│   ├── ai/
│   └── github-action/
│
├── fixtures/
│   ├── clean-repo/
│   ├── stale-path/
│   ├── command-conflict/
│   └── semantic-drift/
│
├── tests/
├── AGENTS.md
├── README.md
├── SPEC.md
├── package.json
└── pnpm-workspace.yaml
```

Recommended package manager:

```text
pnpm
```

---

# 27. Responsibilities by package

## `@scavi/core`

Orchestration and domain models.

Responsibilities:

* repository loading
* check orchestration
* issue collection
* configuration
* exit status

---

## `@scavi/parser`

Extract claims and references from context files.

Responsibilities:

* Markdown
* MDC
* code blocks
* inline code
* path candidates
* command candidates
* package/dependency candidates

---

## `@scavi/rules`

Deterministic checks.

Initial rules:

```text
valid-path
valid-command
package-manager
dependency-version
referenced-file
context-conflict
```

---

## `@scavi/retrieval`

Repository search and evidence retrieval.

Responsibilities:

* indexing
* chunking
* lexical search
* embeddings later
* reranking

---

## `@scavi/ai`

Semantic verification.

Must not be imported by deterministic rules.

Responsibilities:

* provider interface
* semantic verdicts
* confidence
* AI fixes
* prompts

---

## `@scavi/cli`

User-facing commands.

Responsibilities:

```text
init
check
fix
```

---

## `@scavi/github-action`

GitHub Actions adapter.

Uses Scavi core rather than duplicating analysis logic.

---

# 28. Rule API

Rules should be independently testable.

Example:

```ts
interface Rule {
  id: string

  run(context: RuleContext):
    Promise<ScaviIssue[]>
}
```

Example implementation:

```text
valid-path
```

must not know anything about OpenAI, RAG, GitHub, or terminal rendering.

---

# 29. Testing strategy

Scavi needs strong automated tests because false positives will destroy trust.

Required:

* unit tests
* fixture repositories
* integration tests
* CLI snapshots where useful

Example fixture:

```text
fixtures/stale-path/

AGENTS.md:
  Frontend lives in /frontend.

repository:
  /apps/web/
```

Expected:

```text
STALE_PATH
```

---

# 30. False-positive philosophy

A context linter that constantly complains will be disabled.

Therefore:

> **Precision is more important than issue count.**

Scavi should report fewer, high-quality findings rather than generate speculative noise.

Deterministic findings can be strict.

Semantic findings must be conservative.

---

# 31. Context Health score

v0.1 may expose a basic score, but the score must never become more important than concrete findings.

Possible initial model:

```text
100 starting score

-15 deterministic error
-8 strong semantic warning
-5 conflict
-2 weak warning
```

This should remain experimental.

A repository with no context files should not receive a fake `100/100`.

---

# 32. Performance expectations

Deterministic scan target:

```text
small repository:
< 1 second

medium repository:
a few seconds
```

Semantic mode can be slower.

Scavi should cache:

* repository index
* embeddings
* semantic verdicts when inputs haven't changed

Potential cache:

```text
.scavi/cache/
```

This directory should be gitignored.

---

# 33. Logging

Default output should stay concise.

Optional:

```bash
scavi check --verbose
```

Verbose mode may show:

* discovered files
* parser decisions
* retrieval queries
* evidence ranking
* provider calls
* cache hits

Secrets must never be printed.

---

# 34. Security

Scavi analyzes potentially hostile repositories.

Important constraints:

* never execute arbitrary commands extracted from context
* do not run package scripts merely to check whether they exist
* treat Markdown content as untrusted
* sanitize filesystem paths
* prevent traversal outside repository root unless explicitly allowed
* never expose API keys
* avoid following unsafe symlinks outside repository boundaries

---

# 35. Git behavior

Scavi should be able to use Git metadata for:

* repository root
* changed files
* rename detection
* diff analysis

Later versions may use history for:

* determining when an instruction became stale
* detecting removed paths
* historical context reconstruction

Historical analysis is not required for the first milestone.

---

# 36. Self-dogfooding

The Scavi repository should use Scavi.

Required:

```text
AGENTS.md
```

Optionally:

```text
CLAUDE.md
```

Once the CLI is usable:

```bash
pnpm scavi check
```

should run against Scavi itself.

GitHub Actions should eventually enforce the same checks on Scavi PRs.

---

# 37. First implementation milestone

Do not start with RAG.

The first successful milestone is:

```bash
pnpm build
node packages/cli/dist/index.js check
```

producing:

```text
🐾 Scavi is digging...

Found context:
  ✓ AGENTS.md
  ✓ CLAUDE.md

Checking repository facts...

✗ AGENTS.md:24
  Referenced path does not exist:
  /src/frontend

✗ CLAUDE.md:17
  Unknown package script:
  npm run integration

⚠ Context conflict:
  AGENTS.md says pnpm
  CLAUDE.md says npm

3 issues found.

Scavi exited with code 1.
```

No:

* LLM
* API key
* vector database
* embeddings

This milestone proves the product is useful before the AI layer exists.

---

# 38. Second implementation milestone

Add semantic analysis.

Goal:

```text
AGENTS.md:

"Configuration is stored in config.json."
```

Scavi:

1. classifies the sentence as semantic
2. searches repository
3. retrieves relevant evidence
4. asks the LLM only about that claim
5. returns:

```text
⚠ POSSIBLY_STALE

Claim:
  Configuration is stored in config.json.

Evidence:
  src/storage/sqlite.ts
  src/config/repository.ts

Verdict:
  stale

Confidence:
  92%
```

---

# 39. Third implementation milestone

Add:

```text
scavi fix
```

Requirements:

* deterministic fixes first
* semantic fixes second
* minimal patch generation
* interactive approval

---

# 40. Fourth implementation milestone

Add GitHub Action.

Target:

```text
Pull Request
      ↓
Scavi diff-aware scan
      ↓
PR report
      ↓
required status check
```

At this point Scavi v0.1 can be prepared for public release.

---

# 41. v0.1 definition of done

Scavi v0.1 is ready when:

* [ ] `scavi init` works
* [ ] `scavi check` works
* [ ] `scavi fix` works
* [ ] AGENTS.md is supported
* [ ] CLAUDE.md is supported
* [ ] GEMINI.md is supported
* [ ] Copilot instructions are supported
* [ ] Cursor rules are supported
* [ ] custom files can be configured
* [ ] invalid paths are detected
* [ ] invalid package scripts are detected
* [ ] package-manager mismatches are detected
* [ ] dependency/version mismatches are detected
* [ ] simple context conflicts are detected
* [ ] semantic claims can be retrieved and verified
* [ ] findings include evidence
* [ ] semantic findings include confidence
* [ ] deterministic mode works with zero API keys
* [ ] AI mode supports at least one remote provider
* [ ] local AI mode is possible
* [ ] GitHub Action works on Pull Requests
* [ ] Action posts or exposes a useful report
* [ ] exit codes work in CI
* [ ] JSON output exists
* [ ] fixture-based tests exist
* [ ] README reflects actual functionality
* [ ] Scavi checks its own repository

---

# 42. Product principles

## Deterministic first

Never spend tokens to answer something the repository can answer directly.

## Evidence over guesses

Every finding should explain why it exists.

## Minimal fixes

Fix the wrong instruction, not the whole file.

## Conservative AI

`uncertain` is a valid result.

## Local by default

Repository analysis should remain local wherever possible.

## CI-native

Scavi should feel at home next to:

```text
eslint
prettier
tsc
tests
```

## Agent-agnostic

Scavi validates context regardless of which coding agent consumes it.

---

# 43. Brand

**Scavi**

> **The context linter for AI coding agents.**
> *Keep your agents in sync with your code.*

Mascot:

**Numbat**

The mascot represents Scavi's behavior: carefully searching through a repository for small inconsistencies hidden beneath the surface.

---

# 44. Long-term direction

Potential future capabilities:

```text
scavi check --agents
scavi check --docs
scavi check --all
```

Possible later modules:

* regular documentation drift
* historical context drift
* duplicated instruction detection
* context token optimization
* instruction relevance scoring
* MCP server
* editor integrations
* SARIF output
* GitHub App
* local dashboard
* team policies
* multi-repository context
* eval framework for semantic checks

These must not distract from building a reliable v0.1.

---

# 45. One-sentence product definition

> **Scavi checks whether the instructions given to AI coding agents still match the repository they are supposed to work on.**
