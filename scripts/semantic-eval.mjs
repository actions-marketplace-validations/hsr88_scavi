import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { OllamaProvider, OpenAIResponsesProvider } from "../packages/ai/dist/index.js";
import { indexRepository, retrieveEvidence } from "../packages/retrieval/dist/index.js";

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined };
const providerName = value("--provider");
const retrievalOnly = args.includes("--retrieval-only") || !providerName;
const model = value("--model") ?? process.env.SCAVI_AI_MODEL ?? "";
const baseUrl = value("--base-url");
const root = path.resolve(import.meta.dirname, "../evals/semantic/repository");
const cases = JSON.parse(await readFile(path.resolve(import.meta.dirname, "../evals/semantic/cases.json"), "utf8"));
const chunks = await indexRepository(root);

let provider;
if (!retrievalOnly) {
  if (!model) throw new Error("Pass --model or set SCAVI_AI_MODEL");
  if (providerName === "openai") provider = new OpenAIResponsesProvider({ apiKey: process.env.OPENAI_API_KEY ?? "", model, baseUrl });
  else if (providerName === "ollama") provider = new OllamaProvider({ model, baseUrl });
  else throw new Error("--provider must be openai or ollama");
}

const results = [];
for (const testCase of cases) {
  const evidence = retrieveEvidence(testCase.claim, chunks, 5);
  const retrievedFiles = evidence.map((item) => item.file);
  const retrievalPass = testCase.expectedEvidence ? retrievedFiles[0] === testCase.expectedEvidence : true;
  let semantic;
  if (provider) semantic = evidence.length
    ? await provider.verify({ claim: testCase.claim, evidence })
    : { verdict: "uncertain", confidence: 0, reason: "No relevant repository evidence was retrieved." };
  results.push({
    id: testCase.id,
    expected: testCase.expectedVerdict,
    actual: semantic?.verdict ?? "not-run",
    confidence: semantic?.confidence,
    retrievalPass,
    topEvidence: retrievedFiles[0] ?? "none",
    semanticPass: semantic ? semantic.verdict === testCase.expectedVerdict : undefined,
    usage: semantic?.usage,
  });
}

const retrievalPassed = results.filter((item) => item.retrievalPass).length;
const semanticResults = results.filter((item) => item.semanticPass !== undefined);
const semanticPassed = semanticResults.filter((item) => item.semanticPass).length;
for (const result of results) {
  const retrievalMark = result.retrievalPass ? "✓" : "✗";
  const semanticMark = result.semanticPass === undefined ? "-" : result.semanticPass ? "✓" : "✗";
  console.log(`${retrievalMark} retrieval  ${semanticMark} semantic  ${result.id.padEnd(22)} expected=${result.expected.padEnd(10)} actual=${String(result.actual).padEnd(10)} evidence=${result.topEvidence}`);
}
console.log(`\nRetrieval: ${retrievalPassed}/${results.length} (${Math.round(retrievalPassed / results.length * 100)}%)`);
if (semanticResults.length) console.log(`Semantic: ${semanticPassed}/${semanticResults.length} (${Math.round(semanticPassed / semanticResults.length * 100)}%) · ${providerName}/${model}`);
if (retrievalPassed !== results.length || (semanticResults.length && semanticPassed !== semanticResults.length)) process.exitCode = 1;
