export default {
  context: [
    "AGENTS.md",
  ],
  checks: {
    semantic: false,
    semanticConfidence: 0.6,
    semanticMaxClaims: 20,
    semanticEvidenceLimit: 5,
  },
  ai: {
    provider: "openai",
    model: "",
  },
};
