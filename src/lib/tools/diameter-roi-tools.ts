import type { Types } from "@cornerstonejs/core";

export const DIAMETER_ELLIPTICAL_ROI_TOOL_NAME = "DiameterEllipticalROI";
export const DIAMETER_CIRCLE_ROI_TOOL_NAME = "DiameterCircleROI";

interface RoiInteractionEvent {
  detail: {
    element: HTMLDivElement;
    currentPoints: {
      world: Types.Point3;
      canvas: Types.Point2;
    };
  };
  preventDefault: () => void;
}

interface RoiAnnotationLike {
  invalidated: boolean;
  data: {
    handles: {
      points: Types.Point3[];
    };
  };
}

interface DiameterDrawEditData<TAnnotation extends RoiAnnotationLike> {
  annotation: TAnnotation;
  viewportIdsToRender: string[];
  newAnnotation?: boolean;
  hasMoved?: boolean;
  anchorWorld?: Types.Point3;
  anchorCanvas?: Types.Point2;
}

function cloneCanvasPoint(point: Types.Point2): Types.Point2 {
  return [point[0], point[1]];
}

function cloneWorldPoint(point: Types.Point3): Types.Point3 {
  return [point[0], point[1], point[2]];
}

function getCanvasDragDistance(start: Types.Point2, end: Types.Point2) {
  return Math.hypot(end[0] - start[0], end[1] - start[1]);
}

function buildEllipseHandlesFromDiagonal(
  canvasToWorld: (point: Types.Point2) => Types.Point3,
  startCanvas: Types.Point2,
  endCanvas: Types.Point2,
) {
  const minX = Math.min(startCanvas[0], endCanvas[0]);
  const maxX = Math.max(startCanvas[0], endCanvas[0]);
  const minY = Math.min(startCanvas[1], endCanvas[1]);
  const maxY = Math.max(startCanvas[1], endCanvas[1]);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return [
    canvasToWorld([centerX, minY]),
    canvasToWorld([centerX, maxY]),
    canvasToWorld([minX, centerY]),
    canvasToWorld([maxX, centerY]),
  ];
}

function buildCircleHandlesFromDiameter(
  canvasToWorld: (point: Types.Point2) => Types.Point3,
  startCanvas: Types.Point2,
  endCanvas: Types.Point2,
) {
  const centerCanvas: Types.Point2 = [
    (startCanvas[0] + endCanvas[0]) / 2,
    (startCanvas[1] + endCanvas[1]) / 2,
  ];

  return [canvasToWorld(centerCanvas), canvasToWorld(cloneCanvasPoint(endCanvas))];
}

let diameterEllipticalRoiToolClass:
  | typeof import("@cornerstonejs/tools")["EllipticalROITool"]
  | undefined;
let diameterCircleRoiToolClass:
  | typeof import("@cornerstonejs/tools")["CircleROITool"]
  | undefined;

export function createDiameterEllipticalRoiTool(
  core: typeof import("@cornerstonejs/core"),
  tools: typeof import("@cornerstonejs/tools"),
): typeof import("@cornerstonejs/tools")["EllipticalROITool"] {
  if (diameterEllipticalRoiToolClass) {
    return diameterEllipticalRoiToolClass;
  }

  const BaseTool = tools.EllipticalROITool;
  type BaseToolConstructorArgs = ConstructorParameters<typeof BaseTool>;

  class DiameterEllipticalRoiTool extends BaseTool {
    static toolName = DIAMETER_ELLIPTICAL_ROI_TOOL_NAME;

    constructor(...args: BaseToolConstructorArgs) {
      super(...args);

      const baseAddNewAnnotation = this.addNewAnnotation.bind(this);

      this.addNewAnnotation = ((evt: RoiInteractionEvent) => {
        const annotation = baseAddNewAnnotation(evt as never) as RoiAnnotationLike;
        const runtime = this as unknown as {
          editData?: DiameterDrawEditData<RoiAnnotationLike>;
        };

        if (runtime.editData) {
          runtime.editData.anchorWorld = cloneWorldPoint(
            evt.detail.currentPoints.world,
          );
          runtime.editData.anchorCanvas = cloneCanvasPoint(
            evt.detail.currentPoints.canvas,
          );
        }

        return annotation as never;
      }) as typeof this.addNewAnnotation;

      this._dragDrawCallback = ((evt: RoiInteractionEvent) => {
        const runtime = this as unknown as {
          editData?: DiameterDrawEditData<RoiAnnotationLike>;
        };
        const editData = runtime.editData;

        if (!editData) {
          return;
        }

        const enabledElement = core.getEnabledElement(evt.detail.element);

        if (!enabledElement) {
          return;
        }

        const { viewport } = enabledElement;
        const { annotation, viewportIdsToRender, newAnnotation } = editData;
        const startCanvas =
          editData.anchorCanvas ??
          viewport.worldToCanvas(
            editData.anchorWorld ?? annotation.data.handles.points[0],
          );
        const endCanvas = cloneCanvasPoint(evt.detail.currentPoints.canvas);

        editData.anchorCanvas = cloneCanvasPoint(startCanvas);
        this.createMemo(evt.detail.element, annotation, { newAnnotation });
        annotation.data.handles.points = buildEllipseHandlesFromDiagonal(
          viewport.canvasToWorld,
          startCanvas,
          endCanvas,
        );
        annotation.invalidated = true;
        editData.hasMoved = getCanvasDragDistance(startCanvas, endCanvas) >= 1;
        tools.utilities.triggerAnnotationRenderForViewportIds(
          viewportIdsToRender,
        );
      }) as typeof this._dragDrawCallback;
    }
  }

  diameterEllipticalRoiToolClass = DiameterEllipticalRoiTool;
  return diameterEllipticalRoiToolClass;
}

export function createDiameterCircleRoiTool(
  core: typeof import("@cornerstonejs/core"),
  tools: typeof import("@cornerstonejs/tools"),
): typeof import("@cornerstonejs/tools")["CircleROITool"] {
  if (diameterCircleRoiToolClass) {
    return diameterCircleRoiToolClass;
  }

  const BaseTool = tools.CircleROITool;
  type BaseToolConstructorArgs = ConstructorParameters<typeof BaseTool>;

  class DiameterCircleRoiTool extends BaseTool {
    static toolName = DIAMETER_CIRCLE_ROI_TOOL_NAME;

    constructor(...args: BaseToolConstructorArgs) {
      super(...args);

      const baseAddNewAnnotation = this.addNewAnnotation.bind(this);

      this.addNewAnnotation = ((evt: RoiInteractionEvent) => {
        const annotation = baseAddNewAnnotation(evt as never) as RoiAnnotationLike;
        const runtime = this as unknown as {
          editData?: DiameterDrawEditData<RoiAnnotationLike>;
        };

        if (runtime.editData) {
          runtime.editData.anchorWorld = cloneWorldPoint(
            evt.detail.currentPoints.world,
          );
          runtime.editData.anchorCanvas = cloneCanvasPoint(
            evt.detail.currentPoints.canvas,
          );
        }

        return annotation as never;
      }) as typeof this.addNewAnnotation;

      this._dragDrawCallback = ((evt: RoiInteractionEvent) => {
        const runtime = this as unknown as {
          editData?: DiameterDrawEditData<RoiAnnotationLike>;
        };
        const editData = runtime.editData;

        if (!editData) {
          return;
        }

        const enabledElement = core.getEnabledElement(evt.detail.element);

        if (!enabledElement) {
          return;
        }

        const { viewport } = enabledElement;
        const { annotation, viewportIdsToRender, newAnnotation } = editData;
        const startCanvas =
          editData.anchorCanvas ??
          viewport.worldToCanvas(
            editData.anchorWorld ?? annotation.data.handles.points[0],
          );
        const endCanvas = cloneCanvasPoint(evt.detail.currentPoints.canvas);

        editData.anchorCanvas = cloneCanvasPoint(startCanvas);
        this.createMemo(evt.detail.element, annotation, { newAnnotation });
        annotation.data.handles.points = buildCircleHandlesFromDiameter(
          viewport.canvasToWorld,
          startCanvas,
          endCanvas,
        );
        annotation.invalidated = true;
        editData.hasMoved = getCanvasDragDistance(startCanvas, endCanvas) >= 1;
        tools.utilities.triggerAnnotationRenderForViewportIds(
          viewportIdsToRender,
        );
      }) as typeof this._dragDrawCallback;
    }
  }

  diameterCircleRoiToolClass = DiameterCircleRoiTool;
  return diameterCircleRoiToolClass;
}
