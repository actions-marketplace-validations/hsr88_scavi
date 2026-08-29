import { describe, expect, it } from "vitest";

describe("configuration", () => {
  it("loads defaults", () => expect(loadConfiguration()).toBeDefined());
});
