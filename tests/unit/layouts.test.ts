import { describe, expect, it } from "vitest";

import {
  getViewportLayoutDefinition,
  getViewportLayoutSlotIds,
} from "@/lib/viewports/layouts";

describe("viewport layouts", () => {
  it("returns stable slot ids for asymmetric layouts", () => {
    expect(getViewportLayoutSlotIds("1p2")).toEqual([
      "viewport-1",
      "viewport-2",
      "viewport-3",
    ]);
  });

  it("keeps the asymmetric layout geometry intact", () => {
    const layout = getViewportLayoutDefinition("2p1");

    expect(layout.rows).toBe(2);
    expect(layout.columns).toBe(2);
    expect(layout.cells[2]).toEqual({
      column: 2,
      row: 1,
      rowSpan: 2,
    });
  });
});
