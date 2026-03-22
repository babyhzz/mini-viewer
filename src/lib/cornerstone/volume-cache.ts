"use client";

const volumeReferenceCounts = new Map<string, number>();

export function buildSeriesVolumeId(seriesKey: string) {
  return `mpr:${encodeURIComponent(seriesKey)}`;
}

export async function acquireSeriesVolume(
  core: typeof import("@cornerstonejs/core"),
  seriesKey: string,
  imageIds: string[],
) {
  const volumeId = buildSeriesVolumeId(seriesKey);
  volumeReferenceCounts.set(volumeId, (volumeReferenceCounts.get(volumeId) ?? 0) + 1);

  try {
    const volume = await core.volumeLoader.createAndCacheVolume(volumeId, {
      imageIds,
    });

    volume.load();

    return volumeId;
  } catch (error) {
    releaseSeriesVolume(core, volumeId);
    throw error;
  }
}

export function releaseSeriesVolume(
  core: typeof import("@cornerstonejs/core"),
  volumeId: string | null | undefined,
) {
  if (!volumeId) {
    return;
  }

  const nextReferenceCount = (volumeReferenceCounts.get(volumeId) ?? 1) - 1;

  if (nextReferenceCount > 0) {
    volumeReferenceCounts.set(volumeId, nextReferenceCount);
    return;
  }

  volumeReferenceCounts.delete(volumeId);
  core.cache.removeVolumeLoadObject(volumeId);
}
