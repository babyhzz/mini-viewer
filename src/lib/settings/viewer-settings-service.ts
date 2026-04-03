import {
  createDefaultViewerSettings,
  normalizeViewerSettings,
} from "@/lib/settings/overlay";
import {
  readSettingDocument,
  writeSettingDocument,
} from "@/lib/settings/settings-repository";
import type { ViewerSettings } from "@/types/settings";

const VIEWER_SETTINGS_KEY = "viewer.preferences";

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
