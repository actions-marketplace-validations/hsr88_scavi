export default {
  context: ["AGENTS.md"],
  checks: {
    semantic: true,
    semanticConfidence: 0.6,
  },
  ai: {
    provider: "openai",
    model: "gpt-5-mini",
  },
};
