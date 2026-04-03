import { describe, expect, it } from "vitest";

import { normalizeToolbarShortcutSettings } from "@/lib/settings/shortcuts";

describe("toolbar shortcut settings", () => {
  it("dedupes conflicting bindings while preserving the first command", () => {
    const settings = normalizeToolbarShortcutSettings({
      bindings: {
        select: { code: "KeyV", ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
        pan: { code: "KeyV", ctrlKey: false, altKey: false, shiftKey: false, metaKey: false },
      },
    });

    expect(settings.bindings.select?.code).toBe("KeyV");
    expect(settings.bindings.pan).toBeNull();
  });
});
