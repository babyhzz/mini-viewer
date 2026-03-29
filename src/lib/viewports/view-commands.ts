export type ViewportWindowPresetId =
  | "default"
  | "softTissue"
  | "lung"
  | "bone"
  | "brain";

export interface ViewportWindowPresetDefinition {
  id: ViewportWindowPresetId;
  label: string;
  description: string;
  windowWidth: number | null;
  windowCenter: number | null;
}

export type ViewportViewCommand =
  | {
      id: number;
      targetViewportKey: string;
      type: "fit";
    }
  | {
      id: number;
      targetViewportKey: string;
      type: "reset";
    }
  | {
      id: number;
      targetViewportKey: string;
      type: "rotateRight";
    }
  | {
      id: number;
      targetViewportKey: string;
      type: "flipHorizontal";
    }
  | {
      id: number;
      targetViewportKey: string;
      type: "flipVertical";
    }
  | {
      id: number;
      targetViewportKey: string;
      type: "windowPreset";
      presetId: ViewportWindowPresetId;
    };

export const VIEWPORT_WINDOW_PRESET_DEFINITIONS: ViewportWindowPresetDefinition[] =
  [
    {
      id: "default",
      label: "默认",
      description: "恢复当前图像的默认窗宽窗位",
      windowWidth: null,
      windowCenter: null,
    },
    {
      id: "softTissue",
      label: "软组织",
      description: "常用软组织窗",
      windowWidth: 400,
      windowCenter: 40,
    },
    {
      id: "lung",
      label: "肺窗",
      description: "肺实质观察窗",
      windowWidth: 1500,
      windowCenter: -600,
    },
    {
      id: "bone",
      label: "骨窗",
      description: "骨结构观察窗",
      windowWidth: 2000,
      windowCenter: 350,
    },
    {
      id: "brain",
      label: "脑窗",
      description: "脑实质观察窗",
      windowWidth: 80,
      windowCenter: 40,
    },
  ];

export function getViewportWindowPresetDefinitions() {
  return VIEWPORT_WINDOW_PRESET_DEFINITIONS;
}

export function getViewportWindowPresetDefinition(
  presetId: ViewportWindowPresetId,
) {
  return VIEWPORT_WINDOW_PRESET_DEFINITIONS.find(
    (presetDefinition) => presetDefinition.id === presetId,
  );
}
