import type {
  AnsweredQuestion,
  NamingType,
  NormalizedBrief,
  PreferenceProfile,
  QuestionId,
  QuestionView,
  SessionAnswers,
} from "@/lib/types";
import { STYLE_CARDS } from "@/lib/types";

export function emptyPreference(): PreferenceProfile {
  return {
    likedStyles: {},
    dislikedStyles: {},
    likedLengths: [],
    dislikedLengths: [],
    likedTerritories: {},
    dislikedTerritories: {},
    likedNames: [],
    dislikedNames: [],
    savedNames: [],
    interactionCount: 0,
    confidence: 0,
  };
}

export function normalizeBrief(
  answers: SessionAnswers,
  preference: PreferenceProfile,
  extras?: { steering?: string[]; conversation?: string[] },
): NormalizedBrief {
  return {
    namingType: answers.namingType ?? null,
    otherLabel: answers.otherLabel,
    purpose: answers.purpose?.trim() || undefined,
    audience: answers.audience?.trim() || undefined,
    industry: answers.industry?.trim() || undefined,
    personality: answers.personality ?? [],
    namingStyle: answers.namingStyle,
    include: answers.include?.trim() || undefined,
    avoid: answers.avoid?.trim() || undefined,
    geography: answers.geography?.trim() || undefined,
    likedNames: preference.likedNames,
    dislikedNames: preference.dislikedNames,
    savedNames: preference.savedNames,
    steering: extras?.steering,
    conversation: extras?.conversation,
  };
}

export function needsIndustry(type?: NamingType | null) {
  return (
    type === "company" ||
    type === "product" ||
    type === "brand" ||
    type === "website" ||
    type === "app"
  );
}

export function needsGeography(type?: NamingType | null) {
  return (
    type === "company" ||
    type === "website" ||
    type === "brand" ||
    type === "community"
  );
}

const AUDIENCE_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bfreelancers?\b/i, label: "Freelancers" },
  { pattern: /\bfounders?\b/i, label: "Founders" },
  { pattern: /\bdevelopers?\b/i, label: "Developers" },
  { pattern: /\bdesigners?\b/i, label: "Designers" },
  { pattern: /\bengineers?\b/i, label: "Engineers" },
  { pattern: /\bmarketers?\b/i, label: "Marketers" },
  { pattern: /\bstudents?\b/i, label: "Students" },
  { pattern: /\b(teachers?|educators?)\b/i, label: "Educators" },
  { pattern: /\b(agencies|agency)\b/i, label: "Agencies" },
  { pattern: /\b(nonprofits?|non-profits?)\b/i, label: "Nonprofits" },
  { pattern: /\bparents?\b/i, label: "Parents" },
  { pattern: /\bgamers?\b/i, label: "Gamers" },
  { pattern: /\bartists?\b/i, label: "Artists" },
  { pattern: /\bmusicians?\b/i, label: "Musicians" },
  { pattern: /\b(doctors?|clinicians?)\b/i, label: "Healthcare providers" },
  { pattern: /\b(lawyers?|attorneys?)\b/i, label: "Lawyers" },
  { pattern: /\baccountants?\b/i, label: "Accountants" },
  { pattern: /\bconsultants?\b/i, label: "Consultants" },
  { pattern: /\bremote teams?\b/i, label: "Remote teams" },
  { pattern: /\binvestors?\b/i, label: "Investors" },
  { pattern: /\bsmall business(es)?\b/i, label: "Small businesses" },
  { pattern: /\bcreators?\b/i, label: "Creators" },
  { pattern: /\benterprises?\b/i, label: "Enterprises" },
  { pattern: /\bconsumers?\b/i, label: "Consumers" },
];

const INDUSTRY_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(invoice|invoicing|billing|payments?|banking|finance|financial)\b/i, label: "Fintech" },
  { pattern: /\b(fitness|workout|wellness|health|medical|clinic|therapy|nutrition)\b/i, label: "Health & wellness" },
  { pattern: /\b(learn|course|courses|students?|teach|teaching|education|school|tutor(ing)?)\b/i, label: "Education" },
  { pattern: /\b(shop|store|sell|selling|retail|e-?commerce|cart|checkout)\b/i, label: "E-commerce" },
  { pattern: /\b(code|coding|developers?|\bapi\b|sdk|engineering|programming)\b/i, label: "Developer tools" },
  { pattern: /\b(saas|software|platform|dashboard|workspace)\b/i, label: "SaaS" },
  { pattern: /\b(video|videos|gaming?|music|podcast|media|streaming|content)\b/i, label: "Media" },
  { pattern: /\b(consumer|everyday|household)\b/i, label: "Consumer" },
];

const GEOGRAPHY_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bindia\b/i, label: "India" },
  { pattern: /\b(us|usa|america|united states)\b/i, label: "United States" },
  { pattern: /\beurope(an)?\b/i, label: "Europe" },
  { pattern: /\b(global|worldwide|international)\b/i, label: "Global / English" },
  { pattern: /\bmultilingual\b/i, label: "Multilingual" },
];

function suggestFromText(
  text: string | undefined,
  keywordMap: { pattern: RegExp; label: string }[],
  limit = 3,
): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const { pattern, label } of keywordMap) {
    if (pattern.test(text) && !found.includes(label)) {
      found.push(label);
    }
  }
  return found.slice(0, limit);
}

export function questionCatalog(type?: NamingType | null, answers?: SessionAnswers): QuestionView[] {
  const baseAudiencePicks = ["Founders", "Developers", "Consumers", "Small businesses", "Enterprises", "Creators"];
  const catalog: QuestionView[] = [
    {
      id: "purpose",
      eyebrow: "Purpose",
      title: "What does it do?",
      helper: "One sentence, plainly put.",
      placeholder: "e.g. Helps freelancers invoice clients and get paid on time",
      kind: "text",
      required: true,
      canGenerateNow: false,
    },
    {
      id: "audience",
      eyebrow: "Audience",
      title: "Who is it for?",
      helper: "Whoever should feel this name is speaking to them.",
      placeholder: "e.g. Early-stage founders",
      kind: "text",
      required: true,
      canGenerateNow: true,
      quickPicks: baseAudiencePicks,
      smartPicks: suggestFromText(answers?.purpose, AUDIENCE_KEYWORDS),
      quickPickMode: "toggle",
    },
    {
      id: "personality",
      eyebrow: "Personality",
      title: "What personality should the name carry?",
      helper: "Pick a few — this steers tone, it doesn't filter results.",
      kind: "multi_chips",
      required: false,
      options: [
        { id: "premium", label: "Premium" },
        { id: "friendly", label: "Friendly" },
        { id: "bold", label: "Bold" },
        { id: "intelligent", label: "Intelligent" },
        { id: "playful", label: "Playful" },
        { id: "technical", label: "Technical" },
        { id: "minimal", label: "Minimal" },
        { id: "trustworthy", label: "Trustworthy" },
        { id: "futuristic", label: "Futuristic" },
      ],
      canGenerateNow: true,
    },
  ];

  if (needsIndustry(type)) {
    catalog.push({
      id: "industry",
      eyebrow: "Category",
      title: "Which category is this in?",
      helper: "Helps us dodge names that already crowd this space.",
      placeholder: "e.g. Fintech",
      kind: "text",
      required: false,
      canGenerateNow: true,
      quickPicks: ["SaaS", "Fintech", "Health & wellness", "Consumer", "Developer tools", "E-commerce", "Education", "Media"],
      smartPicks: suggestFromText(answers?.purpose, INDUSTRY_KEYWORDS),
      quickPickMode: "set",
    });
  }

  catalog.push({
    id: "naming_style",
    eyebrow: "Style",
    title: "Any naming style you want to explore?",
    helper: "Not rules — just a direction, if you have one.",
    kind: "style_cards",
    required: false,
    canGenerateNow: true,
  });

  catalog.push({
    id: "include",
    eyebrow: "Ingredients",
    title: "Any words or ideas to include?",
    helper: "Concepts or roots to weave in, not exact names.",
    placeholder: "e.g. light, motion, trust",
    kind: "text",
    required: false,
    canGenerateNow: true,
  });

  catalog.push({
    id: "avoid",
    eyebrow: "Off-limits",
    title: "Anything to avoid?",
    helper: "Anything that would make a name a dealbreaker.",
    placeholder: "e.g. numbers, hyphens",
    kind: "text",
    required: false,
    canGenerateNow: true,
    quickPicks: ["Numbers", "Hyphens", "Hard to spell", "Generic words", "Slang"],
    quickPickMode: "toggle",
  });

  if (needsGeography(type)) {
    catalog.push({
      id: "geography",
      eyebrow: "Geography",
      title: "Where will this live?",
      helper: "Only matters if it changes how the name sounds or reads.",
      placeholder: "e.g. Global, English-speaking",
      kind: "text",
      required: false,
      canGenerateNow: true,
      quickPicks: ["Global / English", "United States", "Europe", "India", "Multilingual"],
      smartPicks: suggestFromText(
        [answers?.purpose, answers?.audience].filter(Boolean).join(" "),
        GEOGRAPHY_KEYWORDS,
      ),
      quickPickMode: "set",
    });
  }

  return catalog;
}

function isAnswered(answers: SessionAnswers, id: QuestionId) {
  if (answers.skipped?.includes(id)) return true;
  switch (id) {
    case "purpose":
      return Boolean(answers.purpose?.trim());
    case "audience":
      return Boolean(answers.audience?.trim());
    case "industry":
      return Boolean(answers.industry?.trim());
    case "personality":
      return Boolean(answers.personality?.length);
    case "naming_style":
      return Boolean(answers.namingStyle);
    case "include":
      return Boolean(answers.include?.trim());
    case "avoid":
      return Boolean(answers.avoid?.trim());
    case "geography":
      return Boolean(answers.geography?.trim());
  }
}

function displayValueFor(answers: SessionAnswers, question: QuestionView): string {
  switch (question.id) {
    case "purpose":
      return answers.purpose?.trim() ?? "";
    case "audience":
      return answers.audience?.trim() ?? "";
    case "industry":
      return answers.industry?.trim() ?? "";
    case "include":
      return answers.include?.trim() ?? "";
    case "avoid":
      return answers.avoid?.trim() ?? "";
    case "geography":
      return answers.geography?.trim() ?? "";
    case "personality": {
      const ids = answers.personality ?? [];
      const labels = ids.map(
        (id) => question.options?.find((o) => o.id === id)?.label ?? id,
      );
      return labels.join(", ");
    }
    case "naming_style":
      return STYLE_CARDS.find((s) => s.id === answers.namingStyle)?.title ?? "";
  }
}

export function answeredQuestions(answers: SessionAnswers): AnsweredQuestion[] {
  if (!answers.namingType) return [];
  const catalog = questionCatalog(answers.namingType, answers);
  const out: AnsweredQuestion[] = [];
  for (const question of catalog) {
    if (!isAnswered(answers, question.id)) break;
    const skipped = Boolean(answers.skipped?.includes(question.id));
    out.push({
      ...question,
      skipped,
      displayValue: skipped ? "" : displayValueFor(answers, question),
    });
  }
  return out;
}

export function generationConfidence(answers: SessionAnswers) {
  let score = 0;
  if (answers.namingType) score += 0.2;
  if (answers.purpose?.trim()) score += 0.35;
  if (answers.audience?.trim()) score += 0.2;
  if (answers.personality?.length) score += 0.15;
  if (answers.namingStyle && answers.namingStyle !== "no_preference") score += 0.1;
  if (answers.industry?.trim()) score += 0.05;
  return Math.min(1, score);
}

export function hasEnoughSignal(answers: SessionAnswers) {
  if (answers.generateNow && answers.purpose?.trim()) return true;
  return (
    Boolean(answers.namingType) &&
    Boolean(answers.purpose?.trim()) &&
    (Boolean(answers.audience?.trim()) || Boolean(answers.personality?.length))
  );
}

export function nextQuestion(answers: SessionAnswers): QuestionView | null {
  if (!answers.namingType) return null;
  if (hasEnoughSignal(answers) && answers.generateNow) return null;
  const catalog = questionCatalog(answers.namingType, answers);
  const unanswered = catalog.filter((q) => !isAnswered(answers, q.id));
  if (unanswered.length === 0) return null;
  const chosen = hasEnoughSignal(answers)
    ? (unanswered.find((q) => !q.required) ?? null)
    : unanswered[0];
  if (!chosen) return null;
  const stepIndex = catalog.findIndex((q) => q.id === chosen.id) + 1;
  return { ...chosen, stepIndex, totalSteps: catalog.length };
}

export function pruneAnswersForType(
  answers: SessionAnswers,
  type: NamingType,
): SessionAnswers {
  const next = { ...answers, namingType: type };
  if (!needsIndustry(type)) delete next.industry;
  if (!needsGeography(type)) delete next.geography;
  return next;
}
