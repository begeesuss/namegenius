import { describe, expect, it } from "vitest";
import { dedupeCandidates, normalizeName, similarNames } from "../lib/normalize";
import { fitLabel, scoreCandidate } from "../lib/ranking/rank";
import {
  applyFeedback,
  emptyPreference,
  preferenceBoost,
} from "../lib/learning/preference";
import {
  generationConfidence,
  hasEnoughSignal,
  nextQuestion,
  pruneAnswersForType,
} from "../lib/questions/orchestrator";
import type { RankedCandidate, SessionAnswers } from "../lib/types";

function cand(over: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    name: "Lumora",
    meaning: "Invented name inspired by light",
    pronunciation: "loo-mor-ah",
    naming_style: "Invented",
    rationale: "Modern",
    distinctiveness: "High",
    confidence: 0.9,
    invented: true,
    originKind: "invented",
    territory: "Light & Clarity",
    usageStatus: "clear",
    fitLabel: "Strong fit",
    domainChecks: [],
    trademarkSignal: "low_apparent_conflict",
    socialHandles: [],
    linguistic: {
      pronunciationDifficulty: "easy",
      unintendedMeanings: [],
      offensiveRisk: "none",
      crossLanguageNotes: [],
    },
    rankingSignals: { score: 0.8 },
    ...over,
  };
}

describe("normalize", () => {
  it("canonicalizes names", () => {
    expect(normalizeName("Lu-mora")).toBe("lumora");
  });
  it("dedupes near-duplicates", () => {
    const kept = dedupeCandidates([{ name: "Lumora" }, { name: "Lumora" }, { name: "Nexora" }]);
    expect(kept.map((k) => k.name)).toEqual(["Lumora", "Nexora"]);
  });
  it("detects similar names", () => {
    expect(similarNames("Brightly", "Brightly")).toBe(true);
  });
});

describe("ranking", () => {
  it("uses labels not 0-100 scores", () => {
    expect(fitLabel(0.9, false)).toBe("Excellent fit");
    expect(fitLabel(0.9, true)).toBe("Existing usage detected");
    expect(fitLabel(0.4, false)).toBe("Worth considering");
  });
  it("penalizes existing usage", () => {
    const clear = scoreCandidate(cand(), false, 3, 0);
    const used = scoreCandidate(cand(), true, 3, 0);
    expect(used).toBeLessThan(clear);
  });
});

describe("preference", () => {
  it("weights save above like", () => {
    const liked = applyFeedback(emptyPreference(), cand(), "like");
    const saved = applyFeedback(emptyPreference(), cand(), "save");
    expect(saved.likedStyles.Invented).toBeGreaterThan(liked.likedStyles.Invented);
  });
  it("does not overfit on one swipe", () => {
    const one = applyFeedback(emptyPreference(), cand(), "like");
    expect(one.confidence).toBeLessThan(0.2);
    const other = cand({ naming_style: "Descriptive", territory: "Motion", name: "Dropboxy" });
    expect(preferenceBoost(one, other)).toBeLessThan(0.5);
  });
});

describe("questions", () => {
  it("asks purpose first after type", () => {
    const q = nextQuestion({ namingType: "product" });
    expect(q?.id).toBe("purpose");
  });
  it("allows early generate after purpose + audience", () => {
    const answers: SessionAnswers = {
      namingType: "app",
      purpose: "habit tracker",
      audience: "busy parents",
      generateNow: true,
    };
    expect(hasEnoughSignal(answers)).toBe(true);
    expect(nextQuestion(answers)).toBeNull();
  });
  it("skips industry when type does not need it", () => {
    const pruned = pruneAnswersForType(
      { namingType: "company", industry: "fintech", purpose: "x" },
      "feature",
    );
    expect(pruned.industry).toBeUndefined();
    expect(generationConfidence({ namingType: "feature", purpose: "x" })).toBeGreaterThan(0.4);
  });
});
