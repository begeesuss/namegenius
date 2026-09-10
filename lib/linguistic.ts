import type { LinguisticFlags } from "@/lib/types";
import { estimateSyllables } from "@/lib/normalize";

const RISKY = ["slave", "rape", "nazi", "kill", "hate"];

export function linguisticFlags(name: string, geography?: string): LinguisticFlags {
  const lower = name.toLowerCase();
  const syllables = estimateSyllables(name);
  const clusters = (name.match(/[^aeiouyAEIOUY]{3,}/g) ?? []).length;
  let pronunciationDifficulty: LinguisticFlags["pronunciationDifficulty"] = "easy";
  if (syllables >= 4 || clusters > 0) pronunciationDifficulty = "moderate";
  if (syllables >= 5 || clusters > 1) pronunciationDifficulty = "hard";

  const offensiveRisk = RISKY.some((w) => lower.includes(w))
    ? "high"
    : lower.includes("sex") || lower.includes("drug")
      ? "possible"
      : "none";

  const unintendedMeanings: string[] = [];
  if (lower.endsWith("ly") && name.length <= 5) {
    unintendedMeanings.push("May read as an adverb rather than a brand.");
  }

  const crossLanguageNotes: string[] = [];
  if (geography && /japan|jp/i.test(geography) && /shi|tsu/i.test(lower)) {
    crossLanguageNotes.push("Phonetics may shift in Japanese pronunciation.");
  }

  return {
    pronunciationDifficulty,
    unintendedMeanings,
    offensiveRisk,
    crossLanguageNotes,
  };
}
