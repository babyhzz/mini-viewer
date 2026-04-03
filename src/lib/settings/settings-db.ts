import { mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const SETTINGS_STORAGE_DIR = path.join(process.cwd(), "storage");
const SETTINGS_DB_PATH = path.join(SETTINGS_STORAGE_DIR, "viewer-settings.sqlite");

let database: Database.Database | null = null;

export function getSettingsDatabase() {
  if (database) {
    return database;
  }

  mkdirSync(SETTINGS_STORAGE_DIR, { recursive: true });
  database = new Database(SETTINGS_DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL DEFAULT '',
      setting_key TEXT NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 1,
      value_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (scope_type, scope_id, setting_key)
    );
  `);

  return database;
}
