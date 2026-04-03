"use client";

import { useEffect } from "react";

import {
  findToolbarShortcutCommandId,
  getToolbarShortcutBindingFromKeyboardEvent,
  isToolbarShortcutToolCommand,
} from "@/lib/settings/shortcuts";
import type { ViewportAction, ViewportTool } from "@/lib/tools/registry";
import type { ViewerSettings } from "@/types/settings";
import { isEditableKeyboardTarget } from "@/utils/keyboard-guards";

interface UseViewerKeyboardShortcutsOptions {
  viewerSettings: ViewerSettings;
  settingsOpen: boolean;
  annotationListOpen: boolean;
  keyImageListOpen: boolean;
  dicomTagDialogViewportId: string | null;
  orderedSeriesEntryCount: number;
  onOpenSettings: () => void;
  onViewportToolChange: (tool: ViewportTool) => void;
  onViewportAction: (action: ViewportAction) => void;
}

export function useViewerKeyboardShortcuts({
  viewerSettings,
  settingsOpen,
  annotationListOpen,
  keyImageListOpen,
  dicomTagDialogViewportId,
  orderedSeriesEntryCount,
  onOpenSettings,
  onViewportToolChange,
  onViewportAction,
}: UseViewerKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (
        settingsOpen ||
        annotationListOpen ||
        keyImageListOpen ||
        dicomTagDialogViewportId
      ) {
        return;
      }

      if (document.querySelector(".ant-modal-root .ant-modal-wrap")) {
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const binding = getToolbarShortcutBindingFromKeyboardEvent(event);

      if (!binding) {
        return;
      }

      const commandId = findToolbarShortcutCommandId(
        viewerSettings.toolbarShortcuts.bindings,
        binding,
      );

      if (!commandId) {
        return;
      }

      if (commandId !== "settings" && !orderedSeriesEntryCount) {
        return;
      }

      event.preventDefault();

      if (commandId === "settings") {
        onOpenSettings();
        return;
      }

      if (isToolbarShortcutToolCommand(commandId)) {
        onViewportToolChange(commandId);
        return;
      }

      onViewportAction(commandId);
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    annotationListOpen,
    dicomTagDialogViewportId,
    keyImageListOpen,
    onOpenSettings,
    onViewportAction,
    onViewportToolChange,
    orderedSeriesEntryCount,
    settingsOpen,
    viewerSettings.toolbarShortcuts.bindings,
  ]);
}
