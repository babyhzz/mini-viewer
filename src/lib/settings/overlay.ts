import type {
  OverlayCornerItemConfig,
  OverlayFontWeight,
  OverlayTagKey,
  OverlayTextStyle,
  ViewerMprProjectionSettings,
  ViewerSettings,
  ViewportCorner,
  ViewportOverlaySettings,
} from "@/types/settings";
import {
  createDefaultToolbarShortcutSettings,
  normalizeToolbarShortcutSettings,
} from "@/lib/settings/shortcuts";
import {
  DEFAULT_VIEWPORT_MPR_SLAB_STATE,
  normalizeViewportMprSlabState,
  type ViewportMprSlabState,
} from "@/lib/viewports/mpr-slab";

export interface OverlayTagDefinition {
  key: OverlayTagKey;
  label: string;
  description: string;
}

export const VIEWPORT_CORNER_LABELS: Record<ViewportCorner, string> = {
  topLeft: "左上角",
  topRight: "右上角",
  bottomLeft: "左下角",
  bottomRight: "右下角",
};

export const OVERLAY_TAG_DEFINITIONS: OverlayTagDefinition[] = [
  {
    key: "patientName",
    label: "患者姓名",
    description: "检查所属患者姓名",
  },
  {
    key: "patientId",
    label: "患者 ID",
    description: "患者标识符",
  },
  {
    key: "studyTitle",
    label: "检查标题",
    description: "Study Description",
  },
  {
    key: "studyDate",
    label: "检查日期",
    description: "Study Date",
  },
  {
    key: "seriesTitle",
    label: "序列标题",
    description: "Series Description",
  },
  {
    key: "modalitySummary",
    label: "模态摘要",
    description: "模态和序列号摘要",
  },
  {
    key: "frameProgress",
    label: "帧进度",
    description: "当前帧 / 总帧数",
  },
  {
    key: "interactionHint",
    label: "交互提示",
    description: "当前鼠标交互提示",
  },
  {
    key: "imageFileName",
    label: "图像文件名",
    description: "当前切片文件名",
  },
  {
    key: "instanceNumber",
    label: "实例号",
    description: "当前切片的 Instance Number",
  },
];

export const OVERLAY_FONT_WEIGHT_OPTIONS: Array<{
  label: string;
  value: OverlayFontWeight;
}> = [
  { label: "Regular", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
];

const DEFAULT_LINE_PRIMARY: OverlayTextStyle = {
  color: "#edf2f7",
  fontSize: 12,
  fontWeight: "500",
  italic: false,
};

const DEFAULT_LINE_SECONDARY: OverlayTextStyle = {
  color: "#90a0b3",
  fontSize: 11,
  fontWeight: "500",
  italic: false,
};

export function createOverlayItemConfig(
  id: string,
  tagKey: OverlayTagKey,
  prefix: string,
  style: OverlayTextStyle,
): OverlayCornerItemConfig {
  return {
    id,
    tagKey,
    prefix,
    style,
  };
}

export function createDefaultViewportOverlaySettings(): ViewportOverlaySettings {
  return {
    schemaVersion: 1,
    corners: {
      topLeft: [
        createOverlayItemConfig("top-left-patient-name", "patientName", "", {
          ...DEFAULT_LINE_PRIMARY,
        }),
        createOverlayItemConfig("top-left-patient-id", "patientId", "ID ", {
          ...DEFAULT_LINE_SECONDARY,
        }),
      ],
      topRight: [
        createOverlayItemConfig("top-right-study-title", "studyTitle", "", {
          ...DEFAULT_LINE_PRIMARY,
        }),
        createOverlayItemConfig("top-right-modality", "modalitySummary", "", {
          ...DEFAULT_LINE_SECONDARY,
        }),
      ],
      bottomLeft: [
        createOverlayItemConfig("bottom-left-series-title", "seriesTitle", "", {
          ...DEFAULT_LINE_PRIMARY,
        }),
        createOverlayItemConfig(
          "bottom-left-study-date",
          "studyDate",
          "检查日期 ",
          {
            ...DEFAULT_LINE_SECONDARY,
          },
        ),
      ],
      bottomRight: [
        createDefaultFrameProgressItemConfig("bottom-right-frame-progress"),
      ],
    },
  };
}

export function createNewOverlayItemConfig(
  id: string,
  tagKey: OverlayTagKey = "patientName",
) {
  return createOverlayItemConfig(id, tagKey, "", {
    ...DEFAULT_LINE_SECONDARY,
  });
}

export function createDefaultFrameProgressItemConfig(id: string) {
  return createOverlayItemConfig(id, "frameProgress", "", {
    color: "#edf2f7",
    fontSize: 14,
    fontWeight: "500",
    italic: false,
  });
}

function isLegacyDefaultOverlayItem(
  item: OverlayCornerItemConfig,
  fallback: OverlayCornerItemConfig,
) {
  return (
    item.id === fallback.id &&
    item.tagKey === fallback.tagKey &&
    item.prefix === fallback.prefix
  );
}

function migrateLegacyDefaultItemWeight(
  item: OverlayCornerItemConfig,
  fallback: OverlayCornerItemConfig,
): OverlayCornerItemConfig {
  if (!isLegacyDefaultOverlayItem(item, fallback)) {
    return item;
  }

  if (item.style.fontWeight !== "700") {
    return item;
  }

  return {
    ...item,
    style: {
      ...item.style,
      fontWeight: fallback.style.fontWeight,
    },
  };
}

export function createDefaultViewerSettings(): ViewerSettings {
  return {
    schemaVersion: 1,
    viewportOverlay: createDefaultViewportOverlaySettings(),
    toolbarShortcuts: createDefaultToolbarShortcutSettings(),
    mprProjection: createDefaultViewerMprProjectionSettings(),
  };
}

export function createDefaultViewerMprProjectionSettings(): ViewerMprProjectionSettings {
  return {
    schemaVersion: 1,
    defaultSlabMode: DEFAULT_VIEWPORT_MPR_SLAB_STATE.mode,
    defaultSlabThickness: DEFAULT_VIEWPORT_MPR_SLAB_STATE.thickness,
  };
}

export function getViewerSettingsDefaultMprSlabState(
  settings: ViewerSettings,
): ViewportMprSlabState {
  return normalizeViewportMprSlabState(
    {
      mode: settings.mprProjection.defaultSlabMode,
      thickness: settings.mprProjection.defaultSlabThickness,
    },
    DEFAULT_VIEWPORT_MPR_SLAB_STATE,
  );
}

export function cloneViewerSettings(settings: ViewerSettings): ViewerSettings {
  return JSON.parse(JSON.stringify(settings)) as ViewerSettings;
}

function isOverlayTagKey(value: string): value is OverlayTagKey {
  return OVERLAY_TAG_DEFINITIONS.some((definition) => definition.key === value);
}

function normalizeColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();

  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }

  return normalized.toLowerCase();
}

function normalizeFontWeight(
  value: unknown,
  fallback: OverlayFontWeight,
): OverlayFontWeight {
  if (typeof value !== "string") {
    return fallback;
  }

  if (OVERLAY_FONT_WEIGHT_OPTIONS.some((option) => option.value === value)) {
    return value as OverlayFontWeight;
  }

  return fallback;
}

function normalizeOverlayItem(
  value: unknown,
  fallback: OverlayCornerItemConfig,
): OverlayCornerItemConfig {
  const item =
    value && typeof value === "object"
      ? (value as Partial<OverlayCornerItemConfig>)
      : undefined;
  const style =
    item?.style && typeof item.style === "object"
      ? (item.style as Partial<OverlayTextStyle>)
      : undefined;

  return migrateLegacyDefaultItemWeight(
    {
    id:
      typeof item?.id === "string" && item.id.trim()
        ? item.id.trim()
        : fallback.id,
    tagKey:
      typeof item?.tagKey === "string" && isOverlayTagKey(item.tagKey)
        ? item.tagKey
        : fallback.tagKey,
    prefix:
      typeof item?.prefix === "string"
        ? item.prefix.slice(0, 32)
        : fallback.prefix,
    style: {
      color: normalizeColor(style?.color, fallback.style.color),
      fontSize:
        typeof style?.fontSize === "number" &&
        Number.isFinite(style.fontSize) &&
        style.fontSize >= 10 &&
        style.fontSize <= 24
          ? Math.round(style.fontSize)
          : fallback.style.fontSize,
      fontWeight: normalizeFontWeight(
        style?.fontWeight,
        fallback.style.fontWeight,
      ),
      italic:
        typeof style?.italic === "boolean"
          ? style.italic
          : fallback.style.italic,
    },
    },
    fallback,
  );
}

function normalizeCornerItems(
  value: unknown,
  fallback: OverlayCornerItemConfig[],
): OverlayCornerItemConfig[] {
  if (!Array.isArray(value)) {
    return fallback.map((item) => normalizeOverlayItem(item, item));
  }

  if (value.length === 0) {
    return [];
  }

  const fallbackItem =
    fallback[0] ?? createNewOverlayItemConfig("overlay-item-default");
  const normalizedItems = value
    .slice(0, 6)
    .map((item, index) =>
      normalizeOverlayItem(item, fallback[index] ?? fallbackItem),
    )
    .filter((item) => item.tagKey !== "interactionHint")
    .filter(Boolean);

  return normalizedItems.length
    ? normalizedItems
    : [normalizeOverlayItem(fallbackItem, fallbackItem)];
}

export function normalizeViewerSettings(value: unknown): ViewerSettings {
  const defaults = createDefaultViewerSettings();
  const settings =
    value && typeof value === "object"
      ? (value as Partial<ViewerSettings>)
      : undefined;
  const viewportOverlay =
    settings?.viewportOverlay && typeof settings.viewportOverlay === "object"
      ? (settings.viewportOverlay as Partial<ViewportOverlaySettings>)
      : undefined;
  const mprProjection =
    settings?.mprProjection && typeof settings.mprProjection === "object"
      ? (settings.mprProjection as Partial<ViewerMprProjectionSettings>)
      : undefined;
  const corners =
    viewportOverlay?.corners && typeof viewportOverlay.corners === "object"
      ? viewportOverlay.corners
      : undefined;
  const defaultMprSlabState = normalizeViewportMprSlabState(
    {
      mode: mprProjection?.defaultSlabMode,
      thickness: mprProjection?.defaultSlabThickness,
    },
    getViewerSettingsDefaultMprSlabState(defaults),
  );

  return {
    schemaVersion: 1,
    viewportOverlay: {
      schemaVersion: 1,
      corners: {
        topLeft: normalizeCornerItems(
          corners?.topLeft,
          defaults.viewportOverlay.corners.topLeft,
        ),
        topRight: normalizeCornerItems(
          corners?.topRight,
          defaults.viewportOverlay.corners.topRight,
        ),
        bottomLeft: normalizeCornerItems(
          corners?.bottomLeft,
          defaults.viewportOverlay.corners.bottomLeft,
        ),
        bottomRight: normalizeCornerItems(
          corners?.bottomRight,
          defaults.viewportOverlay.corners.bottomRight,
        ),
      },
    },
    toolbarShortcuts: normalizeToolbarShortcutSettings(
      settings?.toolbarShortcuts,
    ),
    mprProjection: {
      schemaVersion: 1,
      defaultSlabMode: defaultMprSlabState.mode,
      defaultSlabThickness: defaultMprSlabState.thickness,
    },
  };
}

export function createOverlayItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `overlay-item-${Math.random().toString(36).slice(2, 10)}`;
}
