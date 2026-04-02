import type { Point3 } from "@/lib/viewports/reference-lines";

export interface ViewportMprCrosshairSyncCommand {
  id: number;
  targetViewportKey: string;
  sourceViewportKey: string;
  frameOfReferenceUID: string | null;
  referencePointWorld: Point3;
}
