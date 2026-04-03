import { getSettingsDatabase } from "@/lib/settings/settings-db";

const SETTINGS_SCOPE_TYPE = "global";
const SETTINGS_SCOPE_ID = "";

export function readSettingDocument(settingKey: string) {
  return getSettingsDatabase()
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

export function writeSettingDocument(
  settingKey: string,
  schemaVersion: number,
  value: unknown,
) {
  const timestamp = new Date().toISOString();

  getSettingsDatabase()
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
