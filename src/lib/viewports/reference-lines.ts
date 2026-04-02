export type Point2 = [number, number];
export type Point3 = [number, number, number];
export type Point3Quad = [Point3, Point3, Point3, Point3];

export interface StackViewportReferenceLineState {
  status: "idle" | "loading" | "ready" | "error";
  frameOfReferenceUID: string | null;
  imageCornersWorld: Point3Quad | null;
  referencePointWorld: Point3 | null;
  sourcePaneId: string | null;
  lastChangeToken: number;
}

export interface ViewportReferenceLineSegment {
  startCanvas: Point2;
  endCanvas: Point2;
}

interface PlaneEquation {
  normal: Point3;
  offset: number;
}

function dot(left: Point3, right: Point3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function subtract(left: Point3, right: Point3): Point3 {
  return [
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ];
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

  if (!Number.isFinite(length) || length <= 1e-6) {
    return null;
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function isParallel(left: Point3, right: Point3, threshold = 0.999) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return Math.abs(dot(normalizedLeft, normalizedRight)) >= threshold;
}

function isPerpendicular(left: Point3, right: Point3, threshold = 1e-3) {
  const normalizedLeft = normalize(left);
  const normalizedRight = normalize(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return Math.abs(dot(normalizedLeft, normalizedRight)) <= threshold;
}

function createPlaneEquation(normal: Point3, point: Point3): PlaneEquation {
  return {
    normal,
    offset: -dot(normal, point),
  };
}

function intersectLineSegmentWithPlane(
  startPoint: Point3,
  endPoint: Point3,
  plane: PlaneEquation,
): Point3 | null {
  const direction = subtract(endPoint, startPoint);
  const denominator = dot(plane.normal, direction);

  if (Math.abs(denominator) <= 1e-6) {
    return null;
  }

  const t = -(dot(plane.normal, startPoint) + plane.offset) / denominator;

  if (!Number.isFinite(t) || t < -1e-6 || t > 1 + 1e-6) {
    return null;
  }

  return [
    startPoint[0] + direction[0] * t,
    startPoint[1] + direction[1] * t,
    startPoint[2] + direction[2] * t,
  ];
}

function isFinitePoint2(value: unknown): value is Point2 {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

export function isFinitePoint3(value: unknown): value is Point3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

export function isFinitePoint3Quad(value: unknown): value is Point3Quad {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((entry) => isFinitePoint3(entry))
  );
}

export function clonePoint3Quad(points: Point3Quad): Point3Quad {
  return points.map((point) => [point[0], point[1], point[2]]) as Point3Quad;
}

export function clonePoint3(point: Point3): Point3 {
  return [point[0], point[1], point[2]];
}

export function getPoint3QuadCenter(points: Point3Quad): Point3 {
  return [
    (points[0][0] + points[1][0] + points[2][0] + points[3][0]) / 4,
    (points[0][1] + points[1][1] + points[2][1] + points[3][1]) / 4,
    (points[0][2] + points[1][2] + points[2][2] + points[3][2]) / 4,
  ];
}

function getSourcePlaneNormal(
  sourceCorners: Point3Quad,
): Point3 | null {
  const [topLeft, topRight, bottomLeft] = sourceCorners;
  const topToRight = normalize(subtract(topRight, topLeft));
  const topToBottom = normalize(subtract(bottomLeft, topLeft));

  if (!topToRight || !topToBottom) {
    return null;
  }

  return normalize(cross(topToBottom, topToRight));
}

function getWorldSegmentForReferenceLine(
  sourceCorners: Point3Quad,
  targetFocalPoint: Point3,
  targetViewPlaneNormal: Point3,
) {
  const sourcePlaneNormal = getSourcePlaneNormal(sourceCorners);

  if (!sourcePlaneNormal || isParallel(sourcePlaneNormal, targetViewPlaneNormal)) {
    return null;
  }

  const [topLeft, topRight, bottomLeft, bottomRight] = sourceCorners;
  const targetPlane = createPlaneEquation(
    targetViewPlaneNormal,
    targetFocalPoint,
  );
  const pointSetByColumns: [Point3, Point3, Point3, Point3] = [
    topLeft,
    bottomLeft,
    topRight,
    bottomRight,
  ];
  const pointSetByRows: [Point3, Point3, Point3, Point3] = [
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
  ];
  const columnVector = normalize(subtract(topLeft, bottomLeft));

  if (!columnVector) {
    return null;
  }

  const pointSet = isPerpendicular(columnVector, targetViewPlaneNormal)
    ? pointSetByRows
    : pointSetByColumns;
  const startPoint = intersectLineSegmentWithPlane(
    pointSet[0],
    pointSet[1],
    targetPlane,
  );
  const endPoint = intersectLineSegmentWithPlane(
    pointSet[2],
    pointSet[3],
    targetPlane,
  );

  if (!startPoint || !endPoint) {
    return null;
  }

  return {
    startWorld: startPoint,
    endWorld: endPoint,
  };
}

export function createEmptyStackViewportReferenceLineState(): StackViewportReferenceLineState {
  return {
    status: "idle",
    frameOfReferenceUID: null,
    imageCornersWorld: null,
    referencePointWorld: null,
    sourcePaneId: null,
    lastChangeToken: 0,
  };
}

export function computeViewportReferenceLineSegment(
  sourceState: StackViewportReferenceLineState | null | undefined,
  targetViewport:
    | import("@cornerstonejs/core").Types.IStackViewport
    | import("@cornerstonejs/core").Types.IVolumeViewport,
): ViewportReferenceLineSegment | null {
  if (
    !sourceState ||
    sourceState.status !== "ready" ||
    !sourceState.frameOfReferenceUID ||
    !sourceState.imageCornersWorld
  ) {
    return null;
  }

  const targetFrameOfReferenceUID = targetViewport.getFrameOfReferenceUID();

  if (
    !targetFrameOfReferenceUID ||
    targetFrameOfReferenceUID !== sourceState.frameOfReferenceUID
  ) {
    return null;
  }

  const camera = targetViewport.getCamera();
  const targetFocalPoint = isFinitePoint3(camera.focalPoint)
    ? camera.focalPoint
    : null;
  const targetViewPlaneNormal = isFinitePoint3(camera.viewPlaneNormal)
    ? camera.viewPlaneNormal
    : null;

  if (!targetFocalPoint || !targetViewPlaneNormal) {
    return null;
  }

  const worldSegment = getWorldSegmentForReferenceLine(
    sourceState.imageCornersWorld,
    targetFocalPoint,
    targetViewPlaneNormal,
  );

  if (!worldSegment) {
    return null;
  }

  const startCanvas = targetViewport.worldToCanvas(worldSegment.startWorld);
  const endCanvas = targetViewport.worldToCanvas(worldSegment.endWorld);

  if (!isFinitePoint2(startCanvas) || !isFinitePoint2(endCanvas)) {
    return null;
  }

  return {
    startCanvas,
    endCanvas,
  };
}
