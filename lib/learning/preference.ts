import { estimateSyllables } from "@/lib/normalize";
import type { PreferenceProfile, RankedCandidate } from "@/lib/types";
import { emptyPreference } from "@/lib/questions/orchestrator";

const WEIGHTS = {
  save: 1.4,
  like: 1,
  dislike: 0.8,
  skip: 0.15,
} as const;

export { emptyPreference };

export function applyFeedback(
  profile: PreferenceProfile,
  candidate: RankedCandidate,
  action: "like" | "dislike" | "save" | "skip",
): PreferenceProfile {
  const next: PreferenceProfile = {
    ...profile,
    likedStyles: { ...profile.likedStyles },
    dislikedStyles: { ...profile.dislikedStyles },
    likedTerritories: { ...profile.likedTerritories },
    dislikedTerritories: { ...profile.dislikedTerritories },
    likedNames: [...profile.likedNames],
    dislikedNames: [...profile.dislikedNames],
    savedNames: [...profile.savedNames],
    likedLengths: [...profile.likedLengths],
    dislikedLengths: [...profile.dislikedLengths],
  };

  const style = candidate.naming_style;
  const territory = candidate.territory || "General";
  const length = candidate.name.length;

  if (action === "like" || action === "save") {
    next.likedStyles[style] = (next.likedStyles[style] ?? 0) + WEIGHTS[action];
    next.likedTerritories[territory] =
      (next.likedTerritories[territory] ?? 0) + WEIGHTS[action];
    next.likedLengths.push(length);
    if (!next.likedNames.includes(candidate.name)) next.likedNames.push(candidate.name);
    if (action === "save" && !next.savedNames.includes(candidate.name)) {
      next.savedNames.push(candidate.name);
    }
  } else if (action === "dislike") {
    next.dislikedStyles[style] = (next.dislikedStyles[style] ?? 0) + WEIGHTS.dislike;
    next.dislikedTerritories[territory] =
      (next.dislikedTerritories[territory] ?? 0) + WEIGHTS.dislike;
    next.dislikedLengths.push(length);
    if (!next.dislikedNames.includes(candidate.name)) {
      next.dislikedNames.push(candidate.name);
    }
  }

  next.interactionCount += 1;
  next.confidence = Math.min(1, next.interactionCount / 8);
  return next;
}

export function revertFeedback(
  profile: PreferenceProfile,
  candidate: RankedCandidate,
  action: "like" | "dislike" | "save" | "skip",
): PreferenceProfile {
  if (action === "skip") return profile;
  const inverse =
    action === "dislike" ? "like" : action === "save" ? "save" : "dislike";
  const cloned = structuredClone(profile);
  if (action === "like" || action === "save") {
    cloned.likedNames = cloned.likedNames.filter((n) => n !== candidate.name);
    cloned.savedNames = cloned.savedNames.filter((n) => n !== candidate.name);
    cloned.likedStyles[candidate.naming_style] = Math.max(
      0,
      (cloned.likedStyles[candidate.naming_style] ?? 0) - WEIGHTS[action],
    );
  }
  if (action === "dislike") {
    cloned.dislikedNames = cloned.dislikedNames.filter((n) => n !== candidate.name);
    cloned.dislikedStyles[candidate.naming_style] = Math.max(
      0,
      (cloned.dislikedStyles[candidate.naming_style] ?? 0) - WEIGHTS.dislike,
    );
  }
  cloned.interactionCount = Math.max(0, cloned.interactionCount - 1);
  cloned.confidence = Math.min(1, cloned.interactionCount / 8);
  void inverse;
  return cloned;
}

export function preferenceBoost(profile: PreferenceProfile, candidate: RankedCandidate) {
  if (profile.interactionCount === 0) return 0;
  const styleLike = profile.likedStyles[candidate.naming_style] ?? 0;
  const styleDis = profile.dislikedStyles[candidate.naming_style] ?? 0;
  const territory = candidate.territory || "General";
  const terrLike = profile.likedTerritories[territory] ?? 0;
  const terrDis = profile.dislikedTerritories[territory] ?? 0;
  const avgLikeLen =
    profile.likedLengths.reduce((a, b) => a + b, 0) /
    Math.max(1, profile.likedLengths.length);
  const lengthDelta =
    profile.likedLengths.length === 0
      ? 0
      : 1 - Math.min(1, Math.abs(candidate.name.length - avgLikeLen) / 8);
  const raw =
    (styleLike - styleDis) * 0.12 +
    (terrLike - terrDis) * 0.1 +
    lengthDelta * 0.08 * Math.min(1, profile.confidence * 2);
  return Math.max(-0.35, Math.min(0.45, raw));
}

export function reorderQueue(
  remaining: RankedCandidate[],
  profile: PreferenceProfile,
) {
  const scored = remaining.map((c) => ({
    c,
    s: preferenceBoost(profile, c),
  }));
  scored.sort((a, b) => b.s - a.s);
  const confidence = profile.confidence;
  if (confidence < 0.25) {
    return diversify(scored.map((x) => x.c));
  }
  return diversify(scored.map((x) => x.c), 0.35);
}

function diversify(items: RankedCandidate[], mix = 0.5) {
  const used = new Set<string>();
  const out: RankedCandidate[] = [];
  const rest = [...items];
  while (rest.length) {
    const idx = rest.findIndex((item) => !used.has(item.territory || "General") || mix < 0.3);
    const pick = idx >= 0 ? rest.splice(idx, 1)[0] : rest.shift()!;
    out.push(pick);
    used.add(pick.territory || "General");
    if (used.size >= 4) used.clear();
  }
  void estimateSyllables;
  return out;
}
