import type {
  FitLabel,
  GeneratedCandidate,
  RankedCandidate,
} from "@/lib/types";

export function fitLabel(score: number, usageDetected: boolean): FitLabel {
  if (usageDetected) return "Existing usage detected";
  if (score >= 0.78) return "Excellent fit";
  if (score >= 0.58) return "Strong fit";
  return "Worth considering";
}

export function scoreCandidate(
  candidate: GeneratedCandidate,
  usageDetected: boolean,
  domainAvailableCount: number,
  preferenceBoost = 0,
) {
  const length = candidate.name.replace(/[^a-zA-Z]/g, "").length;
  const lengthScore = length >= 4 && length <= 10 ? 1 : length <= 12 ? 0.7 : 0.4;
  const distinct =
    candidate.distinctiveness === "High"
      ? 1
      : candidate.distinctiveness === "Medium"
        ? 0.65
        : 0.35;
  const domainScore = Math.min(1, domainAvailableCount / 3);
  const usagePenalty = usageDetected ? 0.18 : 0;
  const raw =
    candidate.confidence * 0.28 +
    lengthScore * 0.18 +
    distinct * 0.22 +
    domainScore * 0.16 +
    preferenceBoost * 0.16 -
    usagePenalty;
  return Math.max(0, Math.min(1, raw));
}

export function rankCandidates(candidates: RankedCandidate[]) {
  return [...candidates].sort((a, b) => {
    const aUsage = a.usageStatus === "detected" ? 1 : 0;
    const bUsage = b.usageStatus === "detected" ? 1 : 0;
    const aScore = Number(a.rankingSignals.score ?? 0);
    const bScore = Number(b.rankingSignals.score ?? 0);
    if (aUsage !== bUsage) return aUsage - bUsage;
    return bScore - aScore;
  });
}
