import type {
  ToolbarShortcutBinding,
  ToolbarShortcutCommandId,
  ToolbarShortcutSettings,
} from "@/types/settings";

type ToolbarShortcutCategoryId = "basic" | "measure" | "roi" | "actions";

export interface ToolbarShortcutCommandDefinition {
  id: ToolbarShortcutCommandId;
  categoryId: ToolbarShortcutCategoryId;
  label: string;
  description: string;
  defaultBinding: ToolbarShortcutBinding | null;
}

export const TOOLBAR_SHORTCUT_CATEGORY_LABELS: Record<
  ToolbarShortcutCategoryId,
  string
> = {
  basic: "基础工具",
  measure: "测量工具",
  roi: "ROI 工具",
  actions: "工具栏动作",
};

const MODIFIER_ONLY_CODES = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

const KEY_DISPLAY_LABELS: Record<string, string> = {
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Space: "Space",
  Tab: "Tab",
  Enter: "Enter",
  Escape: "Esc",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Home: "Home",
  End: "End",
  Insert: "Insert",
  Delete: "Delete",
};

export const TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS: ToolbarShortcutCommandDefinition[] =
  [
    {
      id: "select",
      categoryId: "basic",
      label: "选择",
      description: "切换到选择工具",
      defaultBinding: createToolbarShortcutBinding("KeyV"),
    },
    {
      id: "pan",
      categoryId: "basic",
      label: "平移",
      description: "切换到平移工具",
      defaultBinding: createToolbarShortcutBinding("KeyH"),
    },
    {
      id: "windowLevel",
      categoryId: "basic",
      label: "调窗",
      description: "切换到调窗工具",
      defaultBinding: createToolbarShortcutBinding("KeyW"),
    },
    {
      id: "length",
      categoryId: "measure",
      label: "直线测量",
      description: "切换到长度测量工具",
      defaultBinding: createToolbarShortcutBinding("KeyL"),
    },
    {
      id: "polyline",
      categoryId: "measure",
      label: "折线测量",
      description: "切换到折线测量工具",
      defaultBinding: createToolbarShortcutBinding("KeyP"),
    },
    {
      id: "freehand",
      categoryId: "measure",
      label: "自由线测量",
      description: "切换到自由线测量工具",
      defaultBinding: createToolbarShortcutBinding("KeyF"),
    },
    {
      id: "angle",
      categoryId: "measure",
      label: "角度测量",
      description: "切换到角度测量工具",
      defaultBinding: createToolbarShortcutBinding("KeyA"),
    },
    {
      id: "rectangleRoi",
      categoryId: "roi",
      label: "矩形 ROI",
      description: "切换到矩形 ROI 工具",
      defaultBinding: createToolbarShortcutBinding("KeyR"),
    },
    {
      id: "ellipseRoi",
      categoryId: "roi",
      label: "椭圆 ROI",
      description: "切换到椭圆 ROI 工具",
      defaultBinding: createToolbarShortcutBinding("KeyE"),
    },
    {
      id: "circleRoi",
      categoryId: "roi",
      label: "圆形 ROI",
      description: "切换到圆形 ROI 工具",
      defaultBinding: createToolbarShortcutBinding("KeyC"),
    },
    {
      id: "invert",
      categoryId: "actions",
      label: "反色",
      description: "切换当前视口反色状态",
      defaultBinding: createToolbarShortcutBinding("KeyI"),
    },
    {
      id: "annotationList",
      categoryId: "actions",
      label: "图元列表",
      description: "打开当前视口图元列表",
      defaultBinding: null,
    },
    {
      id: "settings",
      categoryId: "actions",
      label: "打开设置",
      description: "打开工具栏设置抽屉",
      defaultBinding: null,
    },
  ];

const TOOLBAR_SHORTCUT_COMMAND_ID_SET = new Set<ToolbarShortcutCommandId>(
  TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.map((definition) => definition.id),
);

export const TOOLBAR_SHORTCUT_COMMAND_IDS = TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.map(
  (definition) => definition.id,
);

export function createToolbarShortcutBinding(
  code: string,
  options?: Partial<Omit<ToolbarShortcutBinding, "code">>,
): ToolbarShortcutBinding {
  return {
    code,
    ctrlKey: options?.ctrlKey ?? false,
    altKey: options?.altKey ?? false,
    shiftKey: options?.shiftKey ?? false,
    metaKey: options?.metaKey ?? false,
  };
}

export function isToolbarShortcutCommandId(
  value: string,
): value is ToolbarShortcutCommandId {
  return TOOLBAR_SHORTCUT_COMMAND_ID_SET.has(value as ToolbarShortcutCommandId);
}

export function isToolbarShortcutToolCommand(
  commandId: ToolbarShortcutCommandId,
): commandId is Exclude<
  ToolbarShortcutCommandId,
  "invert" | "annotationList" | "settings"
> {
  return !["invert", "annotationList", "settings"].includes(commandId);
}

export function getToolbarShortcutCommandDefinition(
  commandId: ToolbarShortcutCommandId,
) {
  return TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.find(
    (definition) => definition.id === commandId,
  );
}

export function createDefaultToolbarShortcutSettings(): ToolbarShortcutSettings {
  return {
    schemaVersion: 1,
    bindings: TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.reduce<
      ToolbarShortcutSettings["bindings"]
    >((bindings, definition) => {
      bindings[definition.id] = definition.defaultBinding;
      return bindings;
    }, {} as ToolbarShortcutSettings["bindings"]),
  };
}

function normalizeToolbarShortcutBinding(
  value: unknown,
  fallback: ToolbarShortcutBinding | null,
) {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const binding = value as Partial<ToolbarShortcutBinding>;
  const code =
    typeof binding.code === "string" ? binding.code.trim().slice(0, 32) : "";

  if (!code || MODIFIER_ONLY_CODES.has(code)) {
    return fallback;
  }

  return {
    code,
    ctrlKey: Boolean(binding.ctrlKey),
    altKey: Boolean(binding.altKey),
    shiftKey: Boolean(binding.shiftKey),
    metaKey: Boolean(binding.metaKey),
  };
}

function getToolbarShortcutBindingKey(binding: ToolbarShortcutBinding) {
  return [
    binding.code,
    binding.ctrlKey ? "1" : "0",
    binding.altKey ? "1" : "0",
    binding.shiftKey ? "1" : "0",
    binding.metaKey ? "1" : "0",
  ].join(":");
}

function dedupeToolbarShortcutBindings(
  bindings: ToolbarShortcutSettings["bindings"],
) {
  const usedKeys = new Set<string>();

  return TOOLBAR_SHORTCUT_COMMAND_IDS.reduce<ToolbarShortcutSettings["bindings"]>(
    (nextBindings, commandId) => {
      const binding = bindings[commandId];

      if (!binding) {
        nextBindings[commandId] = null;
        return nextBindings;
      }

      const bindingKey = getToolbarShortcutBindingKey(binding);

      if (usedKeys.has(bindingKey)) {
        nextBindings[commandId] = null;
        return nextBindings;
      }

      usedKeys.add(bindingKey);
      nextBindings[commandId] = binding;
      return nextBindings;
    },
    {} as ToolbarShortcutSettings["bindings"],
  );
}

export function normalizeToolbarShortcutSettings(
  value: unknown,
): ToolbarShortcutSettings {
  const defaults = createDefaultToolbarShortcutSettings();
  const settings =
    value && typeof value === "object"
      ? (value as Partial<ToolbarShortcutSettings>)
      : undefined;
  const bindings =
    settings?.bindings && typeof settings.bindings === "object"
      ? settings.bindings
      : undefined;

  const normalizedBindings = TOOLBAR_SHORTCUT_COMMAND_IDS.reduce<
    ToolbarShortcutSettings["bindings"]
  >((nextBindings, commandId) => {
    nextBindings[commandId] = normalizeToolbarShortcutBinding(
      bindings?.[commandId],
      defaults.bindings[commandId],
    );
    return nextBindings;
  }, {} as ToolbarShortcutSettings["bindings"]);

  return {
    schemaVersion: 1,
    bindings: dedupeToolbarShortcutBindings(normalizedBindings),
  };
}

export function areToolbarShortcutBindingsEqual(
  left: ToolbarShortcutBinding | null,
  right: ToolbarShortcutBinding | null,
) {
  if (!left || !right) {
    return left === right;
  }

  return getToolbarShortcutBindingKey(left) === getToolbarShortcutBindingKey(right);
}

export function formatToolbarShortcutBinding(
  binding: ToolbarShortcutBinding | null,
) {
  if (!binding) {
    return "未设置";
  }

  const parts: string[] = [];

  if (binding.metaKey) {
    parts.push("Cmd");
  }

  if (binding.ctrlKey) {
    parts.push("Ctrl");
  }

  if (binding.altKey) {
    parts.push("Alt");
  }

  if (binding.shiftKey) {
    parts.push("Shift");
  }

  parts.push(getToolbarShortcutKeyDisplayLabel(binding.code));

  return parts.join(" + ");
}

export function getToolbarShortcutKeyDisplayLabel(code: string) {
  if (KEY_DISPLAY_LABELS[code]) {
    return KEY_DISPLAY_LABELS[code];
  }

  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }

  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }

  if (/^Numpad[0-9]$/.test(code)) {
    return `Num ${code.slice(6)}`;
  }

  if (/^F[0-9]{1,2}$/.test(code)) {
    return code;
  }

  return code;
}

export function getToolbarShortcutBindingFromKeyboardEvent(
  event: Pick<
    KeyboardEvent,
    "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
  >,
) {
  const code = event.code.trim();

  if (!code || MODIFIER_ONLY_CODES.has(code)) {
    return null;
  }

  return createToolbarShortcutBinding(code, {
    ctrlKey: event.ctrlKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
  });
}

export function findToolbarShortcutCommandId(
  bindings: ToolbarShortcutSettings["bindings"],
  binding: ToolbarShortcutBinding,
) {
  return TOOLBAR_SHORTCUT_COMMAND_IDS.find((commandId) =>
    areToolbarShortcutBindingsEqual(bindings[commandId], binding),
  );
}
