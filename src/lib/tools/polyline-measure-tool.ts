import type { Types } from "@cornerstonejs/core";

export const POLYLINE_MEASURE_TOOL_NAME = "PolylineMeasure";

export type PolylineMeasureToolClass = {
  new (...args: unknown[]): unknown;
  toolName: string;
};

let polylineMeasureToolClass: PolylineMeasureToolClass | undefined;

interface PolylineMeasureEvent {
  detail: {
    element: HTMLDivElement;
    currentPoints: {
      canvas: Types.Point2;
    };
    key?: string;
  };
  type: string;
  preventDefault: () => void;
}

interface PolylineMeasureAnnotation {
  annotationUID: string;
  invalidated: boolean;
  data: {
    contour: {
      polyline: Types.Point3[];
      closed: boolean;
    };
    handles: {
      points: Types.Point3[];
    };
  };
}

interface PolylineMeasureDrawData {
  canvasPoints: Types.Point2[];
  newAnnotation: boolean;
  contourHoleProcessingEnabled: boolean;
}

interface PolylineMeasureCommonData {
  annotation: PolylineMeasureAnnotation;
  viewportIdsToRender: string[];
  movingTextBox: boolean;
}

function cloneCanvasPoint(point: Types.Point2): Types.Point2 {
  return [point[0], point[1]];
}

function areCanvasPointsEqual(a: Types.Point2, b: Types.Point2) {
  return Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
}

function getCommittedCanvasPoints(points: Types.Point2[]) {
  if (points.length < 2) {
    return points;
  }

  const nextPoints = points.map(cloneCanvasPoint);
  const lastPoint = nextPoints[nextPoints.length - 1];
  const previousPoint = nextPoints[nextPoints.length - 2];

  if (areCanvasPointsEqual(lastPoint, previousPoint)) {
    nextPoints.pop();
  }

  return nextPoints;
}

function addToolEventListener(
  element: HTMLDivElement,
  eventName: string,
  listener: EventListener,
) {
  element.addEventListener(eventName, listener);
}

function removeToolEventListener(
  element: HTMLDivElement,
  eventName: string,
  listener: EventListener,
) {
  element.removeEventListener(eventName, listener);
}

type RuntimePolylineTool = {
  drawData?: PolylineMeasureDrawData;
  commonData?: PolylineMeasureCommonData;
  isDrawing: boolean;
  deactivateDraw: (element: HTMLDivElement) => void;
  createMemo: (
    element: HTMLDivElement,
    annotation: PolylineMeasureAnnotation,
    options?: { newAnnotation?: boolean },
  ) => void;
  doneEditMemo: () => void;
  updateContourPolyline: (
    annotation: PolylineMeasureAnnotation,
    polylineData: {
      points: Types.Point2[];
      closed?: boolean;
    },
    transforms: {
      canvasToWorld: (point: Types.Point2) => Types.Point3;
      worldToCanvas: (point: Types.Point3) => Types.Point2;
    },
  ) => void;
  haltDrawing: (element: HTMLDivElement, canvasPoints: Types.Point2[]) => boolean;
};

export function createPolylineMeasureTool(
  core: typeof import("@cornerstonejs/core"),
  tools: typeof import("@cornerstonejs/tools"),
) {
  if (polylineMeasureToolClass) {
    return polylineMeasureToolClass;
  }

  const BaseTool = tools.PlanarFreehandROITool;
  type BaseToolConstructorArgs = ConstructorParameters<typeof BaseTool>;

  class PolylineMeasureTool extends BaseTool {
    static toolName = POLYLINE_MEASURE_TOOL_NAME;

    constructor(...args: BaseToolConstructorArgs) {
      super(...args);
      (this as unknown as RuntimePolylineTool).haltDrawing =
        this.haltPolylineDraw;

      this.addNewAnnotation = ((evt: PolylineMeasureEvent) => {
        const { element } = evt.detail;
        const annotation = this.createAnnotation(
          evt as never,
        ) as unknown as PolylineMeasureAnnotation;
        const enabledElement = core.getEnabledElement(element);

        if (!enabledElement) {
          throw new Error("Enabled element is unavailable for polyline measure.");
        }

        const { viewport } = enabledElement;
        const viewportIdsToRender = [viewport.id];

        this.addAnnotation(annotation, element);
        this.activatePolylineDraw(evt, annotation, viewportIdsToRender);
        evt.preventDefault();
        tools.utilities.triggerAnnotationRenderForViewportIds(
          viewportIdsToRender,
        );

        return annotation;
      }) as unknown as typeof this.addNewAnnotation;
    }

    haltPolylineDraw = (
      element: HTMLDivElement,
      canvasPoints: Types.Point2[],
    ) => {
      const tool = this as unknown as RuntimePolylineTool;
      const { commonData } = tool;

      if (canvasPoints.length >= 2 || !commonData) {
        return false;
      }

      tools.annotation.state.removeAnnotation(commonData.annotation.annotationUID);
      tool.isDrawing = false;
      tool.drawData = undefined;
      tool.commonData = undefined;
      tool.deactivateDraw(element);
      tools.utilities.triggerAnnotationRenderForViewportIds(
        commonData.viewportIdsToRender,
      );

      return true;
    };

    activatePolylineDraw(
      evt: PolylineMeasureEvent,
      annotation: PolylineMeasureAnnotation,
      viewportIdsToRender: string[],
    ) {
      const { currentPoints, element } = evt.detail;
      const canvasPoint = cloneCanvasPoint(currentPoints.canvas);
      const tool = this as unknown as RuntimePolylineTool;

      tool.isDrawing = true;
      tool.drawData = {
        canvasPoints: [canvasPoint, cloneCanvasPoint(canvasPoint)],
        newAnnotation: true,
        contourHoleProcessingEnabled: false,
      };
      tool.commonData = {
        annotation,
        viewportIdsToRender,
        movingTextBox: false,
      };

      tools.state.isInteractingWithTool = true;
      addToolEventListener(
        element,
        tools.Enums.Events.MOUSE_MOVE,
        this.mouseMovePolylineCallback as unknown as EventListener,
      );
      addToolEventListener(
        element,
        tools.Enums.Events.MOUSE_DOWN,
        this.mouseDownPolylineCallback as unknown as EventListener,
      );
      addToolEventListener(
        element,
        tools.Enums.Events.MOUSE_DOUBLE_CLICK,
        this.mouseDoubleClickPolylineCallback as unknown as EventListener,
      );
      addToolEventListener(
        element,
        tools.Enums.Events.KEY_DOWN,
        this.keyDownPolylineCallback as unknown as EventListener,
      );
    }

    deactivatePolylineDraw(element: HTMLDivElement) {
      tools.state.isInteractingWithTool = false;
      removeToolEventListener(
        element,
        tools.Enums.Events.MOUSE_MOVE,
        this.mouseMovePolylineCallback as unknown as EventListener,
      );
      removeToolEventListener(
        element,
        tools.Enums.Events.MOUSE_DOWN,
        this.mouseDownPolylineCallback as unknown as EventListener,
      );
      removeToolEventListener(
        element,
        tools.Enums.Events.MOUSE_DOUBLE_CLICK,
        this.mouseDoubleClickPolylineCallback as unknown as EventListener,
      );
      removeToolEventListener(
        element,
        tools.Enums.Events.KEY_DOWN,
        this.keyDownPolylineCallback as unknown as EventListener,
      );
    }

    mouseMovePolylineCallback = (evt: PolylineMeasureEvent) => {
      const tool = this as unknown as RuntimePolylineTool;
      const { drawData, commonData } = tool;

      if (!drawData || !commonData) {
        return;
      }

      const { canvasPoints } = drawData;
      const { canvas } = evt.detail.currentPoints;

      canvasPoints[canvasPoints.length - 1] = cloneCanvasPoint(canvas);

      tools.utilities.triggerAnnotationRenderForViewportIds(
        commonData.viewportIdsToRender,
      );
      evt.preventDefault();
    };

    mouseDownPolylineCallback = (evt: PolylineMeasureEvent) => {
      if (evt.type !== tools.Enums.Events.MOUSE_DOWN) {
        return;
      }

      const tool = this as unknown as RuntimePolylineTool;
      const { drawData, commonData } = tool;

      if (!drawData || !commonData) {
        return;
      }

      const { annotation } = commonData;
      const { currentPoints, element } = evt.detail;
      const nextCanvasPoint = cloneCanvasPoint(currentPoints.canvas);
      const { canvasPoints, newAnnotation } = drawData;

      tool.createMemo(element, annotation, { newAnnotation });
      drawData.newAnnotation = false;
      canvasPoints[canvasPoints.length - 1] = nextCanvasPoint;
      canvasPoints.push(cloneCanvasPoint(nextCanvasPoint));
      annotation.invalidated = true;

      tools.utilities.triggerAnnotationRenderForViewportIds(
        commonData.viewportIdsToRender,
      );
      evt.preventDefault();
    };

    mouseDoubleClickPolylineCallback = (evt: PolylineMeasureEvent) => {
      const tool = this as unknown as RuntimePolylineTool;
      const { drawData } = tool;

      if (!drawData) {
        return;
      }

      drawData.canvasPoints[drawData.canvasPoints.length - 1] = cloneCanvasPoint(
        evt.detail.currentPoints.canvas,
      );
      this.completePolylineDraw(evt);
      evt.preventDefault();
    };

    keyDownPolylineCallback = (evt: PolylineMeasureEvent) => {
      const key = evt.detail.key ?? "";

      if (key !== "Escape") {
        return;
      }

      this.completePolylineDraw(evt);
      evt.preventDefault();
    };

    completePolylineDraw(evt: PolylineMeasureEvent) {
      const tool = this as unknown as RuntimePolylineTool;
      const { drawData, commonData } = tool;

      if (!drawData || !commonData) {
        return;
      }

      const { annotation, viewportIdsToRender } = commonData;
      const { element } = evt.detail;
      const committedCanvasPoints = getCommittedCanvasPoints(drawData.canvasPoints);

      tool.doneEditMemo();

      if (committedCanvasPoints.length < 2) {
        tools.annotation.state.removeAnnotation(annotation.annotationUID);
        tool.isDrawing = false;
        tool.drawData = undefined;
        tool.commonData = undefined;
        this.deactivatePolylineDraw(element);
        tools.utilities.triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        return;
      }

      const enabledElement = core.getEnabledElement(element);

      if (!enabledElement) {
        return;
      }

      const { viewport } = enabledElement;

      tool.updateContourPolyline(
        annotation,
        {
          points: committedCanvasPoints,
          closed: false,
        },
        viewport,
      );

      const worldPoints = annotation.data.contour.polyline;
      annotation.data.handles.points = [
        worldPoints[0],
        worldPoints[worldPoints.length - 1],
      ];

      tool.isDrawing = false;
      tool.drawData = undefined;
      tool.commonData = undefined;
      this.deactivatePolylineDraw(element);
      tools.annotation.state.triggerContourAnnotationCompleted(annotation, false);
      tools.utilities.triggerAnnotationRenderForViewportIds(viewportIdsToRender);
    }
  }

  polylineMeasureToolClass = PolylineMeasureTool as PolylineMeasureToolClass;

  return PolylineMeasureTool;
}
