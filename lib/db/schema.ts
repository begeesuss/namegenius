import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const namingSessions = sqliteTable("naming_sessions", {
  id: text("id").primaryKey(),
  anonymousId: text("anonymous_id").notNull(),
  userId: text("user_id"),
  namingType: text("naming_type"),
  answers: text("answers").notNull(),
  normalizedBrief: text("normalized_brief").notNull(),
  status: text("status").notNull(),
  preference: text("preference").notNull(),
  queue: text("queue").notNull(),
  currentIndex: integer("current_index").notNull().default(0),
  exploredCount: integer("explored_count").notNull().default(0),
  lastFeedbackId: text("last_feedback_id"),
  projectId: text("project_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const nameCandidates = sqliteTable("name_candidates", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  meaning: text("meaning").notNull(),
  pronunciation: text("pronunciation").notNull(),
  style: text("style").notNull(),
  rationale: text("rationale").notNull(),
  distinctiveness: text("distinctiveness").notNull(),
  usageStatus: text("usage_status").notNull(),
  usageNote: text("usage_note"),
  fitLabel: text("fit_label").notNull(),
  rankingSignals: text("ranking_signals").notNull(),
  invented: integer("invented").notNull().default(0),
  originKind: text("origin_kind").notNull(),
  territory: text("territory").notNull(),
  trademarkSignal: text("trademark_signal").notNull(),
  trademarkNote: text("trademark_note"),
  socialHandles: text("social_handles").notNull(),
  linguistic: text("linguistic").notNull(),
  domainChecks: text("domain_checks").notNull(),
  queueIndex: integer("queue_index").notNull().default(0),
  active: integer("active").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

export const domainChecks = sqliteTable("domain_checks", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  domain: text("domain").notNull(),
  tld: text("tld").notNull(),
  availability: text("availability").notNull(),
  provider: text("provider").notNull(),
  checkedAt: text("checked_at").notNull(),
  errorState: text("error_state"),
});

export const userFeedback = sqliteTable("user_feedback", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull(),
  sessionId: text("session_id").notNull(),
  action: text("action").notNull(),
  createdAt: text("created_at").notNull(),
  reversed: integer("reversed").notNull().default(0),
});

export const savedNames = sqliteTable("saved_names", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  candidateId: text("candidate_id").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const namingProjects = sqliteTable("naming_projects", {
  id: text("id").primaryKey(),
  anonymousId: text("anonymous_id").notNull(),
  sessionId: text("session_id").notNull(),
  title: text("title").notNull(),
  decision: text("decision"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const projectComments = sqliteTable("project_comments", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

export const projectVotes = sqliteTable("project_votes", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  candidateId: text("candidate_id").notNull(),
  voter: text("voter").notNull(),
  value: integer("value").notNull(),
  createdAt: text("created_at").notNull(),
});
