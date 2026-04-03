"use client";

import { useEffect, useRef } from "react";

import { mergeCommandMap } from "@/hooks/utils/command-map";
import { pruneCrossStudyCalibrations } from "@/lib/viewports/sync/calibration-lifecycle";
import { buildDisplaySyncCommands } from "@/lib/viewports/sync/display-sync";
import { shouldProcessManualSequenceSyncRequest } from "@/lib/viewports/sync/manual-sync";
import { buildReferenceLineNavigationCommands, buildMprCrosshairSyncCommands } from "@/lib/viewports/sync/reference-line-sync";
import { buildSequenceSyncCommands } from "@/lib/viewports/sync/sequence-sync";
import { resolveCompatibleActiveViewportTool } from "@/lib/viewports/sync/tool-compatibility";
import type { ViewerSyncCoordinatorOptions } from "@/lib/viewports/sync/types";

export function useViewerSyncCoordinator({
  snapshot,
  activeViewportTool,
  activeViewportHasMontageLayout,
  manualSequenceSyncRequest,
  setActiveViewportTool,
  setCrossStudyCalibrationByPairKey,
  setViewportSequenceSyncCommandById,
  setViewportPresentationSyncCommandById,
  setViewportMprCrosshairSyncCommandById,
  setViewportStackNavigationCommandById,
  nextMprCrosshairSyncCommandId,
  nextSequenceSyncCommandId,
  nextPresentationSyncCommandId,
  nextStackNavigationCommandId,
}: ViewerSyncCoordinatorOptions) {
  const processedStackSyncTokenByViewportRef = useRef<Record<string, number>>({});
  const processedPresentationSyncTokenByViewportRef = useRef<Record<string, number>>({});
  const processedMprReferenceNavigationKeyByViewportRef = useRef<Record<string, string>>({});
  const processedMprCrosshairSyncKeyByViewportRef = useRef<Record<string, string>>({});
  const processedManualSequenceSyncRequestIdRef = useRef(0);

  useEffect(() => {
    const nextTool = resolveCompatibleActiveViewportTool({
      activeViewportTool,
      selectedViewportMode: snapshot.selectedViewportMode,
      activeViewportHasMontageLayout,
    });

    if (nextTool) {
      setActiveViewportTool(nextTool);
    }
  }, [
    activeViewportHasMontageLayout,
    activeViewportTool,
    setActiveViewportTool,
    snapshot.selectedViewportMode,
  ]);

  useEffect(() => {
    setCrossStudyCalibrationByPairKey(pruneCrossStudyCalibrations(snapshot));
  }, [setCrossStudyCalibrationByPairKey, snapshot]);

  useEffect(() => {
    for (const [viewportId, runtimeState] of Object.entries(
      snapshot.stackViewportRuntimeStateById,
    )) {
      if (!runtimeState) {
        delete processedStackSyncTokenByViewportRef.current[viewportId];
      }
    }
  }, [snapshot.stackViewportRuntimeStateById]);

  useEffect(() => {
    for (const [viewportId, presentationState] of Object.entries(
      snapshot.stackViewportPresentationStateById,
    )) {
      if (!presentationState) {
        delete processedPresentationSyncTokenByViewportRef.current[viewportId];
      }
    }
  }, [snapshot.stackViewportPresentationStateById]);

  useEffect(() => {
    for (const viewportId of snapshot.viewportIds) {
      const runtimeState = snapshot.stackViewportRuntimeStateById[viewportId];

      if (!runtimeState || runtimeState.lastChangeSource === "sync") {
        continue;
      }

      const lastProcessedToken =
        processedStackSyncTokenByViewportRef.current[viewportId] ?? 0;

      if (runtimeState.lastChangeToken <= lastProcessedToken) {
        continue;
      }

      processedStackSyncTokenByViewportRef.current[viewportId] =
        runtimeState.lastChangeToken;
      const result = buildSequenceSyncCommands(
        snapshot,
        viewportId,
        nextSequenceSyncCommandId,
      );

      if (result.calibrationMap !== snapshot.crossStudyCalibrationByPairKey) {
        setCrossStudyCalibrationByPairKey(result.calibrationMap);
      }

      setViewportSequenceSyncCommandById((previous) =>
        mergeCommandMap(previous, result.commands),
      );
    }
  }, [
    nextSequenceSyncCommandId,
    setCrossStudyCalibrationByPairKey,
    setViewportSequenceSyncCommandById,
    snapshot,
  ]);

  useEffect(() => {
    for (const viewportId of snapshot.viewportIds) {
      const presentationState =
        snapshot.stackViewportPresentationStateById[viewportId];

      if (
        !presentationState ||
        presentationState.lastChangeSource === "sync" ||
        presentationState.lastChangeSource === "load"
      ) {
        continue;
      }

      const lastProcessedToken =
        processedPresentationSyncTokenByViewportRef.current[viewportId] ?? 0;

      if (presentationState.lastChangeToken <= lastProcessedToken) {
        continue;
      }

      processedPresentationSyncTokenByViewportRef.current[viewportId] =
        presentationState.lastChangeToken;
      const commands = buildDisplaySyncCommands(
        snapshot,
        viewportId,
        nextPresentationSyncCommandId,
      );
      setViewportPresentationSyncCommandById((previous) =>
        mergeCommandMap(previous, commands),
      );
    }
  }, [
    nextPresentationSyncCommandId,
    setViewportPresentationSyncCommandById,
    snapshot,
  ]);

  useEffect(() => {
    if (
      !shouldProcessManualSequenceSyncRequest(
        manualSequenceSyncRequest,
        processedManualSequenceSyncRequestIdRef.current,
      )
    ) {
      return;
    }

    processedManualSequenceSyncRequestIdRef.current = manualSequenceSyncRequest!.id;

    const sequenceResult = buildSequenceSyncCommands(
      snapshot,
      manualSequenceSyncRequest!.sourceViewportId,
      nextSequenceSyncCommandId,
    );
    const displayCommands = buildDisplaySyncCommands(
      snapshot,
      manualSequenceSyncRequest!.sourceViewportId,
      nextPresentationSyncCommandId,
    );

    if (sequenceResult.calibrationMap !== snapshot.crossStudyCalibrationByPairKey) {
      setCrossStudyCalibrationByPairKey(sequenceResult.calibrationMap);
    }

    setViewportSequenceSyncCommandById((previous) =>
      mergeCommandMap(previous, sequenceResult.commands),
    );
    setViewportPresentationSyncCommandById((previous) =>
      mergeCommandMap(previous, displayCommands),
    );
  }, [
    manualSequenceSyncRequest,
    nextPresentationSyncCommandId,
    nextSequenceSyncCommandId,
    setCrossStudyCalibrationByPairKey,
    setViewportPresentationSyncCommandById,
    setViewportSequenceSyncCommandById,
    snapshot,
  ]);

  useEffect(() => {
    const result = buildMprCrosshairSyncCommands(
      snapshot,
      processedMprCrosshairSyncKeyByViewportRef.current,
      nextMprCrosshairSyncCommandId,
    );

    processedMprCrosshairSyncKeyByViewportRef.current =
      result.processedSyncKeyByViewport;
    setViewportMprCrosshairSyncCommandById((previous) =>
      mergeCommandMap(previous, result.commands),
    );
  }, [
    nextMprCrosshairSyncCommandId,
    setViewportMprCrosshairSyncCommandById,
    snapshot,
  ]);

  useEffect(() => {
    const result = buildReferenceLineNavigationCommands(
      snapshot,
      processedMprReferenceNavigationKeyByViewportRef.current,
      nextStackNavigationCommandId,
    );

    processedMprReferenceNavigationKeyByViewportRef.current =
      result.processedNavigationKeyByViewport;
    setViewportStackNavigationCommandById((previous) =>
      mergeCommandMap(previous, result.commands),
    );
  }, [
    nextStackNavigationCommandId,
    setViewportStackNavigationCommandById,
    snapshot,
  ]);
}
