export const NAMING_TYPES = [
  "company",
  "product",
  "feature",
  "website",
  "app",
  "project",
  "brand",
  "community",
  "other",
] as const;

export type NamingType = (typeof NAMING_TYPES)[number];

export const NAMING_TYPE_LABELS: Record<NamingType, string> = {
  company: "Company",
  product: "Product",
  feature: "Feature",
  website: "Website",
  app: "App",
  project: "Project",
  brand: "Brand",
  community: "Community",
  other: "Other",
};

export const PERSONALITIES = [
  "premium",
  "friendly",
  "bold",
  "intelligent",
  "playful",
  "technical",
  "minimal",
  "trustworthy",
  "futuristic",
] as const;

export type Personality = (typeof PERSONALITIES)[number];

export const NAMING_STYLES = [
  "real_meaningful",
  "invented_brandable",
  "descriptive",
  "compound",
  "short_abstract",
  "no_preference",
] as const;

export type NamingStyle = (typeof NAMING_STYLES)[number];

export const STYLE_CARDS: {
  id: NamingStyle;
  title: string;
  examples: string;
  description: string;
}[] = [
  {
    id: "real_meaningful",
    title: "Real & meaningful",
    examples: "Notion, Stripe",
    description: "Existing or evocative words with a clear idea behind them.",
  },
  {
    id: "invented_brandable",
    title: "Invented & brandable",
    examples: "Kodak, Spotify",
    description: "Coined names that can become distinctive brands.",
  },
  {
    id: "descriptive",
    title: "Descriptive",
    examples: "Dropbox",
    description: "Says what it is, quickly and plainly.",
  },
  {
    id: "compound",
    title: "Compound",
    examples: "Snapchat, YouTube",
    description: "Two ideas joined into one memorable name.",
  },
  {
    id: "short_abstract",
    title: "Short & abstract",
    examples: "Lyft",
    description: "Short, punchy, and more about feel than literal meaning.",
  },
  {
    id: "no_preference",
    title: "No preference",
    examples: "Let Name Genius decide",
    description: "We will mix territories so you can discover what fits.",
  },
];

export type QuestionId =
  | "purpose"
  | "audience"
  | "industry"
  | "personality"
  | "naming_style"
  | "include"
  | "avoid"
  | "geography";

export type SessionStatus =
  | "type"
  | "questions"
  | "generating"
  | "deck"
  | "shortlist";

export type FitLabel =
  | "Excellent fit"
  | "Strong fit"
  | "Worth considering"
  | "Existing usage detected";

export type Distinctiveness = "High" | "Medium" | "Low";

export type UsageStatus =
  | "clear"
  | "detected"
  | "unavailable"
  | "unchecked";

export type DomainAvailability = "available" | "taken" | "unavailable";

export type FeedbackAction = "like" | "dislike" | "save" | "skip" | "undo";

export type TrademarkSignal =
  | "potential_conflict"
  | "low_apparent_conflict"
  | "unavailable";

export interface DomainCheckResult {
  domain: string;
  tld: string;
  availability: DomainAvailability;
  provider: string;
  checkedAt: string;
  errorState?: string | null;
  alternatives?: string[];
}

export interface SocialHandleResult {
  platform: string;
  handle: string;
  status: "available" | "taken" | "unavailable_to_check";
}

export interface LinguisticFlags {
  pronunciationDifficulty: "easy" | "moderate" | "hard";
  unintendedMeanings: string[];
  offensiveRisk: "none" | "possible" | "high";
  crossLanguageNotes: string[];
}

export interface GeneratedCandidate {
  name: string;
  meaning: string;
  pronunciation: string;
  naming_style: string;
  rationale: string;
  distinctiveness: Distinctiveness;
  confidence: number;
  invented: boolean;
  originKind: "invented" | "inspired" | "existing_word";
  territory?: string;
}

export interface RankedCandidate extends GeneratedCandidate {
  usageStatus: UsageStatus;
  usageNote?: string;
  fitLabel: FitLabel;
  domainChecks: DomainCheckResult[];
  trademarkSignal: TrademarkSignal;
  trademarkNote?: string;
  socialHandles: SocialHandleResult[];
  linguistic: LinguisticFlags;
  rankingSignals: Record<string, unknown>;
  usageEvidence?: { title: string; why: string }[];
}

export interface SessionAnswers {
  namingType?: NamingType;
  otherLabel?: string;
  purpose?: string;
  audience?: string;
  industry?: string;
  personality?: Personality[];
  namingStyle?: NamingStyle;
  include?: string;
  avoid?: string;
  geography?: string;
  generateNow?: boolean;
  skipped?: QuestionId[];
}

export interface PreferenceProfile {
  likedStyles: Record<string, number>;
  dislikedStyles: Record<string, number>;
  likedLengths: number[];
  dislikedLengths: number[];
  likedTerritories: Record<string, number>;
  dislikedTerritories: Record<string, number>;
  likedNames: string[];
  dislikedNames: string[];
  savedNames: string[];
  interactionCount: number;
  confidence: number;
}

export interface NormalizedBrief {
  namingType: NamingType | null;
  otherLabel?: string;
  purpose?: string;
  audience?: string;
  industry?: string;
  personality: Personality[];
  namingStyle?: NamingStyle;
  include?: string;
  avoid?: string;
  geography?: string;
  likedNames: string[];
  dislikedNames: string[];
  savedNames: string[];
  steering?: string[];
  conversation?: string[];
}

export interface QuestionView {
  id: QuestionId;
  title: string;
  helper: string;
  kind: "text" | "chips" | "multi_chips" | "style_cards";
  required: boolean;
  options?: { id: string; label: string }[];
  canGenerateNow: boolean;
  stepIndex?: number;
  totalSteps?: number;
  eyebrow?: string;
  placeholder?: string;
  quickPicks?: string[];
  smartPicks?: string[];
  quickPickMode?: "set" | "toggle";
}

export interface AnsweredQuestion extends QuestionView {
  skipped: boolean;
  displayValue: string;
}

export interface NameCandidateRecord {
  id: string;
  sessionId: string;
  name: string;
  normalizedName: string;
  meaning: string;
  pronunciation: string;
  style: string;
  rationale: string;
  distinctiveness: Distinctiveness;
  usageStatus: UsageStatus;
  usageNote?: string | null;
  fitLabel: FitLabel;
  rankingSignals: Record<string, unknown>;
  invented: boolean;
  originKind: string;
  territory: string;
  trademarkSignal: TrademarkSignal;
  trademarkNote?: string | null;
  socialHandles: SocialHandleResult[];
  linguistic: LinguisticFlags;
  usageEvidence?: { title: string; why: string }[];
  domainChecks: DomainCheckResult[];
  queueIndex: number;
  active: boolean;
  createdAt: string;
}

export interface NamingSessionRecord {
  id: string;
  anonymousId: string;
  userId?: string | null;
  namingType: NamingType | null;
  answers: SessionAnswers;
  normalizedBrief: NormalizedBrief;
  status: SessionStatus;
  preference: PreferenceProfile;
  queue: string[];
  currentIndex: number;
  exploredCount: number;
  lastFeedbackId?: string | null;
  projectId?: string | null;
  createdAt: string;
  updatedAt: string;
}
