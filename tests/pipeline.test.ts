import { describe, expect, it } from "vitest";
import { MockDomainAdapter } from "../lib/adapters/domain";
import { MockUsageAdapter } from "../lib/adapters/usage";
import { runGenerationPipeline } from "../lib/generation/pipeline";
import { emptyPreference } from "../lib/questions/orchestrator";

describe("generation pipeline", () => {
  it("returns 8 ranked candidates with mock adapters", async () => {
    const ranked = await runGenerationPipeline(
      {
        namingType: "product",
        purpose: "team naming workspace",
        audience: "founders",
        personality: ["intelligent"],
        likedNames: [],
        dislikedNames: [],
        savedNames: [],
      },
      emptyPreference(),
    );
    expect(ranked).toHaveLength(8);
    expect(ranked[0].name.length).toBeGreaterThan(1);
    expect(ranked[0].meaning.length).toBeGreaterThan(1);
    expect(ranked[0].pronunciation.length).toBeGreaterThan(1);
    expect(ranked[0].naming_style.length).toBeGreaterThan(1);
    expect(ranked[0].domainChecks.length).toBeGreaterThan(0);
  });
});

describe("adapters", () => {
  it("domain failure does not throw", async () => {
    const checks = await new MockDomainAdapter(true).check("Lumora");
    expect(checks.every((c) => c.availability === "unavailable")).toBe(true);
    expect(checks[0].errorState).toMatch(/Unable to check/);
  });
  it("usage failure is explicit", async () => {
    const result = await new MockUsageAdapter(true).check("Lumora");
    expect(result.status).toBe("unavailable");
  });
});
