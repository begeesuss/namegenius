import { getDomainAdapter } from "@/lib/adapters/domain";
import { getSocialAdapter } from "@/lib/adapters/social";
import { getTrademarkAdapter } from "@/lib/adapters/trademark";
import { getUsageAdapter } from "@/lib/adapters/usage";
import { generateCandidatePool } from "@/lib/llm/client";
import { linguisticFlags } from "@/lib/linguistic";
import {
  dedupeCandidates,
  normalizeName,
  rewriteInventedMeaning,
} from "@/lib/normalize";
import { preferenceBoost } from "@/lib/learning/preference";
import { fitLabel, rankCandidates, scoreCandidate } from "@/lib/ranking/rank";
import { logTelemetry } from "@/lib/telemetry";
import type {
  GeneratedCandidate,
  NormalizedBrief,
  PreferenceProfile,
  RankedCandidate,
} from "@/lib/types";

export async function runGenerationPipeline(
  brief: NormalizedBrief,
  preference: PreferenceProfile,
): Promise<RankedCandidate[]> {
  const { candidates } = await generateCandidatePool(brief);
  const cleaned = dedupeCandidates(
    candidates
      .map((c) => sanitize(c))
      .filter((c) => c.linguisticSafe)
      .map(({ linguisticSafe: _x, ...rest }) => rest),
  );

  const domain = getDomainAdapter();
  const usage = getUsageAdapter();
  const trademark = getTrademarkAdapter();
  const social = getSocialAdapter();

  const ranked: RankedCandidate[] = [];
  for (const candidate of cleaned) {
    let usageResult = await usage.check(candidate.name);
    let domains = await domain.check(candidate.name);
    const tm = await trademark.check(candidate.name);
    const handles = await social.check(candidate.name);
    const linguistic = linguisticFlags(candidate.name, brief.geography);

    if (linguistic.offensiveRisk === "high") continue;

    const usageDetected = usageResult.status === "detected";
    const available = domains.filter((d) => d.availability === "available").length;
    const boost = preferenceBoost(preference, {
      ...candidate,
      usageStatus: usageResult.status,
      fitLabel: "Worth considering",
      domainChecks: domains,
      trademarkSignal: tm.signal,
      trademarkNote: tm.note,
      socialHandles: handles,
      linguistic,
      rankingSignals: {},
    });
    const score = scoreCandidate(candidate, usageDetected, available, boost);
    ranked.push({
      ...candidate,
      usageStatus: usageResult.status,
      usageNote: usageResult.note,
      fitLabel: fitLabel(score, usageDetected),
      domainChecks: domains,
      trademarkSignal: tm.signal,
      trademarkNote: tm.note,
      socialHandles: handles,
      linguistic,
      usageEvidence: usageResult.evidence,
      rankingSignals: { score, boost, available },
    });
  }

  const ordered = rankCandidates(ranked).slice(0, 8);
  logTelemetry("validation", { kept: ordered.length, pool: cleaned.length });
  return ordered;
}

function sanitize(candidate: GeneratedCandidate) {
  const meaning = candidate.invented
    ? rewriteInventedMeaning(candidate.name, candidate.meaning)
    : candidate.meaning;
  return {
    ...candidate,
    name: candidate.name.trim(),
    normalized: normalizeName(candidate.name),
    meaning,
    linguisticSafe: true as const,
  };
}
