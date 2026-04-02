import type { DicomImageNode } from "@/types/dicom";

export type ViewportSequenceSyncType =
  | "sameStudy"
  | "crossStudy"
  | "display";
export type ViewportSliceSyncType = Exclude<
  ViewportSequenceSyncType,
  "display"
>;
export type StackViewportNavigationSource = "load" | "user" | "sync" | "cine";
export type StackViewportPresentationSource = "load" | "user" | "sync";

export interface ViewportSequenceSyncState {
  sameStudy: boolean;
  crossStudy: boolean;
  display: boolean;
}

export interface StackViewportRuntimeState {
  status: "idle" | "loading" | "ready" | "error";
  currentFrameIndex: number;
  frameCount: number;
  lastChangeToken: number;
  lastChangeSource: StackViewportNavigationSource;
}

export interface ViewportSequenceSyncCommand {
  id: number;
  targetViewportKey: string;
  sourceViewportKey: string;
  frameIndex: number;
  syncType: ViewportSliceSyncType;
  calibrationPairKey?: string;
}

export interface ViewportPresentationSyncCommand {
  id: number;
  targetViewportKey: string;
  sourceViewportKey: string;
  viewPresentation: {
    zoom: number | null;
    pan: [number, number] | null;
  } | null;
  voiRange: {
    lower: number;
    upper: number;
  } | null;
}

export interface StackViewportPresentationState {
  status: "idle" | "loading" | "ready" | "error";
  viewPresentation: {
    zoom: number | null;
    pan: [number, number] | null;
  } | null;
  voiRange: {
    lower: number;
    upper: number;
  } | null;
  lastChangeToken: number;
  lastChangeSource: StackViewportPresentationSource;
}

export interface CrossStudyCalibration {
  pairKey: string;
  leftViewportId: string;
  rightViewportId: string;
  leftStudyId: string;
  rightStudyId: string;
  leftSeriesKey: string;
  rightSeriesKey: string;
  leftFrameIndex: number;
  rightFrameIndex: number;
  leftReferencePosition: [number, number, number];
  rightReferencePosition: [number, number, number];
  createdAt: number;
}

type Point3 = [number, number, number];
type Orientation6 = [
  number,
  number,
  number,
  number,
  number,
  number,
];

const PARALLEL_SLICE_NORMAL_THRESHOLD = 0.995;

export const DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE: ViewportSequenceSyncState = {
  sameStudy: false,
  crossStudy: false,
  display: false,
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPoint3(value: unknown): value is Point3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => isFiniteNumber(entry))
  );
}

function isOrientation6(value: unknown): value is Orientation6 {
  return (
    Array.isArray(value) &&
    value.length === 6 &&
    value.every((entry) => isFiniteNumber(entry))
  );
}

function dot(left: Point3, right: Point3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left: Point3, right: Point3): Point3 {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function magnitude(vector: Point3) {
  return Math.sqrt(dot(vector, vector));
}

function normalize(vector: Point3): Point3 | null {
  const length = magnitude(vector);

  if (!length || !Number.isFinite(length)) {
    return null;
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

export function getViewportSequenceSyncTypeLabel(type: ViewportSequenceSyncType) {
  if (type === "sameStudy") {
    return "同检查同步";
  }

  if (type === "crossStudy") {
    return "跨检查同步";
  }

  return "显示同步";
}

export function getEnabledViewportSequenceSyncTypes(
  state: ViewportSequenceSyncState | null | undefined,
) {
  if (!state) {
    return [] as ViewportSequenceSyncType[];
  }

  const enabledTypes: ViewportSequenceSyncType[] = [];

  if (state.sameStudy) {
    enabledTypes.push("sameStudy");
  }

  if (state.crossStudy) {
    enabledTypes.push("crossStudy");
  }

  if (state.display) {
    enabledTypes.push("display");
  }

  return enabledTypes;
}

export function hasEnabledViewportSequenceSync(
  state: ViewportSequenceSyncState | null | undefined,
) {
  return Boolean(state?.sameStudy || state?.crossStudy || state?.display);
}

export function hasEnabledViewportSliceSync(
  state: ViewportSequenceSyncState | null | undefined,
) {
  return Boolean(state?.sameStudy || state?.crossStudy);
}

export function hasEnabledViewportDisplaySync(
  state: ViewportSequenceSyncState | null | undefined,
) {
  return Boolean(state?.display);
}

export function toggleViewportSequenceSyncType(
  state: ViewportSequenceSyncState | null | undefined,
  type: ViewportSequenceSyncType,
) {
  const nextState = {
    ...DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
    ...state,
  };

  nextState[type] = !nextState[type];
  return nextState;
}

export function getViewportSequenceSyncStateLabel(
  state: ViewportSequenceSyncState | null | undefined,
) {
  const enabledTypes = getEnabledViewportSequenceSyncTypes(state);

  if (!enabledTypes.length) {
    return "同步关闭";
  }

  return enabledTypes.map(getViewportSequenceSyncTypeLabel).join(" + ");
}

export function encodeViewportSequenceSyncState(
  state: ViewportSequenceSyncState | null | undefined,
) {
  const enabledTypes = getEnabledViewportSequenceSyncTypes(state);

  return enabledTypes.length ? enabledTypes.join(",") : "off";
}

export function getSequenceSyncPairKey(
  leftViewportId: string,
  rightViewportId: string,
) {
  return [leftViewportId, rightViewportId].sort().join("::");
}

export function getImageSpatialPosition(image: DicomImageNode | null | undefined) {
  return isPoint3(image?.imagePositionPatient) ? image.imagePositionPatient : null;
}

export function getImageOrientation(image: DicomImageNode | null | undefined) {
  return isOrientation6(image?.imageOrientationPatient)
    ? image.imageOrientationPatient
    : null;
}

export function getImageSliceNormal(image: DicomImageNode | null | undefined) {
  const orientation = getImageOrientation(image);

  if (!orientation) {
    return null;
  }

  const rowCosines: Point3 = [orientation[0], orientation[1], orientation[2]];
  const columnCosines: Point3 = [orientation[3], orientation[4], orientation[5]];

  return normalize(cross(rowCosines, columnCosines));
}

export function areImagesSliceAligned(
  sourceImage: DicomImageNode | null | undefined,
  targetImage: DicomImageNode | null | undefined,
) {
  const sourceNormal = getImageSliceNormal(sourceImage);
  const targetNormal = getImageSliceNormal(targetImage);

  if (!sourceNormal || !targetNormal) {
    return false;
  }

  return (
    Math.abs(dot(sourceNormal, targetNormal)) >= PARALLEL_SLICE_NORMAL_THRESHOLD
  );
}

export function getImageSliceScalar(
  image: DicomImageNode | null | undefined,
  referenceNormal: Point3 | null,
) {
  const position = getImageSpatialPosition(image);

  if (!position || !referenceNormal) {
    return null;
  }

  return dot(position, referenceNormal);
}

export function findNearestImageIndexBySlicePosition(
  images: DicomImageNode[],
  targetSliceScalar: number,
  referenceNormal: Point3 | null,
) {
  if (!referenceNormal || !Number.isFinite(targetSliceScalar)) {
    return null;
  }

  let nearestIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [index, image] of images.entries()) {
    const imageSliceScalar = getImageSliceScalar(image, referenceNormal);

    if (imageSliceScalar == null) {
      continue;
    }

    const distance = Math.abs(imageSliceScalar - targetSliceScalar);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index + 1;
    }
  }

  return nearestIndex;
}

export function createCrossStudyCalibration({
  leftViewportId,
  rightViewportId,
  leftStudyId,
  rightStudyId,
  leftSeriesKey,
  rightSeriesKey,
  leftFrameIndex,
  rightFrameIndex,
  leftImage,
  rightImage,
}: {
  leftViewportId: string;
  rightViewportId: string;
  leftStudyId: string;
  rightStudyId: string;
  leftSeriesKey: string;
  rightSeriesKey: string;
  leftFrameIndex: number;
  rightFrameIndex: number;
  leftImage: DicomImageNode | null | undefined;
  rightImage: DicomImageNode | null | undefined;
}) {
  if (!areImagesSliceAligned(leftImage, rightImage)) {
    return null;
  }

  const leftReferencePosition = getImageSpatialPosition(leftImage);
  const rightReferencePosition = getImageSpatialPosition(rightImage);

  if (!leftReferencePosition || !rightReferencePosition) {
    return null;
  }

  return {
    pairKey: getSequenceSyncPairKey(leftViewportId, rightViewportId),
    leftViewportId,
    rightViewportId,
    leftStudyId,
    rightStudyId,
    leftSeriesKey,
    rightSeriesKey,
    leftFrameIndex,
    rightFrameIndex,
    leftReferencePosition,
    rightReferencePosition,
    createdAt: Date.now(),
  } satisfies CrossStudyCalibration;
}

export function findCrossStudySyncedFrameIndex({
  sourceViewportId,
  sourceImage,
  targetImages,
  calibration,
}: {
  sourceViewportId: string;
  sourceImage: DicomImageNode | null | undefined;
  targetImages: DicomImageNode[];
  calibration: CrossStudyCalibration;
}) {
  const targetReferenceImage =
    sourceViewportId === calibration.leftViewportId
      ? targetImages[calibration.rightFrameIndex - 1] ?? null
      : targetImages[calibration.leftFrameIndex - 1] ?? null;
  const targetNormal = getImageSliceNormal(targetReferenceImage);
  const sourcePosition = getImageSpatialPosition(sourceImage);

  if (!sourcePosition || !targetNormal) {
    return null;
  }

  const calibrationSourcePosition =
    sourceViewportId === calibration.leftViewportId
      ? calibration.leftReferencePosition
      : calibration.rightReferencePosition;
  const calibrationTargetPosition =
    sourceViewportId === calibration.leftViewportId
      ? calibration.rightReferencePosition
      : calibration.leftReferencePosition;
  const calibratedOffset =
    dot(calibrationTargetPosition, targetNormal) -
    dot(calibrationSourcePosition, targetNormal);
  const targetSliceScalar = dot(sourcePosition, targetNormal) + calibratedOffset;

  return findNearestImageIndexBySlicePosition(
    targetImages,
    targetSliceScalar,
    targetNormal,
  );
}
