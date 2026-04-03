import {
  createEmptyViewportAnnotationsState,
  type ViewportAnnotationsState,
} from "@/types/viewport-annotations";

import type {
  StateUpdater,
  ViewerSessionSetState,
  ViewerSessionState,
  ViewerSessionStore,
} from "@/stores/viewer-session/types";

export function resolveStateUpdater<T>(updater: StateUpdater<T>, previous: T) {
  if (typeof updater === "function") {
    return (updater as (previous: T) => T)(previous);
  }

  return updater;
}

export function createStateSetter<TState extends keyof ViewerSessionState>(
  key: TState,
  set: ViewerSessionSetState,
) {
  return (updater: StateUpdater<ViewerSessionState[TState]>) => {
    set((state: ViewerSessionStore) => ({
      [key]: resolveStateUpdater(updater, state[key]),
    }));
  };
}

export function createEmptyViewerAnnotationStateMap(viewportIds: string[]) {
  return viewportIds.reduce<Record<string, ViewportAnnotationsState>>(
    (nextState, viewportId) => {
      nextState[viewportId] = createEmptyViewportAnnotationsState();
      return nextState;
    },
    {},
  );
}
