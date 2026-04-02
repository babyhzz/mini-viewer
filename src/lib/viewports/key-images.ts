import type { DicomImageNode } from "@/types/dicom";

export interface KeyImageEntry {
  id: string;
  frameIndex: number;
  instanceNumber: number | null;
  imageFileName: string;
  createdAt: number;
}

export function createKeyImageEntry({
  frameIndex,
  image,
}: {
  frameIndex: number;
  image: DicomImageNode | null | undefined;
}): KeyImageEntry {
  return {
    id: `frame-${frameIndex}`,
    frameIndex,
    instanceNumber:
      typeof image?.instanceNumber === "number" ? image.instanceNumber : null,
    imageFileName: image?.fileName ?? "",
    createdAt: Date.now(),
  };
}

export function sortKeyImageEntries(entries: KeyImageEntry[]) {
  return [...entries].sort((left, right) => left.frameIndex - right.frameIndex);
}

export function hasKeyImageAtFrame(
  entries: KeyImageEntry[] | null | undefined,
  frameIndex: number,
) {
  return Boolean(entries?.some((entry) => entry.frameIndex === frameIndex));
}
