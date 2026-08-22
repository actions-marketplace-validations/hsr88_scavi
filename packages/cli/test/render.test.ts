import { describe, expect, it } from "vitest";
import type { CheckResult } from "@scavi/core";
import { renderFixPreview, renderText, shouldUseColor } from "../src/render.js";

const result = {
  root: "/repo",
  contextFiles: [{ absolutePath: "/repo/AGENTS.md", relativePath: "AGENTS.md", content: "Use npm." }],
  facts: { root: "/repo", packageManagerEvidence: [], scripts: new Set(), dependencies: {} },
  semanticFindings: [],
  issues: [{ id: "PACKAGE_MANAGER_MISMATCH", rule: "package-manager", severity: "error", source: { file: "AGENTS.md", line: 1 }, message: "Instruction names npm, but the repository uses pnpm", claim: "Use npm.", evidence: [{ file: "package.json", description: "packageManager: pnpm" }] }],
  summary: { errors: 1, warnings: 0, infos: 0, total: 1 },
} as CheckResult;

describe("terminal rendering", () => {
  it("renders a structured plain-text report without ANSI when color is disabled", () => {
    const output = renderText(result, { color: false });
    expect(output).toContain("🐾 SCAVI");
    expect(output).toContain("✗ ERROR  PACKAGE_MANAGER_MISMATCH");
    expect(output).toContain("1 error  •  0 warnings  •  1 issue");
    expect(output).not.toContain("\u001b[");
  });

  it("adds ANSI color only when requested", () => {
    expect(renderText(result, { color: true })).toContain("\u001b[38;5;141m");
    expect(renderFixPreview("- npm\n+ pnpm", true)).toContain("\u001b[31m- npm");
    expect(renderFixPreview("- npm\n+ pnpm", false)).toBe("- npm\n+ pnpm");
  });

  it("lets explicit CLI flags control color", () => {
    expect(shouldUseColor(true, true)).toBe(false);
    expect(shouldUseColor(false, true)).toBe(true);
  });
});
