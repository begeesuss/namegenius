import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let sqlite: Database.Database | null = null;

function getSqlite() {
  if (!sqlite) {
    const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    sqlite = new Database(path.join(dir, "namegenius.db"));
    sqlite.pragma("journal_mode = WAL");
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS naming_sessions (
        id TEXT PRIMARY KEY,
        anonymous_id TEXT NOT NULL,
        user_id TEXT,
        naming_type TEXT,
        answers TEXT NOT NULL,
        normalized_brief TEXT NOT NULL,
        status TEXT NOT NULL,
        preference TEXT NOT NULL,
        queue TEXT NOT NULL,
        current_index INTEGER NOT NULL DEFAULT 0,
        explored_count INTEGER NOT NULL DEFAULT 0,
        last_feedback_id TEXT,
        project_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS name_candidates (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        meaning TEXT NOT NULL,
        pronunciation TEXT NOT NULL,
        style TEXT NOT NULL,
        rationale TEXT NOT NULL,
        distinctiveness TEXT NOT NULL,
        usage_status TEXT NOT NULL,
        usage_note TEXT,
        fit_label TEXT NOT NULL,
        ranking_signals TEXT NOT NULL,
        invented INTEGER NOT NULL DEFAULT 0,
        origin_kind TEXT NOT NULL,
        territory TEXT NOT NULL,
        trademark_signal TEXT NOT NULL,
        trademark_note TEXT,
        social_handles TEXT NOT NULL,
        linguistic TEXT NOT NULL,
        domain_checks TEXT NOT NULL,
        queue_index INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS domain_checks (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        tld TEXT NOT NULL,
        availability TEXT NOT NULL,
        provider TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        error_state TEXT
      );
      CREATE TABLE IF NOT EXISTS user_feedback (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL,
        reversed INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS saved_names (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS naming_projects (
        id TEXT PRIMARY KEY,
        anonymous_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        title TEXT NOT NULL,
        decision TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_comments (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        author TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS project_votes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        voter TEXT NOT NULL,
        value INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }
  return sqlite;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}
