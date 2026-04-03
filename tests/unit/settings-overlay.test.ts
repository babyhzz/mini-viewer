import { describe, expect, it } from "vitest";

import {
  createDefaultViewerSettings,
  normalizeViewerSettings,
} from "@/lib/settings/overlay";

describe("viewer settings normalization", () => {
  it("falls back to defaults for invalid payloads", () => {
    const normalized = normalizeViewerSettings({
      schemaVersion: 999,
      viewportOverlay: {
        corners: {
          topLeft: [{ id: "x", tagKey: "bad", prefix: "", style: { color: "red" } }],
        },
      },
      toolbarShortcuts: {
        bindings: {
          select: { code: "ShiftLeft" },
        },
      },
      mprProjection: {
        defaultSlabMode: "weird",
        defaultSlabThickness: -2,
      },
    });

    const defaults = createDefaultViewerSettings();

    expect(normalized.schemaVersion).toBe(1);
    expect(normalized.viewportOverlay.corners.topLeft.length).toBeGreaterThan(0);
    expect(normalized.toolbarShortcuts.bindings.select).toEqual(
      defaults.toolbarShortcuts.bindings.select,
    );
    expect(normalized.mprProjection.defaultSlabMode).toBe("none");
    expect(normalized.mprProjection.defaultSlabThickness).toBeGreaterThan(0);
  });
});
