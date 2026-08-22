#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import path from "node:path";
import { applyFixes, checkRepository, exitCodeFor, initRepository, previewFixes, type CheckResult, type InitResult } from "@scavi/core";
import { createPalette, renderFixPreview, renderText, shouldUseColor } from "./render.js";

function usage(): string { return "Usage:\n  scavi init [path]\n  scavi check [path] [--format text|json] [--color|--no-color]\n  scavi fix [path] [--color|--no-color]" }

function renderInit(result: InitResult): string {
  const relative = result.configPath.slice(result.root.length + 1);
  const lines = ["🐾 Scavi initialization", "", `Repository:\n  ${result.root}`, "", "Detected context:"];
  if (result.contextFiles.length) result.contextFiles.forEach((file) => lines.push(`  ✓ ${file}`));
  else lines.push("  None found yet");
  if (result.packageManager) lines.push("", `Package manager:\n  ${result.packageManager}`);
  const checkTarget = path.resolve(process.cwd()) === path.resolve(result.root) ? "" : ` ${JSON.stringify(result.root)}`;
  lines.push("", result.created ? `Created:\n  ${relative}` : `Not changed:\n  ${relative} already exists`, "", `Run:\n  scavi check${checkTarget}`);
  return lines.join("\n");
}

function jsonReport(result: CheckResult): unknown {
  return {
    root: result.root,
    contextFiles: result.contextFiles.map((file) => file.relativePath),
    repository: {
      packageManager: result.facts.packageManager,
      packageManagerEvidence: result.facts.packageManagerEvidence,
      scripts: [...result.facts.scripts],
      dependencies: result.facts.dependencies,
    },
    issues: result.issues,
    semanticFindings: result.semanticFindings,
    summary: result.summary,
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const noColor = args.includes("--no-color"), forceColor = args.includes("--color"), color = shouldUseColor(noColor, forceColor), palette = createPalette(color);
  if (args[0] === "init") {
    const positional = args.slice(1).filter((arg) => arg !== "--no-color" && arg !== "--color");
    if (positional.length > 1) { console.error(usage()); process.exitCode = 2; return }
    try { console.log(renderInit(await initRepository(positional[0]))); process.exitCode = 0 }
    catch (error) { console.error(`Scavi failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 2 }
    return;
  }
  if (args[0] === "fix") {
    const positional = args.slice(1).filter((arg) => arg !== "--no-color" && arg !== "--color");
    if (positional.length > 1) { console.error(usage()); process.exitCode = 2; return }
    try {
      const result = await checkRepository(positional[0]);
      const fixable = result.issues.filter((issue) => issue.fix);
      if (fixable.length === 0) {
        console.log(result.issues.length === 0 ? "✓ No issues found." : "No deterministic fixes are available for the current issues.");
        process.exitCode = exitCodeFor(result);
        return;
      }
      console.log(`${palette.purple(palette.bold("🐾 SCAVI"))} ${palette.bold("deterministic fix preview")}\n`);
      console.log(renderFixPreview(await previewFixes(result), color));
      const prompt = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await prompt.question("\nApply these fixes? [y/N] ");
      prompt.close();
      if (!/^y(?:es)?$/i.test(answer.trim())) { console.log("No files changed."); process.exitCode = exitCodeFor(result); return }
      const applied = await applyFixes(result);
      console.log(`Applied ${applied} minimal ${applied === 1 ? "edit" : "edits"}.`);
      process.exitCode = exitCodeFor(await checkRepository(positional[0]));
    } catch (error) {
      console.error(`Scavi failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 2;
    }
    return;
  }
  if (args[0] !== "check") { console.error(usage()); process.exitCode = 2; return }
  const formatIndex = args.indexOf("--format");
  const format = formatIndex >= 0 ? args[formatIndex + 1] : "text";
  if (format !== "text" && format !== "json") { console.error("Invalid --format. Expected text or json."); process.exitCode = 2; return }
  const positional = args.slice(1).filter((arg, index) => arg !== "--format" && args[index] !== "--format" && arg !== "--no-color" && arg !== "--color");
  if (positional.length > 1) { console.error(usage()); process.exitCode = 2; return }
  try {
    const result = await checkRepository(positional[0]);
    console.log(format === "json" ? JSON.stringify(jsonReport(result), null, 2) : renderText(result, { color }));
    process.exitCode = exitCodeFor(result);
  } catch (error) {
    console.error(`Scavi failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}

await main();
