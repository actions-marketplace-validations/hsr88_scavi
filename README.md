# 🦝 Scavi

### The context linter for AI coding agents.

**Keep your agents in sync with your code.**

Scavi is an open-source developer tool that helps keep AI coding instructions accurate as your codebase evolves.

It checks files like `AGENTS.md`, `CLAUDE.md`, Cursor rules, Copilot instructions, and other agent context for **stale information, conflicting rules, invalid paths, outdated commands, and claims that no longer match your codebase**.

Think of it as a linter for the context you give your coding agents.

---

## The problem

AI coding agents are becoming part of everyday development workflows.

To work effectively, they increasingly rely on repository-level instructions such as:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
.github/copilot-instructions.md
.cursor/rules/*.mdc
```

These files tell agents how a project is structured, which commands to use, where components live, which conventions to follow, and how the application behaves.

But code changes constantly.

Agent instructions often don't.

A repository might say:

```md
Frontend lives in /frontend.

Use npm test before submitting changes.

Configuration is stored in config.json.
```

while the actual project has already moved to:

```text
/apps/web
pnpm test
SQLite
```

The instructions still look perfectly valid.

They're just wrong.

And now every AI agent working on the repository starts with bad context.

---

## Meet Scavi

Scavi digs through your repository and checks whether your AI coding context still matches reality.

```bash
npx scavi check
```

Example:

```text
🦝 Scavi is digging through your repo...

AI Context Health: 72/100

✗ AGENTS.md:18
  Outdated path

  "Frontend is located in /frontend"

  /frontend does not exist.
  Probable location: /apps/web


✗ CLAUDE.md:32
  Invalid command

  "Run npm test before committing"

  Repository uses pnpm.


⚠ CONFLICT

  AGENTS.md:18
  "Use pnpm"

  CLAUDE.md:31
  "Use npm"

  Repository evidence:
  pnpm-lock.yaml


⚠ POSSIBLY STALE

  AGENTS.md:51
  "Configuration is stored in config.json"

  Repository evidence suggests configuration
  is currently stored in SQLite.

  Confidence: 91%


3 context issues found.
```

---

## What Scavi checks

### Stale instructions

Scavi detects instructions that no longer match the current codebase.

Examples:

* outdated architecture descriptions
* removed directories
* renamed components
* old configuration mechanisms
* obsolete workflows

### Broken references

Scavi can verify things that don't require an LLM:

* file paths
* directories
* package scripts
* package managers
* dependencies
* configuration files
* commands
* referenced project files

### Conflicting instructions

Different coding agents shouldn't receive different versions of reality.

Scavi can detect contradictions between:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
Cursor rules
Copilot instructions
```

For example:

```text
AGENTS.md
→ Use pnpm.

CLAUDE.md
→ Use npm.

.cursor/rules/project.mdc
→ Use yarn.
```

Scavi uses repository evidence to help determine which instruction is likely correct.

### Semantic drift

Not everything can be verified with simple static checks.

For claims about architecture, application behavior, data flow, or implementation details, Scavi can retrieve relevant code and use an LLM to determine whether the instruction still reflects the current implementation.

This is where Scavi's retrieval and AI layer comes in.

---

## Fix, don't just report

Scavi is designed to help fix context drift, not only complain about it.

```bash
npx scavi fix
```

Scavi will generate minimal suggested changes for detected issues.

You stay in control — proposed changes are reviewed before being applied.

---

## GitHub Actions

Scavi is being designed to run automatically when your code changes.

A pull request that changes application behavior could produce a check like:

```text
🦝 Scavi — AI Context Check

2 potential context issues found.

🔴 AGENTS.md
   Outdated architecture instruction

🟡 .cursor/rules/backend.mdc
   Potentially affected by this PR

This PR moved authentication from:

/lib/auth

to:

/services/auth

AGENTS.md still instructs coding agents
to modify /lib/auth.

Suggested fix available.
```

The goal is simple:

**don't let stale AI context reach `main`.**

---

## Supported context

Planned support includes:

| Context                     | Status     |
| --------------------------- | ---------- |
| `AGENTS.md`                 | 🚧 Planned |
| `CLAUDE.md`                 | 🚧 Planned |
| `GEMINI.md`                 | 🚧 Planned |
| GitHub Copilot instructions | 🚧 Planned |
| Cursor rules                | 🚧 Planned |
| Custom instruction files    | 🚧 Planned |

---

## CLI

Planned commands:

```bash
# Configure Scavi
scavi init

# Check AI coding context
scavi check

# Explain detected problems
scavi check --verbose

# Generate suggested fixes
scavi fix
```

Or without installing globally:

```bash
npx scavi check
```

---

## How it works

Scavi combines deterministic analysis with AI-assisted semantic verification.

```text
                    ┌─────────────────┐
                    │   Repository    │
                    └────────┬────────┘
                             │
                  ┌──────────▼──────────┐
                  │  Context Discovery  │
                  └──────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐           ┌────────▼────────┐
     │ Static Checks   │           │ Semantic Checks │
     │                 │           │                 │
     │ paths           │           │ architecture    │
     │ commands        │           │ behavior        │
     │ dependencies    │           │ implementation  │
     │ scripts         │           │ relationships   │
     └────────┬────────┘           └────────┬────────┘
              │                             │
              │                    ┌────────▼────────┐
              │                    │ Retrieval / RAG │
              │                    └────────┬────────┘
              │                             │
              │                    ┌────────▼────────┐
              │                    │      LLM        │
              │                    └────────┬────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │ Context Report  │
                    └────────┬────────┘
                             │
                       check / fix
```

The important principle is:

> **Don't use an LLM for something that can be verified deterministically.**

A missing directory doesn't need AI.

A claim about how authentication flows through the application probably does.

---

## Why Scavi?

Coding agents are only as reliable as the context they receive.

As repositories evolve, AI instructions can accumulate outdated assumptions, duplicated rules, conflicting guidance, and references to code that no longer exists.

Scavi aims to make AI context a maintainable part of the software development lifecycle — something that can be **checked, reviewed and tested**, just like code.

---

## Roadmap

### v0.1 — Digging begins 🦝

* [ ] CLI foundation
* [ ] Context file discovery
* [ ] `AGENTS.md` support
* [ ] `CLAUDE.md` support
* [ ] Cursor rules support
* [ ] Copilot instructions support
* [ ] Path validation
* [ ] Command and package-manager validation
* [ ] Dependency checks
* [ ] Cross-file contradiction detection
* [ ] Semantic verification
* [ ] Repository retrieval / RAG
* [ ] `scavi check`
* [ ] `scavi fix`
* [ ] GitHub Action
* [ ] PR reports

### Later

* [ ] Additional agent formats
* [ ] Custom context files
* [ ] Context Health score
* [ ] Context size and duplication analysis
* [ ] Historical drift detection
* [ ] MCP integration
* [ ] Local model support
* [ ] Evaluation suite
* [ ] Optional web dashboard

---

## Philosophy

Scavi should be:

**Local-first where possible.**
Repository analysis should stay local unless external AI services are explicitly used.

**Transparent.**
Every warning should explain what Scavi found and why it considers something incorrect.

**Evidence-based.**
AI-generated conclusions should point back to repository evidence.

**Conservative with fixes.**
Scavi should suggest minimal changes rather than rewrite entire instruction files.

**Agent-agnostic.**
Your repository shouldn't need a different source of truth for every coding agent.

---

## Status

> 🚧 **Scavi is currently in early development.**

The first goal is a usable CLI and GitHub Action capable of detecting stale and conflicting AI coding instructions against a real codebase.

If this problem sounds familiar, feedback and ideas are welcome.

---

## Contributing

Scavi is being built in the open.

Issues, ideas, test repositories, edge cases, and pull requests are welcome.

Especially useful are real-world examples of:

* stale `AGENTS.md` instructions
* conflicting agent configuration
* outdated architecture descriptions
* broken paths or commands
* AI agents making mistakes because of outdated repository context

---

## License

MIT

---

<p align="center">
  <strong>🦝 Scavi</strong><br>
  The context linter for AI coding agents.<br>
  <em>Keep your agents in sync with your code.</em>
</p>
