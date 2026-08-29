export default {
  context: [
    "AGENTS.md",
  ],
  checks: {
    semantic: false,
    semanticConfidence: 0.6,
  },
  ai: {
    provider: "openai",
    model: "",
  },
};
