import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface RepositoryChunk { file: string; startLine: number; endLine: number; content: string }
export interface RankedEvidence extends RepositoryChunk { score: number }
export interface RetrievalOptions { excludeFiles?: string[]; maxFiles?: number; maxFileBytes?: number; chunkLines?: number; overlapLines?: number }

const EXCLUDED_DIRECTORIES = new Set([".git", "node_modules", "dist", "coverage", ".scavi"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".mdc", ".yaml", ".yml", ".toml", ".py", ".go", ".rs", ".java", ".kt", ".cs", ".rb", ".php", ".sql", ".graphql", ".sh", ".ps1"]);
const TEXT_FILENAMES = new Set(["Dockerfile", "Makefile", "Taskfile", ".env.example"]);
const STOP_WORDS = new Set(["the", "and", "that", "this", "with", "from", "into", "uses", "use", "are", "is", "files"]);
const CONCEPT_GROUPS = [
  ["configuration", "config", "settings", "preferences"],
  ["persist", "persisted", "persistence", "store", "stored", "storage", "save", "saved", "write", "writes", "database", "insert"],
  ["authentication", "auth", "login", "session"],
  ["authorization", "permission", "permissions", "role", "roles", "access"],
  ["frontend", "client", "web", "ui"],
  ["backend", "server", "api", "service"],
] as const;

function tokens(value: string): string[] {
  return [...new Set((value.toLowerCase().match(/[a-z0-9_./-]{3,}/g) ?? []).filter((token) => !STOP_WORDS.has(token)))];
}

function expandedTerms(query: string[]): Map<string, number> {
  const terms = new Map(query.map((token) => [token, 1]));
  for (const group of CONCEPT_GROUPS) {
    if (!group.some((term) => query.includes(term))) continue;
    for (const term of group) if (!terms.has(term)) terms.set(term, 0.5);
  }
  return terms;
}

export async function indexRepository(root: string, options: RetrievalOptions = {}): Promise<RepositoryChunk[]> {
  const exclude = new Set((options.excludeFiles ?? []).map((file) => file.replace(/\\/g, "/")));
  const maxFiles = options.maxFiles ?? 2_000, maxBytes = options.maxFileBytes ?? 256_000, chunkLines = options.chunkLines ?? 40, overlap = options.overlapLines ?? 8;
  async function walk(directory: string): Promise<string[]> {
    const discovered: string[] = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (!relative.split("/").some((part) => EXCLUDED_DIRECTORIES.has(part))) discovered.push(...await walk(absolute));
      } else if (entry.isFile()) discovered.push(absolute);
    }
    return discovered;
  }
  const files: string[] = [];
  for (const absolute of (await walk(root)).sort()) {
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (relative.split("/").some((part) => EXCLUDED_DIRECTORIES.has(part)) || exclude.has(relative)) continue;
    if (!TEXT_EXTENSIONS.has(path.extname(absolute).toLowerCase()) && !TEXT_FILENAMES.has(path.basename(absolute))) continue;
    if ((await stat(absolute)).size <= maxBytes) files.push(absolute);
  }
  const chunks: RepositoryChunk[] = [];
  for (const absolute of files.slice(0, maxFiles)) {
    const relative = path.relative(root, absolute).split(path.sep).join("/"), lines = (await readFile(absolute, "utf8")).split(/\r?\n/);
    const step = Math.max(1, chunkLines - overlap);
    for (let start = 0; start < lines.length; start += step) {
      const selected = lines.slice(start, start + chunkLines);
      if (selected.join("").trim()) chunks.push({ file: relative, startLine: start + 1, endLine: start + selected.length, content: selected.join("\n") });
      if (start + chunkLines >= lines.length) break;
    }
  }
  return chunks;
}

export function retrieveEvidence(claim: string, chunks: RepositoryChunk[], limit = 5): RankedEvidence[] {
  const query = tokens(claim);
  if (query.length === 0) return [];
  const terms = expandedTerms(query);
  return chunks.map((chunk) => {
    const content = chunk.content.toLowerCase(), file = chunk.file.toLowerCase();
    let score = 0;
    const matchedPrimary = new Set<string>();
    for (const [term, weight] of terms) {
      const occurrences = content.split(term).length - 1;
      score += Math.min(occurrences, 5) * weight;
      if (file.includes(term)) score += 3 * weight;
      if (weight === 1 && (occurrences > 0 || file.includes(term))) matchedPrimary.add(term);
    }
    score += matchedPrimary.size * 0.5;
    return { ...chunk, score: Math.round(score * 100) / 100 };
  }).filter((chunk) => chunk.score > 0).sort((a, b) => b.score - a.score || a.file.localeCompare(b.file)).slice(0, limit);
}
