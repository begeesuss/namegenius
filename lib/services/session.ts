import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  domainChecks,
  nameCandidates,
  namingProjects,
  namingSessions,
  projectComments,
  projectVotes,
  savedNames,
  userFeedback,
} from "@/lib/db/schema";
import { parseConversation } from "@/lib/learning/conversation";
import { runGenerationPipeline } from "@/lib/generation/pipeline";
import {
  applyFeedback,
  reorderQueue,
  revertFeedback,
} from "@/lib/learning/preference";
import {
  answeredQuestions,
  generationConfidence,
  hasEnoughSignal,
  nextQuestion,
  normalizeBrief,
  pruneAnswersForType,
  questionCatalog,
  emptyPreference,
} from "@/lib/questions/orchestrator";
import { logTelemetry } from "@/lib/telemetry";
import type {
  FeedbackAction,
  NameCandidateRecord,
  NamingSessionRecord,
  NamingType,
  Personality,
  PreferenceProfile,
  QuestionId,
  RankedCandidate,
  SessionAnswers,
} from "@/lib/types";
import { NAMING_TYPES } from "@/lib/types";

function now() {
  return new Date().toISOString();
}

function parseSession(row: typeof namingSessions.$inferSelect): NamingSessionRecord {
  return {
    id: row.id,
    anonymousId: row.anonymousId,
    userId: row.userId,
    namingType: (row.namingType as NamingType | null) ?? null,
    answers: JSON.parse(row.answers) as SessionAnswers,
    normalizedBrief: JSON.parse(row.normalizedBrief),
    status: row.status as NamingSessionRecord["status"],
    preference: JSON.parse(row.preference) as PreferenceProfile,
    queue: JSON.parse(row.queue) as string[],
    currentIndex: row.currentIndex,
    exploredCount: row.exploredCount,
    lastFeedbackId: row.lastFeedbackId,
    projectId: row.projectId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseCandidate(row: typeof nameCandidates.$inferSelect): NameCandidateRecord {
  const rankingSignals = JSON.parse(row.rankingSignals) as Record<string, unknown>;
  return {
    id: row.id,
    sessionId: row.sessionId,
    name: row.name,
    normalizedName: row.normalizedName,
    meaning: row.meaning,
    pronunciation: row.pronunciation,
    style: row.style,
    rationale: row.rationale,
    distinctiveness: row.distinctiveness as NameCandidateRecord["distinctiveness"],
    usageStatus: row.usageStatus as NameCandidateRecord["usageStatus"],
    usageNote: row.usageNote,
    fitLabel: row.fitLabel as NameCandidateRecord["fitLabel"],
    rankingSignals,
    invented: Boolean(row.invented),
    originKind: row.originKind,
    territory: row.territory,
    trademarkSignal: row.trademarkSignal as NameCandidateRecord["trademarkSignal"],
    trademarkNote: row.trademarkNote,
    socialHandles: JSON.parse(row.socialHandles),
    linguistic: JSON.parse(row.linguistic),
    domainChecks: JSON.parse(row.domainChecks),
    usageEvidence: (rankingSignals.usageEvidence as NameCandidateRecord["usageEvidence"]) ?? [],
    queueIndex: row.queueIndex,
    active: Boolean(row.active),
    createdAt: row.createdAt,
  };
}

function toRanked(c: NameCandidateRecord): RankedCandidate {
  return {
    name: c.name,
    meaning: c.meaning,
    pronunciation: c.pronunciation,
    naming_style: c.style,
    rationale: c.rationale,
    distinctiveness: c.distinctiveness,
    confidence: Number(c.rankingSignals.score ?? 0.7),
    invented: c.invented,
    originKind: c.originKind as RankedCandidate["originKind"],
    territory: c.territory,
    usageStatus: c.usageStatus,
    usageNote: c.usageNote ?? undefined,
    fitLabel: c.fitLabel,
    domainChecks: c.domainChecks,
    trademarkSignal: c.trademarkSignal,
    trademarkNote: c.trademarkNote ?? undefined,
    socialHandles: c.socialHandles,
    linguistic: c.linguistic,
    rankingSignals: c.rankingSignals,
  };
}

export async function createSession(anonymousId: string, demo = false) {
  const db = getDb();
  const id = crypto.randomUUID();
  const ts = now();
  const answers: SessionAnswers = demo
    ? {
        namingType: "product",
        purpose: "A workspace for product teams to name and validate ideas",
        audience: "Founders and product designers",
        personality: ["intelligent", "minimal"],
        namingStyle: "invented_brandable",
      }
    : {};
  const preference = emptyPreference();
  await db.insert(namingSessions).values({
    id,
    anonymousId,
    namingType: answers.namingType ?? null,
    answers: JSON.stringify(answers),
    normalizedBrief: JSON.stringify(normalizeBrief(answers, preference)),
    status: demo ? "questions" : "type",
    preference: JSON.stringify(preference),
    queue: "[]",
    currentIndex: 0,
    exploredCount: 0,
    createdAt: ts,
    updatedAt: ts,
  });
  return getSession(id, anonymousId);
}

export async function getSession(id: string, anonymousId: string) {
  const db = getDb();
  const rows = await db.select().from(namingSessions).where(eq(namingSessions.id, id));
  const row = rows[0];
  if (!row || row.anonymousId !== anonymousId) return null;
  return parseSession(row);
}

async function saveSession(session: NamingSessionRecord) {
  const db = getDb();
  await db
    .update(namingSessions)
    .set({
      namingType: session.namingType,
      answers: JSON.stringify(session.answers),
      normalizedBrief: JSON.stringify(session.normalizedBrief),
      status: session.status,
      preference: JSON.stringify(session.preference),
      queue: JSON.stringify(session.queue),
      currentIndex: session.currentIndex,
      exploredCount: session.exploredCount,
      lastFeedbackId: session.lastFeedbackId,
      projectId: session.projectId,
      updatedAt: now(),
    })
    .where(eq(namingSessions.id, session.id));
}

export async function setNamingType(
  session: NamingSessionRecord,
  type: NamingType,
  otherLabel?: string,
) {
  if (!NAMING_TYPES.includes(type)) throw new Error("Invalid type");
  session.answers = pruneAnswersForType(
    { ...session.answers, namingType: type, otherLabel, generateNow: false },
    type,
  );
  session.namingType = type;
  session.status = "questions";
  session.normalizedBrief = normalizeBrief(session.answers, session.preference);
  await saveSession(session);
  return sessionPayload(session);
}

export async function submitAnswer(
  session: NamingSessionRecord,
  body: {
    questionId?: string;
    value?: unknown;
    generateNow?: boolean;
    skip?: boolean;
    noAutoGenerate?: boolean;
  },
) {
  if (body.skip && body.questionId) {
    const id = body.questionId as QuestionId;
    const catalog = questionCatalog(session.namingType, session.answers);
    const question = catalog.find((q) => q.id === id);
    if (question && !question.required && !session.answers.skipped?.includes(id)) {
      session.answers.skipped = [...(session.answers.skipped ?? []), id];
    }
  } else if (body.generateNow) {
    session.answers.generateNow = true;
  } else if (body.questionId === "purpose") {
    session.answers.purpose = String(body.value ?? "");
  } else if (body.questionId === "audience") {
    session.answers.audience = String(body.value ?? "");
  } else if (body.questionId === "industry") {
    session.answers.industry = String(body.value ?? "");
  } else if (body.questionId === "personality") {
    session.answers.personality = (Array.isArray(body.value) ? body.value : []) as Personality[];
  } else if (body.questionId === "naming_style") {
    session.answers.namingStyle = body.value as SessionAnswers["namingStyle"];
  } else if (body.questionId === "include") {
    session.answers.include = String(body.value ?? "");
  } else if (body.questionId === "avoid") {
    session.answers.avoid = String(body.value ?? "");
  } else if (body.questionId === "geography") {
    session.answers.geography = String(body.value ?? "");
  }

  session.normalizedBrief = normalizeBrief(session.answers, session.preference);
  if (
    !body.noAutoGenerate &&
    hasEnoughSignal(session.answers) &&
    (body.generateNow || !nextQuestion(session.answers))
  ) {
    session.status = "generating";
    await saveSession(session);
    await generateForSession(session);
    return sessionPayload(session);
  }
  await saveSession(session);
  return sessionPayload(session);
}

async function persistCandidates(sessionId: string, ranked: RankedCandidate[]) {
  const db = getDb();
  const ids: string[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const c = ranked[i];
    const id = crypto.randomUUID();
    ids.push(id);
    await db.insert(nameCandidates).values({
      id,
      sessionId,
      name: c.name,
      normalizedName: c.name.toLowerCase(),
      meaning: c.meaning,
      pronunciation: c.pronunciation,
      style: c.naming_style,
      rationale: c.rationale,
      distinctiveness: c.distinctiveness,
      usageStatus: c.usageStatus,
      usageNote: c.usageNote ?? null,
      fitLabel: c.fitLabel,
      rankingSignals: JSON.stringify({
        ...c.rankingSignals,
        usageEvidence: c.usageEvidence ?? [],
      }),
      invented: c.invented ? 1 : 0,
      originKind: c.originKind,
      territory: c.territory || "General",
      trademarkSignal: c.trademarkSignal,
      trademarkNote: c.trademarkNote ?? null,
      socialHandles: JSON.stringify(c.socialHandles),
      linguistic: JSON.stringify(c.linguistic),
      domainChecks: JSON.stringify(c.domainChecks),
      queueIndex: i,
      active: 1,
      createdAt: now(),
    });
    for (const d of c.domainChecks) {
      await db.insert(domainChecks).values({
        id: crypto.randomUUID(),
        candidateId: id,
        domain: d.domain,
        tld: d.tld,
        availability: d.availability,
        provider: d.provider,
        checkedAt: d.checkedAt,
        errorState: d.errorState ?? null,
      });
    }
  }
  return ids;
}

export async function generateForSession(session: NamingSessionRecord) {
  session.status = "generating";
  await saveSession(session);
  const ranked = await runGenerationPipeline(session.normalizedBrief, session.preference);
  const ids = await persistCandidates(session.id, ranked);
  session.queue = ids;
  session.currentIndex = 0;
  session.status = "deck";
  await saveSession(session);
  return session;
}

export async function regenerateSession(
  session: NamingSessionRecord,
  extras?: { steering?: string[]; conversation?: string[] },
) {
  const conversation = extras?.conversation?.flatMap((line) => parseConversation(line));
  session.normalizedBrief = normalizeBrief(session.answers, session.preference, {
    steering: extras?.steering,
    conversation,
  });
  const ranked = await runGenerationPipeline(session.normalizedBrief, session.preference);
  const db = getDb();
  await db
    .update(nameCandidates)
    .set({ active: 0 })
    .where(eq(nameCandidates.sessionId, session.id));
  const ids = await persistCandidates(session.id, ranked);
  session.queue = ids;
  session.currentIndex = 0;
  session.status = "deck";
  session.exploredCount = 0;
  await saveSession(session);
  return sessionPayload(session);
}

export async function listActiveCandidates(session: NamingSessionRecord) {
  const db = getDb();
  const rows = await db
    .select()
    .from(nameCandidates)
    .where(eq(nameCandidates.sessionId, session.id));
  const byId = new Map(rows.map((r) => [r.id, parseCandidate(r)]));
  return session.queue.map((id) => byId.get(id)).filter(Boolean) as NameCandidateRecord[];
}

export async function getCandidate(id: string, anonymousId: string) {
  const db = getDb();
  const rows = await db.select().from(nameCandidates).where(eq(nameCandidates.id, id));
  const row = rows[0];
  if (!row) return null;
  const session = await getSession(row.sessionId, anonymousId);
  if (!session) return null;
  return parseCandidate(row);
}

export async function recordFeedback(
  session: NamingSessionRecord,
  candidateId: string,
  action: FeedbackAction,
) {
  const db = getDb();
  if (action === "undo") {
    if (!session.lastFeedbackId) return sessionPayload(session);
    const lastRows = await db
      .select()
      .from(userFeedback)
      .where(eq(userFeedback.id, session.lastFeedbackId));
    const last = lastRows[0];
    if (!last || last.reversed) return sessionPayload(session);
    const candRows = await db
      .select()
      .from(nameCandidates)
      .where(eq(nameCandidates.id, last.candidateId));
    const cand = candRows[0] ? parseCandidate(candRows[0]) : null;
    if (cand) {
      session.preference = revertFeedback(
        session.preference,
        toRanked(cand),
        last.action as "like" | "dislike" | "save" | "skip",
      );
    }
    await db
      .update(userFeedback)
      .set({ reversed: 1 })
      .where(eq(userFeedback.id, last.id));
    session.currentIndex = Math.max(0, session.currentIndex - 1);
    session.exploredCount = Math.max(0, session.exploredCount - 1);
    session.lastFeedbackId = null;
    await saveSession(session);
    return sessionPayload(session);
  }

  const candRows = await db
    .select()
    .from(nameCandidates)
    .where(eq(nameCandidates.id, candidateId));
  const cand = candRows[0] ? parseCandidate(candRows[0]) : null;
  if (!cand) throw new Error("Candidate not found");

  const id = crypto.randomUUID();
  await db.insert(userFeedback).values({
    id,
    candidateId,
    sessionId: session.id,
    action,
    createdAt: now(),
    reversed: 0,
  });
  session.preference = applyFeedback(
    session.preference,
    toRanked(cand),
    action as "like" | "dislike" | "save" | "skip",
  );
  if (action === "save") {
    await db.insert(savedNames).values({
      id: crypto.randomUUID(),
      sessionId: session.id,
      candidateId,
      createdAt: now(),
    });
  }

  if (action !== "save") {
    const remainingIds = session.queue.slice(session.currentIndex + 1);
    const remaining = (await listActiveCandidates(session)).filter((c) =>
      remainingIds.includes(c.id),
    );
    const reordered = reorderQueue(
      remaining.map(toRanked),
      session.preference,
    );
    const idByName = new Map(remaining.map((c) => [c.name, c.id]));
    const newTail = reordered
      .map((c) => idByName.get(c.name))
      .filter(Boolean) as string[];
    session.queue = [
      ...session.queue.slice(0, session.currentIndex + 1),
      ...newTail,
    ];
    session.currentIndex += 1;
    session.exploredCount += 1;
  }

  session.lastFeedbackId = id;
  if (session.currentIndex >= session.queue.length) session.status = "shortlist";
  await saveSession(session);
  logTelemetry("feedback", { action, sessionId: session.id });
  return sessionPayload(session);
}

export async function savedForSession(sessionId: string) {
  const db = getDb();
  const saved = await db.select().from(savedNames).where(eq(savedNames.sessionId, sessionId));
  const all = await db
    .select()
    .from(nameCandidates)
    .where(eq(nameCandidates.sessionId, sessionId));
  const map = new Map(all.map((r) => [r.id, parseCandidate(r)]));
  return saved
    .map((s) => map.get(s.candidateId))
    .filter(Boolean) as NameCandidateRecord[];
}

export async function likedForSession(session: NamingSessionRecord) {
  const db = getDb();
  const fb = await db
    .select()
    .from(userFeedback)
    .where(eq(userFeedback.sessionId, session.id));
  const ids = fb
    .filter((f) => !f.reversed && (f.action === "like" || f.action === "save"))
    .map((f) => f.candidateId);
  const all = await listActiveCandidates(session);
  const byId = new Map((await getDb().select().from(nameCandidates).where(eq(nameCandidates.sessionId, session.id))).map((r) => [r.id, parseCandidate(r)]));
  void all;
  return ids.map((id) => byId.get(id)).filter(Boolean) as NameCandidateRecord[];
}

export async function sessionPayload(session: NamingSessionRecord) {
  const candidates = await listActiveCandidates(session);
  const saved = await savedForSession(session.id);
  const liked = await likedForSession(session);
  return {
    session,
    question: nextQuestion(session.answers),
    answeredQuestions: answeredQuestions(session.answers),
    confidence: generationConfidence(session.answers),
    enough: hasEnoughSignal(session.answers),
    candidates,
    current: candidates[session.currentIndex] ?? null,
    upcoming: candidates.slice(session.currentIndex + 1, session.currentIndex + 3),
    saved,
    liked,
    territories: groupTerritories(saved.length ? saved : candidates),
  };
}

function groupTerritories(items: NameCandidateRecord[]) {
  const map = new Map<string, NameCandidateRecord[]>();
  for (const item of items) {
    const key = item.territory || "General";
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()].map(([territory, names]) => ({ territory, names }));
}

export function healthReport(candidate: NameCandidateRecord) {
  const available = candidate.domainChecks.filter((d) => d.availability === "available");
  const taken = candidate.domainChecks.filter((d) => d.availability === "taken");
  const strengths: string[] = [
    `${candidate.fitLabel} for the current brief.`,
    `Pronunciation: ${candidate.pronunciation}.`,
  ];
  if (candidate.distinctiveness === "High") strengths.push("High distinctiveness.");
  if (available.length) strengths.push(`${available.length} TLDs look available in the latest check.`);

  const risks: string[] = [];
  if (candidate.usageStatus === "detected") risks.push(candidate.usageNote || "Existing usage detected.");
  if (candidate.trademarkSignal === "potential_conflict") {
    risks.push(candidate.trademarkNote || "Potential trademark conflict.");
  }
  if (candidate.linguistic.offensiveRisk !== "none") {
    risks.push("Possible unintended or sensitive interpretation.");
  }
  risks.push("This is not legal clearance or a guarantee of availability.");

  let recommendation: "Strong candidate" | "Worth shortlisting" | "Significant conflicts detected" =
    "Worth shortlisting";
  if (candidate.usageStatus === "detected" || candidate.trademarkSignal === "potential_conflict") {
    recommendation = "Significant conflicts detected";
  } else if (candidate.fitLabel === "Excellent fit" || candidate.fitLabel === "Strong fit") {
    recommendation = "Strong candidate";
  }

  return {
    candidateId: candidate.id,
    name: candidate.name,
    recommendation,
    strengths,
    risks,
    domains: { available, taken },
    trademark: candidate.trademarkNote,
    social: candidate.socialHandles,
    linguistic: candidate.linguistic,
    freshness: candidate.domainChecks[0]?.checkedAt,
  };
}

export async function createProject(session: NamingSessionRecord, title: string) {
  const db = getDb();
  const id = crypto.randomUUID();
  const ts = now();
  await db.insert(namingProjects).values({
    id,
    anonymousId: session.anonymousId,
    sessionId: session.id,
    title,
    createdAt: ts,
    updatedAt: ts,
  });
  session.projectId = id;
  await saveSession(session);
  return getProject(id, session.anonymousId);
}

export async function getProject(id: string, anonymousId: string) {
  const db = getDb();
  const rows = await db.select().from(namingProjects).where(eq(namingProjects.id, id));
  const project = rows[0];
  if (!project || project.anonymousId !== anonymousId) return null;
  const session = await getSession(project.sessionId, anonymousId);
  const comments = await db
    .select()
    .from(projectComments)
    .where(eq(projectComments.projectId, id));
  const votes = await db.select().from(projectVotes).where(eq(projectVotes.projectId, id));
  const saved = session ? await savedForSession(session.id) : [];
  return { project, session, comments, votes, saved };
}

export async function addComment(projectId: string, anonymousId: string, author: string, body: string) {
  const project = await getProject(projectId, anonymousId);
  if (!project) return null;
  const db = getDb();
  await db.insert(projectComments).values({
    id: crypto.randomUUID(),
    projectId,
    author: author || "Teammate",
    body,
    createdAt: now(),
  });
  return getProject(projectId, anonymousId);
}

export async function addVote(
  projectId: string,
  anonymousId: string,
  candidateId: string,
  voter: string,
  value: number,
) {
  const project = await getProject(projectId, anonymousId);
  if (!project) return null;
  const db = getDb();
  await db.insert(projectVotes).values({
    id: crypto.randomUUID(),
    projectId,
    candidateId,
    voter: voter || "Teammate",
    value,
    createdAt: now(),
  });
  return getProject(projectId, anonymousId);
}

export function exportProjectMarkdown(payload: NonNullable<Awaited<ReturnType<typeof getProject>>>) {
  const lines = [
    `# ${payload.project.title}`,
    "",
    `Session: ${payload.project.sessionId}`,
    "",
    "## Brief",
    "```json",
    JSON.stringify(payload.session?.normalizedBrief ?? {}, null, 2),
    "```",
    "",
    "## Shortlist",
    ...payload.saved.map(
      (s) => `- **${s.name}** — ${s.fitLabel}. ${s.meaning}`,
    ),
    "",
    "## Comments",
    ...payload.comments.map((c) => `- ${c.author}: ${c.body}`),
    "",
    "## Votes",
    ...payload.votes.map((v) => `- ${v.voter}: ${v.value} on ${v.candidateId}`),
  ];
  return lines.join("\n");
}
