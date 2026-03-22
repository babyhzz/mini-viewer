import type { ViewportAnnotationEntry } from "@/lib/tools/cornerstone-tool-adapter";

export interface ViewportAnnotationsState {
  entries: ViewportAnnotationEntry[];
  selectedAnnotationUIDs: string[];
}

export function createEmptyViewportAnnotationsState(): ViewportAnnotationsState {
  return {
    entries: [],
    selectedAnnotationUIDs: [],
  };
}
