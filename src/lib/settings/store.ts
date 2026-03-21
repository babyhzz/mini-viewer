import { mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import {
  createDefaultViewerSettings,
  normalizeViewerSettings,
} from "@/lib/settings/overlay";
import type { ViewerSettings } from "@/types/settings";

const SETTINGS_STORAGE_DIR = path.join(process.cwd(), "storage");
const SETTINGS_DB_PATH = path.join(SETTINGS_STORAGE_DIR, "viewer-settings.sqlite");
const SETTINGS_SCOPE_TYPE = "global";
const SETTINGS_SCOPE_ID = "";
const VIEWER_SETTINGS_KEY = "viewer.preferences";

let database: Database.Database | null = null;

function getDatabase() {
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

function readSettingDocument(settingKey: string) {
  return getDatabase()
    .prepare(
      `
        SELECT value_json
        FROM app_settings
        WHERE scope_type = ?
          AND scope_id = ?
          AND setting_key = ?
      `,
    )
    .get(SETTINGS_SCOPE_TYPE, SETTINGS_SCOPE_ID, settingKey) as
    | { value_json: string }
    | undefined;
}

function writeSettingDocument(
  settingKey: string,
  schemaVersion: number,
  value: unknown,
) {
  const timestamp = new Date().toISOString();

  getDatabase()
    .prepare(
      `
        INSERT INTO app_settings (
          scope_type,
          scope_id,
          setting_key,
          schema_version,
          value_json,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(scope_type, scope_id, setting_key)
        DO UPDATE SET
          schema_version = excluded.schema_version,
          value_json = excluded.value_json,
          updated_at = excluded.updated_at
      `,
    )
    .run(
      SETTINGS_SCOPE_TYPE,
      SETTINGS_SCOPE_ID,
      settingKey,
      schemaVersion,
      JSON.stringify(value),
      timestamp,
      timestamp,
    );
}

export function readViewerSettings(): ViewerSettings {
  const storedDocument = readSettingDocument(VIEWER_SETTINGS_KEY);

  if (!storedDocument) {
    return createDefaultViewerSettings();
  }

  try {
    const parsed = JSON.parse(storedDocument.value_json) as unknown;
    return normalizeViewerSettings(parsed);
  } catch (error) {
    console.warn("Failed to parse persisted viewer settings", error);
    return createDefaultViewerSettings();
  }
}

export function writeViewerSettings(settings: ViewerSettings) {
  const normalizedSettings = normalizeViewerSettings(settings);

  writeSettingDocument(
    VIEWER_SETTINGS_KEY,
    normalizedSettings.schemaVersion,
    normalizedSettings,
  );

  return normalizedSettings;
}
