# Scavi — Agent Instructions

Scavi is an open-source context linter for AI coding agents.

> **The context linter for AI coding agents.**
> *Keep your agents in sync with your code.*

These instructions apply to AI coding agents working inside the Scavi repository.

---

## Core principle

> **Scavi should never use an LLM when the repository can provide a deterministic answer.**

This is the most important architectural rule in the project.

Before introducing an LLM call, ask:

1. Can this be determined from the filesystem?
2. Can this be determined from a manifest or configuration file?
3. Can this be determined from Git metadata?
4. Can this be determined through static parsing?
5. Can this be determined through deterministic repository search?

If the answer to any of these is yes, do not use an LLM.

Examples of deterministic checks:

* whether a referenced path exists
* whether a package script exists
* which package manager the repository uses
* whether a dependency is installed
* what version is declared in a manifest
* whether a referenced file exists
* whether two context files give conflicting package-manager instructions

LLMs are reserved for claims that require semantic interpretation.

---

## Product behavior

Scavi validates instructions intended for AI coding agents against the actual repository.

Initial context formats include:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
.github/copilot-instructions.md
.cursor/rules/*.mdc
```

Scavi should detect:

* stale instructions
* invalid paths
* invalid commands
* outdated dependency/version claims
* package-manager mismatches
* missing referenced files
* conflicting instructions across context files
* semantic claims that no longer match implementation

---

## Engineering priorities

When making implementation decisions, prioritize in this order:

1. correctness
2. low false-positive rate
3. explainability
4. deterministic behavior
5. privacy
6. performance
7. extensibility

A context linter that produces noisy warnings will be disabled.

Prefer fewer high-confidence findings over many speculative findings.

---

## AI behavior

Semantic analysis must be conservative.

Allowed semantic verdicts should remain equivalent to:

```text
consistent
stale
uncertain
```

`uncertain` is a valid and desirable result when repository evidence is insufficient.

Do not force binary conclusions.

Every semantic finding must include repository evidence.

Bad:

```text
This instruction appears outdated.
```

Good:

```text
This instruction appears outdated.

Evidence:
  src/storage/sqlite.ts
  src/config/repository.ts
```

Do not report AI-generated conclusions without showing supporting evidence.

---

## Fix philosophy

Scavi should generate minimal fixes.

Prefer:

```diff
- Frontend is located in /frontend.
+ Frontend is located in /apps/web.
```

Do not rewrite an entire context file just to repair one stale instruction.

AI-generated fixes must be clearly identified as AI-generated.

Scavi must not silently modify files.

Interactive fixes should show the diff before application.

---

## Security

Treat analyzed repositories as untrusted input.

Never:

* execute arbitrary commands extracted from documentation
* run package scripts merely to validate that they exist
* trust paths without normalization
* follow unsafe paths outside the repository root
* expose API keys or secrets in logs
* assume Markdown content is safe
* execute code retrieved from context files

Symlinks and path traversal require careful handling.

---

## Privacy

Deterministic repository analysis should remain local.

Remote LLM providers may receive only the minimum retrieved evidence necessary for a semantic check.

Do not send the entire repository to an LLM.

AI features must remain optional.

Scavi must still provide useful deterministic checks without:

* an API key
* an LLM
* embeddings
* a remote vector database

---

## Architecture

Scavi is intended to use a TypeScript monorepo.

Target package structure:

```text
packages/
  cli/
  core/
  parser/
  rules/
  retrieval/
  ai/
  github-action/
```

Responsibilities:

### `core`

Orchestration, configuration, repository loading, issue collection, domain models.

### `parser`

Context-file parsing and claim extraction.

### `rules`

Deterministic validation rules.

Deterministic rules must not depend on the AI package.

### `retrieval`

Repository indexing, search, evidence retrieval and later RAG components.

### `ai`

Semantic verification, provider abstraction and AI-generated fixes.

### `cli`

Commands such as:

```text
scavi init
scavi check
scavi fix
```

### `github-action`

GitHub Actions integration using the same core analysis engine.

Do not duplicate rule logic inside the Action.

---

## Rule design

Rules should be independently testable.

A rule should consume repository/context information and return structured issues.

Keep rules small and focused.

Examples:

```text
valid-path
valid-command
package-manager
dependency-version
referenced-file
context-conflict
```

Do not couple deterministic rules to:

* terminal rendering
* GitHub
* OpenAI
* embeddings
* RAG
* provider-specific APIs

---

## Issue quality

Each issue should answer:

1. What is wrong?
2. Where is it?
3. What repository evidence proves it?
4. How severe is it?
5. Can Scavi suggest a safe fix?

Prefer precise rule IDs and structured output.

Example:

```text
STALE_PATH

AGENTS.md:24

Referenced:
  /frontend

Repository evidence:
  /frontend does not exist
  /apps/web exists
```

---

## GitHub Actions

Scavi should be CI-native.

For pull requests, prefer diff-aware analysis:

```text
git diff
  ↓
changed paths
  ↓
potentially affected context
  ↓
checks
  ↓
report
```

Avoid rescanning unrelated parts of large repositories when unnecessary.

Semantic warnings should not fail CI by default unless configured to do so.

Deterministic errors may fail CI.

---

## Testing

False positives are one of the biggest risks to the project.

Every new deterministic rule should have:

* positive tests
* negative tests
* edge cases
* fixture repository coverage where appropriate

Use realistic fixture repositories.

Example:

```text
fixtures/stale-path/

AGENTS.md:
  Frontend lives in /frontend.

apps/web/
```

Expected result:

```text
STALE_PATH
```

Also test cases where Scavi must produce no issue.

---

## Performance

Do not introduce expensive AI or indexing work into deterministic checks.

A normal deterministic scan should feel like a linter.

Cache expensive semantic artifacts where appropriate.

Do not optimize prematurely at the cost of correctness.

---

## Dependencies

Prefer small, well-maintained dependencies.

Avoid adding a dependency when a straightforward standard-library solution is sufficient.

For security-sensitive behavior such as filesystem traversal, parsing paths, process handling, or Git operations, favor mature libraries and explicit validation.

---

## Code changes

When implementing a feature:

1. read the relevant section of `SPEC.md`
2. inspect existing architecture before adding abstractions
3. implement the smallest coherent change
4. add or update tests
5. run relevant checks
6. update documentation if behavior changed

Do not implement speculative architecture that is not required by the current milestone.

---

## Current implementation order

Follow the milestones in `SPEC.md`.

Priority:

1. CLI foundation
2. context discovery
3. path validation
4. command/script validation
5. package-manager validation
6. basic cross-context conflicts
7. structured output and exit codes
8. semantic retrieval
9. LLM verification
10. `scavi fix`
11. GitHub Action

Do not start with RAG.

Do not start with a web dashboard.

Do not introduce an LLM before deterministic Scavi is already useful.

---

## Dogfooding

Scavi should eventually check its own repository.

This file is intentionally part of that process.

Changes to project architecture, commands, package manager, file layout, or development workflow should update this file when relevant.

The goal is for Scavi to detect when its own agent instructions become stale.

---

## Documentation

`SPEC.md` is the primary design specification.

`README.md` describes Scavi to users.

`AGENTS.md` describes how coding agents should work within the repository.

If implementation behavior conflicts with `SPEC.md`, do not silently choose one.

Identify the mismatch and update either implementation or specification deliberately.

---

## Brand

Project name:

**Scavi**

Tagline:

> **The context linter for AI coding agents.**

Supporting line:

> *Keep your agents in sync with your code.*

Mascot:

**Numbat**

Avoid turning mascot language into excessive CLI noise. Scavi should remain a professional developer tool.

A small amount of personality is fine:

```text
🐾 Scavi is digging...
```

but diagnostics should stay clear and technical.
