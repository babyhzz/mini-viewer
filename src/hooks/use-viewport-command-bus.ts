"use client";

import { useCallback, useRef } from "react";

import type { ViewportAnnotationCommand } from "@/lib/tools/cornerstone-tool-adapter";
import type { ViewportViewCommand, ViewportWindowPresetId } from "@/lib/viewports/view-commands";
import type { ViewportStackNavigationCommand } from "@/lib/viewports/stack-navigation";

type ViewportAnnotationCommandInput =
  | {
      type: "select";
      annotationUID: string;
    }
  | {
      type: "delete";
      annotationUIDs: string[];
    }
  | {
      type: "clearAll";
    };

interface UseViewportCommandBusOptions {
  selectedViewportId: string;
  viewportIds: string[];
  activeViewportViewCommandsEnabled: boolean;
  setAnnotationCommand: (command: ViewportAnnotationCommand | null) => void;
  setViewCommand: (command: ViewportViewCommand | null) => void;
  setViewportStackNavigationCommandById: (
    updater: (
      previous: Record<string, ViewportStackNavigationCommand | null>,
    ) => Record<string, ViewportStackNavigationCommand | null>,
  ) => void;
  setManualSequenceSyncRequest: (
    request: { id: number; sourceViewportId: string } | null,
  ) => void;
}

export function useViewportCommandBus({
  selectedViewportId,
  viewportIds,
  activeViewportViewCommandsEnabled,
  setAnnotationCommand,
  setViewCommand,
  setViewportStackNavigationCommandById,
  setManualSequenceSyncRequest,
}: UseViewportCommandBusOptions) {
  const annotationCommandIdRef = useRef(0);
  const viewCommandIdRef = useRef(0);
  const stackNavigationCommandIdRef = useRef(0);
  const mprCrosshairSyncCommandIdRef = useRef(0);
  const sequenceSyncCommandIdRef = useRef(0);
  const presentationSyncCommandIdRef = useRef(0);
  const manualSequenceSyncRequestIdRef = useRef(0);

  const nextStackNavigationCommandId = useCallback(() => {
    stackNavigationCommandIdRef.current += 1;
    return stackNavigationCommandIdRef.current;
  }, []);

  const nextMprCrosshairSyncCommandId = useCallback(() => {
    mprCrosshairSyncCommandIdRef.current += 1;
    return mprCrosshairSyncCommandIdRef.current;
  }, []);

  const nextSequenceSyncCommandId = useCallback(() => {
    sequenceSyncCommandIdRef.current += 1;
    return sequenceSyncCommandIdRef.current;
  }, []);

  const nextPresentationSyncCommandId = useCallback(() => {
    presentationSyncCommandIdRef.current += 1;
    return presentationSyncCommandIdRef.current;
  }, []);

  const queueStackNavigationCommand = useCallback(
    (frameIndex: number, targetViewportKey = selectedViewportId) => {
      const nextId = nextStackNavigationCommandId();
      setViewportStackNavigationCommandById((previous) => ({
        ...previous,
        [targetViewportKey]: {
          id: nextId,
          targetViewportKey,
          frameIndex,
        },
      }));
    },
    [
      nextStackNavigationCommandId,
      selectedViewportId,
      setViewportStackNavigationCommandById,
    ],
  );

  const queueAnnotationCommand = useCallback(
    (command: ViewportAnnotationCommandInput) => {
      const targetViewportKey =
        selectedViewportId || viewportIds[0] || "viewport-1";

      annotationCommandIdRef.current += 1;
      setAnnotationCommand({
        id: annotationCommandIdRef.current,
        targetViewportKey,
        ...command,
      } as ViewportAnnotationCommand);
    },
    [selectedViewportId, setAnnotationCommand, viewportIds],
  );

  const queueViewCommand = useCallback(
    (
      command:
        | {
            type:
              | "fit"
              | "reset"
              | "rotateRight"
              | "flipHorizontal"
              | "flipVertical";
          }
        | {
            type: "windowPreset";
            presetId: ViewportWindowPresetId;
          },
    ) => {
      if (!activeViewportViewCommandsEnabled) {
        return;
      }

      const targetViewportKey =
        selectedViewportId || viewportIds[0] || "viewport-1";

      viewCommandIdRef.current += 1;
      setViewCommand({
        id: viewCommandIdRef.current,
        targetViewportKey,
        ...command,
      } as ViewportViewCommand);
    },
    [
      activeViewportViewCommandsEnabled,
      selectedViewportId,
      setViewCommand,
      viewportIds,
    ],
  );

  const requestManualSequenceSync = useCallback(
    (sourceViewportId = selectedViewportId) => {
      manualSequenceSyncRequestIdRef.current += 1;
      setManualSequenceSyncRequest({
        id: manualSequenceSyncRequestIdRef.current,
        sourceViewportId,
      });
    },
    [selectedViewportId, setManualSequenceSyncRequest],
  );

  return {
    queueStackNavigationCommand,
    queueAnnotationCommand,
    queueViewCommand,
    requestManualSequenceSync,
    nextStackNavigationCommandId,
    nextMprCrosshairSyncCommandId,
    nextSequenceSyncCommandId,
    nextPresentationSyncCommandId,
  };
}
