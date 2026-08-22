import type { CheckResult } from "@scavi/core";

const ANSI = { reset: "\u001b[0m", bold: "\u001b[1m", dim: "\u001b[2m", red: "\u001b[31m", green: "\u001b[32m", yellow: "\u001b[33m", cyan: "\u001b[36m", purple: "\u001b[38;5;141m" } as const;
type Styler = (value: string) => string;
export interface Palette { bold: Styler; dim: Styler; red: Styler; green: Styler; yellow: Styler; cyan: Styler; purple: Styler }

export function createPalette(enabled: boolean): Palette {
  const style = (code: string): Styler => enabled ? (value) => `${code}${value}${ANSI.reset}` : (value) => value;
  return { bold: style(ANSI.bold), dim: style(ANSI.dim), red: style(ANSI.red), green: style(ANSI.green), yellow: style(ANSI.yellow), cyan: style(ANSI.cyan), purple: style(ANSI.purple) };
}

export function shouldUseColor(noColor = false, forceColor = false): boolean {
  if (noColor) return false;
  if (forceColor) return true;
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined) return process.env.FORCE_COLOR !== "0";
  return Boolean(process.stdout.isTTY);
}

function section(title: string, palette: Palette): string { return `${palette.bold(title)} ${palette.dim("─".repeat(Math.max(8, 48 - title.length)))}` }

export function renderText(result: CheckResult, options: { color?: boolean } = {}): string {
  const palette = createPalette(Boolean(options.color));
  const lines = [palette.purple(palette.bold("🐾 SCAVI")), palette.dim("   Context linter for AI coding agents"), "", section("Context files", palette)];
  if (result.contextFiles.length === 0) lines.push(`  ${palette.dim("None found")}`);
  else result.contextFiles.forEach((file) => lines.push(`  ${palette.green("✓")} ${file.relativePath}`));
  lines.push("", section("Repository checks", palette));
  if (result.issues.length === 0) lines.push("", `${palette.green("✓ CLEAN")}  No deterministic issues found.`);
  for (const issue of result.issues) {
    const status = issue.severity === "error" ? palette.red("✗ ERROR") : issue.severity === "warning" ? palette.yellow("⚠ WARNING") : palette.cyan("● INFO");
    lines.push("", `${status}  ${palette.cyan(palette.bold(issue.id))}`, `  ${palette.dim(`${issue.source.file}:${issue.source.line}`)}`, "", `  ${issue.message}`);
    if (issue.claim) lines.push("", `  ${palette.dim("Claim")}`, `    ${issue.claim}`);
    if (issue.evidence.length) {
      lines.push("", `  ${palette.dim("Evidence")}`);
      const fileWidth = Math.min(24, Math.max(0, ...issue.evidence.map((item) => item.file?.length ?? 0)));
      issue.evidence.forEach((item) => {
        const file = item.file ? palette.cyan(item.file.padEnd(fileWidth)) : "";
        lines.push(`    ${file}${file ? "  " : ""}${palette.dim(item.description)}`);
      });
    }
    lines.push("", palette.dim("─".repeat(52)));
  }
  lines.push("", section("Summary", palette));
  const errors = result.summary.errors ? palette.red(`${result.summary.errors} ${result.summary.errors === 1 ? "error" : "errors"}`) : palette.green("0 errors");
  const warnings = result.summary.warnings ? palette.yellow(`${result.summary.warnings} ${result.summary.warnings === 1 ? "warning" : "warnings"}`) : palette.green("0 warnings");
  lines.push(`  ${errors}  ${palette.dim("•")}  ${warnings}  ${palette.dim("•")}  ${palette.bold(`${result.summary.total} ${result.summary.total === 1 ? "issue" : "issues"}`)}`);
  if (result.semanticFindings.length) {
    lines.push("", section("Semantic verification", palette));
    for (const finding of result.semanticFindings) {
      lines.push("", `  ${palette.cyan(`${finding.source.file}:${finding.source.line}`)}`, `  ${palette.bold(finding.verdict.toUpperCase())} (${Math.round(finding.confidence * 100)}%)`, `  ${finding.claim}`, `  ${palette.dim(finding.reason)}`);
      finding.evidence.forEach((item) => lines.push(`    ${palette.dim(`${item.file}:${item.startLine}-${item.endLine}`)}`));
    }
  }
  return lines.join("\n");
}

export function renderFixPreview(preview: string, color: boolean): string {
  const palette = createPalette(color);
  return preview.split(/\r?\n/).map((line) => line.startsWith("+ ") ? palette.green(line) : line.startsWith("- ") ? palette.red(line) : line.startsWith("@@") ? palette.cyan(line) : line).join("\n");
}
