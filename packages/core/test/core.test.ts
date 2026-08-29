import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { describe, expect, it } from "vitest";
import type { SemanticProvider } from "@scavi/ai";
import { applyFixes, checkRepository, configuredModel, exitCodeFor, findRepositoryRoot, initRepository, loadConfig, previewFixes } from "../src/index.js";

const fixtures = path.resolve(import.meta.dirname, "../../../fixtures");

describe("checkRepository", () => {
  it("returns no findings for a clean repository", async () => {
    const result = await checkRepository(path.join(fixtures, "clean-repo"));
    expect(result.issues).toEqual([]);
    expect(exitCodeFor(result)).toBe(0);
  });

  it("detects stale paths, scripts, package managers, and conflicts", async () => {
    const result = await checkRepository(path.join(fixtures, "broken-repo"));
    expect(result.issues.map((issue) => issue.id)).toEqual(expect.arrayContaining(["STALE_PATH", "MISSING_REFERENCED_FILE", "INVALID_COMMAND", "PACKAGE_MANAGER_MISMATCH", "CONTEXT_CONFLICT", "DEPENDENCY_VERSION_MISMATCH"]));
    expect(exitCodeFor(result)).toBe(1);
  });

  it("resolves workspace scripts and monorepo-relative file references", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-monorepo-"));
    try {
      await mkdir(path.join(root, "packages", "app", "agents"), { recursive: true });
      await writeFile(path.join(root, "package.json"), JSON.stringify({ packageManager: "pnpm@10.32.1" }), "utf8");
      await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n", "utf8");
      await writeFile(path.join(root, "packages", "app", "package.json"), JSON.stringify({ scripts: { dev: "vite" } }), "utf8");
      await writeFile(path.join(root, "packages", "app", "Cargo.toml"), "[package]\nname='app'\n", "utf8");
      await writeFile(path.join(root, "packages", "app", "agents", "tsconfig.json"), "{}\n", "utf8");
      await writeFile(path.join(root, "AGENTS.md"), "Run `pnpm dev`. Update `Cargo.toml`. Strict mode uses `agents/tsconfig`.\n", "utf8");
      expect((await checkRepository(root)).issues).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }) }
  });
});

describe("findRepositoryRoot", () => {
  it("accepts a .git file used by Git worktrees", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-worktree-"));
    try {
      await mkdir(path.join(root, "nested"));
      await writeFile(path.join(root, ".git"), "gitdir: elsewhere\n", "utf8");
      expect(await findRepositoryRoot(path.join(root, "nested"))).toBe(root);
    } finally { await rm(root, { recursive: true, force: true }) }
  });
});

describe("initRepository", () => {
  it("creates a static config and never overwrites it", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-init-"));
    try {
      await writeFile(path.join(root, "AGENTS.md"), "# Context\n", "utf8");
      const first = await initRepository(root), second = await initRepository(root);
      expect(first.created).toBe(true);
      expect(second.created).toBe(false);
      expect(await loadConfig(root)).toEqual({ context: ["AGENTS.md"], checks: { semantic: false, semanticConfidence: 0.6, semanticMaxClaims: 20, semanticEvidenceLimit: 5 }, ai: { provider: "openai", model: "", baseUrl: undefined } });
      expect(await readFile(path.join(root, "scavi.config.ts"), "utf8")).toContain("export default");
    } finally { await rm(root, { recursive: true, force: true }) }
  });

  it("discovers custom context files from a configured glob", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-custom-"));
    try {
      await mkdir(path.join(root, "docs"));
      await writeFile(path.join(root, "docs", "agent-context.md"), "Use pnpm.\n", "utf8");
      await writeFile(path.join(root, "scavi.config.ts"), "export default { context: [\"docs/**/*.md\"] };\n", "utf8");
      await writeFile(path.join(root, "package.json"), JSON.stringify({ packageManager: "pnpm@10.32.1" }), "utf8");
      const result = await checkRepository(root);
      expect(result.contextFiles.map((file) => file.relativePath)).toContain("docs/agent-context.md");
      expect(result.issues).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }) }
  });
});

describe("semantic configuration", () => {
  it("uses SCAVI_AI_MODEL when the generated config leaves model empty", () => {
    const previous = process.env.SCAVI_AI_MODEL;
    process.env.SCAVI_AI_MODEL = "environment-model";
    try { expect(configuredModel({ ai: { provider: "openai", model: "" } })).toBe("environment-model") }
    finally {
      if (previous === undefined) delete process.env.SCAVI_AI_MODEL;
      else process.env.SCAVI_AI_MODEL = previous;
    }
  });

  it("loads and validates the semantic confidence threshold", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-confidence-config-"));
    try {
      await writeFile(path.join(root, "scavi.config.ts"), "export default { checks: { semantic: true, semanticConfidence: 0.8 } };\n", "utf8");
      await expect(loadConfig(root)).resolves.toMatchObject({ checks: { semantic: true, semanticConfidence: 0.8 } });
      await writeFile(path.join(root, "scavi.config.ts"), "export default { checks: { semantic: true, semanticConfidence: 1.2 } };\n", "utf8");
      await expect(loadConfig(root)).rejects.toThrow("between 0 and 1");
    } finally { await rm(root, { recursive: true, force: true }) }
  });
});

describe("deterministic fixes", () => {
  it("previews and applies only evidence-backed minimal edits", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-fix-"));
    try {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ packageManager: "pnpm@10.32.1", dependencies: { react: "^19.2.0" } }), "utf8");
      await writeFile(path.join(root, "AGENTS.md"), "Use npm. We use React 18.\n", "utf8");
      const result = await checkRepository(root);
      const preview = await previewFixes(result);
      expect(preview).toContain("- Use npm. We use React 18.");
      expect(preview).toContain("+ Use pnpm. We use React 19.");
      expect(await applyFixes(result)).toBe(2);
      expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe("Use pnpm. We use React 19.\n");
      expect((await checkRepository(root)).issues).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }) }
  });

  it("refuses to apply a stale edit", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-stale-fix-"));
    try {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ packageManager: "pnpm@10.32.1" }), "utf8");
      await writeFile(path.join(root, "AGENTS.md"), "Use npm.\n", "utf8");
      const result = await checkRepository(root);
      await writeFile(path.join(root, "AGENTS.md"), "Use yarn.\n", "utf8");
      await expect(applyFixes(result)).rejects.toThrow("Context changed");
      expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe("Use yarn.\n");
    } finally { await rm(root, { recursive: true, force: true }) }
  });

  it("validates every file before writing any fix", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-atomic-fix-"));
    try {
      await writeFile(path.join(root, "package.json"), JSON.stringify({ packageManager: "pnpm@10.32.1" }), "utf8");
      await writeFile(path.join(root, "AGENTS.md"), "Use npm.\n", "utf8");
      await writeFile(path.join(root, "CLAUDE.md"), "Use yarn.\n", "utf8");
      const result = await checkRepository(root);
      await writeFile(path.join(root, "CLAUDE.md"), "Use bun.\n", "utf8");
      await expect(applyFixes(result)).rejects.toThrow("Context changed");
      expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe("Use npm.\n");
    } finally { await rm(root, { recursive: true, force: true }) }
  });
});

describe("semantic verification", () => {
  it("retrieves local evidence and reports a non-blocking stale verdict", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-semantic-"));
    try {
      await mkdir(path.join(root, "src"));
      await writeFile(path.join(root, "AGENTS.md"), "Configuration is persisted in JSON files.\n", "utf8");
      await writeFile(path.join(root, "src", "storage.ts"), "export function saveConfiguration() { return openSqlite(); }\n", "utf8");
      await writeFile(path.join(root, "scavi.config.ts"), "export default { context: [\"AGENTS.md\"], checks: { semantic: true }, ai: { provider: \"openai\", model: \"test\" } };\n", "utf8");
      const provider: SemanticProvider = { name: "mock", async verify(request) {
        expect(request.evidence[0]?.file).toBe("src/storage.ts");
        expect(request.evidence.map((item) => item.file)).not.toContain("scavi.config.ts");
        return { verdict: "stale", confidence: 0.92, reason: "The implementation uses SQLite." };
      } };
      const result = await checkRepository(root, { semanticProvider: provider });
      expect(result.semanticFindings[0]).toMatchObject({ verdict: "stale", confidence: 0.92, provider: "mock" });
      expect(result.issues.map((issue) => issue.id)).toContain("POSSIBLY_STALE");
      expect(exitCodeFor(result)).toBe(0);
    } finally { await rm(root, { recursive: true, force: true }) }
  });

  it("downgrades a low-confidence stale verdict to uncertain", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-semantic-threshold-"));
    try {
      await mkdir(path.join(root, "src"));
      await writeFile(path.join(root, "AGENTS.md"), "Configuration is persisted in JSON files.\n", "utf8");
      await writeFile(path.join(root, "src", "storage.ts"), "export function saveConfiguration() { return openSqlite(); }\n", "utf8");
      await writeFile(path.join(root, "scavi.config.ts"), "export default { checks: { semantic: true, semanticConfidence: 0.8 }, ai: { provider: \"openai\", model: \"test\" } };\n", "utf8");
      const provider: SemanticProvider = { name: "mock", async verify() {
        return { verdict: "stale", confidence: 0.7, reason: "The implementation may use SQLite." };
      } };
      const result = await checkRepository(root, { semanticProvider: provider });
      expect(result.semanticFindings[0]).toMatchObject({ verdict: "uncertain", confidence: 0.7 });
      expect(result.semanticFindings[0]?.reason).toContain("below the configured 80% threshold");
      expect(result.issues.map((issue) => issue.id)).not.toContain("POSSIBLY_STALE");
      expect(exitCodeFor(result)).toBe(0);
    } finally { await rm(root, { recursive: true, force: true }) }
  });

  it("requires external consent before calling an OpenAI provider", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-semantic-consent-"));
    try {
      await mkdir(path.join(root, "src"));
      await writeFile(path.join(root, "AGENTS.md"), "Configuration is persisted in JSON files.\n", "utf8");
      await writeFile(path.join(root, "src", "storage.ts"), "export function saveConfiguration() { return openSqlite(); }\n", "utf8");
      await writeFile(path.join(root, "scavi.config.ts"), "export default { checks: { semantic: true }, ai: { provider: \"openai\", model: \"test\" } };\n", "utf8");
      const provider: SemanticProvider = { name: "openai", async verify() { throw new Error("must not be called") } };
      const result = await checkRepository(root, { semanticProvider: provider, confirmExternal: async () => false });
      expect(result.semanticSummary).toMatchObject({ enabled: true, cancelled: true, providerCalls: 0 });
      expect(result.semanticFindings).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }) }
  });

  it("caches semantic verdicts without storing repository evidence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-semantic-cache-"));
    try {
      await mkdir(path.join(root, "src"));
      await writeFile(path.join(root, "AGENTS.md"), "Configuration is persisted in JSON files.\n", "utf8");
      await writeFile(path.join(root, "src", "storage.ts"), "export function saveConfiguration() { return openSqlite(); }\n", "utf8");
      await writeFile(path.join(root, "scavi.config.ts"), "export default { checks: { semantic: true }, ai: { provider: \"openai\", model: \"test\" } };\n", "utf8");
      let calls = 0;
      const provider: SemanticProvider = { name: "mock", async verify() {
        calls += 1;
        return { verdict: "stale", confidence: 0.9, reason: "SQLite is used.", usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 } };
      } };
      const first = await checkRepository(root, { semanticProvider: provider });
      const second = await checkRepository(root, { semanticProvider: provider });
      expect(calls).toBe(1);
      expect(first.semanticSummary).toMatchObject({ providerCalls: 1, cacheHits: 0, usage: { totalTokens: 120 } });
      expect(second.semanticSummary).toMatchObject({ providerCalls: 0, cacheHits: 1, usage: { totalTokens: 0 } });
      expect(second.semanticFindings[0]?.cached).toBe(true);
      expect(await readFile(path.join(root, ".scavi", ".gitignore"), "utf8")).toBe("*\n");
      const cache = await readFile(path.join(root, ".scavi", "cache", "semantic-v1.json"), "utf8");
      expect(cache).not.toContain("openSqlite");
    } finally { await rm(root, { recursive: true, force: true }) }
  });

  it("limits semantic claims and evidence chunks", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "scavi-semantic-limits-"));
    try {
      await mkdir(path.join(root, "src"));
      await writeFile(path.join(root, "AGENTS.md"), "Configuration is persisted in JSON files.\nAuthentication is stored in signed sessions.\n", "utf8");
      await writeFile(path.join(root, "src", "storage.ts"), "saveConfiguration(openSqlite());\ncreateSignedSession();\n", "utf8");
      await writeFile(path.join(root, "scavi.config.ts"), "export default { checks: { semantic: true, semanticMaxClaims: 1, semanticEvidenceLimit: 1 }, ai: { provider: \"openai\", model: \"test\" } };\n", "utf8");
      const provider: SemanticProvider = { name: "mock", async verify(request) {
        expect(request.evidence).toHaveLength(1);
        return { verdict: "uncertain", confidence: 0.5, reason: "Test." };
      } };
      const result = await checkRepository(root, { semanticProvider: provider, cache: false });
      expect(result.semanticSummary).toMatchObject({ candidates: 2, analyzed: 1, providerCalls: 1, skippedByLimit: 1 });
    } finally { await rm(root, { recursive: true, force: true }) }
  });
});
