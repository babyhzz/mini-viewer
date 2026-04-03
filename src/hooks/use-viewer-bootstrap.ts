"use client";

import { useEffect, useState } from "react";

import { createDefaultViewerSettings, normalizeViewerSettings } from "@/lib/settings/overlay";
import type { DicomHierarchyResponse } from "@/types/dicom";
import type { ViewerSettings } from "@/types/settings";

interface UseViewerBootstrapOptions {
  onViewerSettingsLoaded: (settings: ViewerSettings) => void;
}

export function useViewerBootstrap({
  onViewerSettingsLoaded,
}: UseViewerBootstrapOptions) {
  const [hierarchy, setHierarchy] = useState<DicomHierarchyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadViewerBootstrapData() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const [hierarchyResponse, settingsResponse] = await Promise.all([
          fetch("/api/hierarchy", {
            cache: "no-store",
          }),
          fetch("/api/settings", {
            cache: "no-store",
          }),
        ]);

        if (!hierarchyResponse.ok) {
          throw new Error("Hierarchy request failed");
        }

        const [hierarchyPayload, settingsPayload] = await Promise.all([
          hierarchyResponse.json() as Promise<DicomHierarchyResponse>,
          settingsResponse.ok
            ? (settingsResponse.json() as Promise<ViewerSettings>)
            : Promise.resolve(createDefaultViewerSettings()),
        ]);

        if (cancelled) {
          return;
        }

        setHierarchy(hierarchyPayload);
        onViewerSettingsLoaded(normalizeViewerSettings(settingsPayload));
      } catch (error) {
        console.error("Failed to fetch hierarchy", error);

        if (!cancelled) {
          setErrorMessage(
            "无法加载层级结构接口，请检查本地 DICOM 目录和 API。",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadViewerBootstrapData();

    return () => {
      cancelled = true;
    };
  }, [onViewerSettingsLoaded]);

  return {
    hierarchy,
    loading,
    errorMessage,
    setHierarchy,
  };
}
