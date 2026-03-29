export type ViewportTool =
  | "select"
  | "pan"
  | "zoom"
  | "windowLevel"
  | "length"
  | "polyline"
  | "freehand"
  | "angle"
  | "rectangleRoi"
  | "ellipseRoi"
  | "circleRoi";
export type ViewportAction = "invert" | "dicomTag" | "annotationList";
export type ViewportToolbarMenu =
  | "windowPreset"
  | "layout"
  | "imageLayout"
  | "mprLayout"
  | "sequenceSync"
  | "annotationManage";
export type ViewportViewAction =
  | "fit"
  | "reset"
  | "rotateRight"
  | "flipHorizontal"
  | "flipVertical";
export type ViewportToolGroupId = "measure" | "roi";
export type ViewportToolbarItemId =
  | ViewportTool
  | ViewportAction
  | ViewportToolbarMenu
  | ViewportToolGroupId
  | ViewportViewAction;
export type ViewportToolbarIconKey =
  | "select"
  | "pan"
  | "zoom"
  | "windowLevel"
  | "windowPreset"
  | "fit"
  | "reset"
  | "rotateRight"
  | "flipHorizontal"
  | "flipVertical"
  | "layout"
  | "imageLayout"
  | "mprLayout"
  | "sequenceSync"
  | "measure"
  | "roi"
  | "invert"
  | "dicomTag"
  | "annotationManage"
  | "annotationList";

interface ViewportToolDefinition {
  id: ViewportTool;
  label: string;
  shortLabel: string;
  hint: string;
  interactionHint: string;
  createsAnnotation: boolean;
  toolbarGroupId?: ViewportToolGroupId;
  cornerstoneToolName: string;
}

interface ViewportActionDefinition {
  id: ViewportAction;
  label: string;
  hint: string;
}

interface ViewportViewActionDefinition {
  id: ViewportViewAction;
  label: string;
  hint: string;
}

interface ViewportToolbarMenuDefinition {
  id: ViewportToolbarMenu;
  label: string;
  hint: string;
}

interface ViewportToolGroupDefinition {
  id: ViewportToolGroupId;
  label: string;
  hint: string;
  toolIds: ViewportTool[];
  defaultToolId: ViewportTool;
}

export interface ViewportToolbarDirectToolItem {
  id: ViewportTool;
  kind: "tool";
  label: string;
  hint: string;
  iconKey: ViewportToolbarIconKey;
}

export interface ViewportToolbarActionItem {
  id: ViewportAction;
  kind: "action";
  label: string;
  hint: string;
  iconKey: ViewportToolbarIconKey;
}

export interface ViewportToolbarGroupItem {
  id: ViewportToolGroupId;
  kind: "group";
  label: string;
  hint: string;
  iconKey: ViewportToolbarIconKey;
}

export interface ViewportToolbarViewActionItem {
  id: ViewportViewAction;
  kind: "viewAction";
  label: string;
  hint: string;
  iconKey: ViewportToolbarIconKey;
}

export interface ViewportToolbarMenuItem {
  id: ViewportToolbarMenu;
  kind: "menu";
  label: string;
  hint: string;
  iconKey: ViewportToolbarIconKey;
}

export type ViewportToolbarItemDefinition =
  | ViewportToolbarDirectToolItem
  | ViewportToolbarActionItem
  | ViewportToolbarGroupItem
  | ViewportToolbarViewActionItem
  | ViewportToolbarMenuItem;

export type ViewportToolGroupSelections = Record<
  ViewportToolGroupId,
  ViewportTool
>;

export const FREEHAND_MEASURE_TOOL_NAME = "FreehandMeasure";
export const POLYLINE_MEASURE_TOOL_NAME = "PolylineMeasure";

const viewportToolDefinitions: Record<ViewportTool, ViewportToolDefinition> = {
  select: {
    id: "select",
    label: "选择",
    shortLabel: "选择",
    hint: "单击选择当前视口，左键上下滑动翻页",
    interactionHint: "单击选择视口 · 左键上下滑动翻页 · 滚轮翻页",
    createsAnnotation: false,
    cornerstoneToolName: "StackScroll",
  },
  pan: {
    id: "pan",
    label: "平移",
    shortLabel: "平移",
    hint: "左键拖动画面",
    interactionHint: "左键平移 · 滚轮翻页",
    createsAnnotation: false,
    cornerstoneToolName: "Pan",
  },
  zoom: {
    id: "zoom",
    label: "缩放",
    shortLabel: "缩放",
    hint: "左键上下拖动缩放图像",
    interactionHint: "左键拖动缩放 · 滚轮翻页",
    createsAnnotation: false,
    cornerstoneToolName: "Zoom",
  },
  windowLevel: {
    id: "windowLevel",
    label: "调窗",
    shortLabel: "调窗",
    hint: "左键拖动调节窗宽窗位",
    interactionHint: "左键拖动调窗 · 滚轮翻页",
    createsAnnotation: false,
    cornerstoneToolName: "WindowLevel",
  },
  length: {
    id: "length",
    label: "直线测量",
    shortLabel: "直线",
    hint: "左键拖动绘制直线距离",
    interactionHint: "左键拖动测量直线 · 滚轮翻页",
    createsAnnotation: true,
    toolbarGroupId: "measure",
    cornerstoneToolName: "Length",
  },
  angle: {
    id: "angle",
    label: "角度测量",
    shortLabel: "角度",
    hint: "左键依次绘制三点角度",
    interactionHint: "左键绘制三点角度 · 滚轮翻页",
    createsAnnotation: true,
    toolbarGroupId: "measure",
    cornerstoneToolName: "Angle",
  },
  polyline: {
    id: "polyline",
    label: "折线测量",
    shortLabel: "折线",
    hint: "左键逐点添加折点，双击结束测量",
    interactionHint: "左键逐点添加折点，双击结束 · 滚轮翻页",
    createsAnnotation: true,
    toolbarGroupId: "measure",
    cornerstoneToolName: POLYLINE_MEASURE_TOOL_NAME,
  },
  freehand: {
    id: "freehand",
    label: "自由线测量",
    shortLabel: "自由线",
    hint: "按住左键自由勾画测量轨迹",
    interactionHint: "左键拖动自由勾画 · 滚轮翻页",
    createsAnnotation: true,
    toolbarGroupId: "measure",
    cornerstoneToolName: FREEHAND_MEASURE_TOOL_NAME,
  },
  rectangleRoi: {
    id: "rectangleRoi",
    label: "矩形 ROI",
    shortLabel: "矩形",
    hint: "左键拖动绘制矩形 ROI",
    interactionHint: "左键拖动绘制矩形 ROI · 滚轮翻页",
    createsAnnotation: true,
    toolbarGroupId: "roi",
    cornerstoneToolName: "RectangleROI",
  },
  ellipseRoi: {
    id: "ellipseRoi",
    label: "椭圆 ROI",
    shortLabel: "椭圆",
    hint: "左键拖动绘制椭圆 ROI",
    interactionHint: "左键拖动绘制椭圆 ROI · 滚轮翻页",
    createsAnnotation: true,
    toolbarGroupId: "roi",
    cornerstoneToolName: "EllipticalROI",
  },
  circleRoi: {
    id: "circleRoi",
    label: "圆形 ROI",
    shortLabel: "圆形",
    hint: "左键拖动绘制圆形 ROI",
    interactionHint: "左键拖动绘制圆形 ROI · 滚轮翻页",
    createsAnnotation: true,
    toolbarGroupId: "roi",
    cornerstoneToolName: "CircleROI",
  },
};

const viewportActionDefinitions: Record<
  ViewportAction,
  ViewportActionDefinition
> = {
  invert: {
    id: "invert",
    label: "反色",
    hint: "单击切换黑白反色",
  },
  dicomTag: {
    id: "dicomTag",
    label: "Dicom Tag",
    hint: "查看当前图像的 DICOM Tag",
  },
  annotationList: {
    id: "annotationList",
    label: "图元列表",
    hint: "打开当前视口图元列表",
  },
};

const viewportViewActionDefinitions: Record<
  ViewportViewAction,
  ViewportViewActionDefinition
> = {
  fit: {
    id: "fit",
    label: "适应窗口",
    hint: "将图像缩放并居中到当前视口",
  },
  reset: {
    id: "reset",
    label: "重置视图",
    hint: "恢复缩放、平移、旋转、翻转和窗宽窗位",
  },
  rotateRight: {
    id: "rotateRight",
    label: "顺时针旋转",
    hint: "顺时针旋转当前图像 90 度",
  },
  flipHorizontal: {
    id: "flipHorizontal",
    label: "水平翻转",
    hint: "按左右方向镜像当前图像",
  },
  flipVertical: {
    id: "flipVertical",
    label: "垂直翻转",
    hint: "按上下方向镜像当前图像",
  },
};

const viewportToolbarMenuDefinitions: Record<
  ViewportToolbarMenu,
  ViewportToolbarMenuDefinition
> = {
  windowPreset: {
    id: "windowPreset",
    label: "窗宽预设",
    hint: "切换当前视口的窗宽窗位预设",
  },
  layout: {
    id: "layout",
    label: "布局",
    hint: "切换视口布局",
  },
  imageLayout: {
    id: "imageLayout",
    label: "图像布局",
    hint: "切换当前视口内的序列图像布局",
  },
  annotationManage: {
    id: "annotationManage",
    label: "删除图元",
    hint: "删除选中图元或清空当前视口",
  },
  mprLayout: {
    id: "mprLayout",
    label: "MPR",
    hint: "切换当前视口的 MPR 三视图布局",
  },
  sequenceSync: {
    id: "sequenceSync",
    label: "序列同步",
    hint: "切换当前视口的同检查或跨检查序列同步",
  },
};

const viewportToolGroupDefinitions: Record<
  ViewportToolGroupId,
  ViewportToolGroupDefinition
> = {
  measure: {
    id: "measure",
    label: "测量",
    hint: "测量工具组",
    toolIds: ["length", "polyline", "freehand", "angle"],
    defaultToolId: "length",
  },
  roi: {
    id: "roi",
    label: "ROI",
    hint: "区域工具组",
    toolIds: ["rectangleRoi", "ellipseRoi", "circleRoi"],
    defaultToolId: "rectangleRoi",
  },
};

export const viewportToolbarItems: ViewportToolbarItemDefinition[] = [
  {
    id: "select",
    kind: "tool",
    label: "选择",
    hint: viewportToolDefinitions.select.hint,
    iconKey: "select",
  },
  {
    id: "pan",
    kind: "tool",
    label: "平移",
    hint: viewportToolDefinitions.pan.hint,
    iconKey: "pan",
  },
  {
    id: "zoom",
    kind: "tool",
    label: "缩放",
    hint: viewportToolDefinitions.zoom.hint,
    iconKey: "zoom",
  },
  {
    id: "windowLevel",
    kind: "tool",
    label: "调窗",
    hint: viewportToolDefinitions.windowLevel.hint,
    iconKey: "windowLevel",
  },
  {
    id: "windowPreset",
    kind: "menu",
    label: "窗宽预设",
    hint: viewportToolbarMenuDefinitions.windowPreset.hint,
    iconKey: "windowPreset",
  },
  {
    id: "measure",
    kind: "group",
    label: "测量",
    hint: viewportToolGroupDefinitions.measure.hint,
    iconKey: "measure",
  },
  {
    id: "roi",
    kind: "group",
    label: "ROI",
    hint: viewportToolGroupDefinitions.roi.hint,
    iconKey: "roi",
  },
  {
    id: "invert",
    kind: "action",
    label: "反色",
    hint: viewportActionDefinitions.invert.hint,
    iconKey: "invert",
  },
  {
    id: "fit",
    kind: "viewAction",
    label: "适应窗口",
    hint: viewportViewActionDefinitions.fit.hint,
    iconKey: "fit",
  },
  {
    id: "reset",
    kind: "viewAction",
    label: "重置视图",
    hint: viewportViewActionDefinitions.reset.hint,
    iconKey: "reset",
  },
  {
    id: "rotateRight",
    kind: "viewAction",
    label: "顺时针旋转",
    hint: viewportViewActionDefinitions.rotateRight.hint,
    iconKey: "rotateRight",
  },
  {
    id: "dicomTag",
    kind: "action",
    label: "Dicom Tag",
    hint: viewportActionDefinitions.dicomTag.hint,
    iconKey: "dicomTag",
  },
  {
    id: "imageLayout",
    kind: "menu",
    label: "图像布局",
    hint: viewportToolbarMenuDefinitions.imageLayout.hint,
    iconKey: "imageLayout",
  },
  {
    id: "mprLayout",
    kind: "menu",
    label: "MPR",
    hint: viewportToolbarMenuDefinitions.mprLayout.hint,
    iconKey: "mprLayout",
  },
  {
    id: "sequenceSync",
    kind: "menu",
    label: "序列同步",
    hint: viewportToolbarMenuDefinitions.sequenceSync.hint,
    iconKey: "sequenceSync",
  },
  {
    id: "layout",
    kind: "menu",
    label: "布局",
    hint: viewportToolbarMenuDefinitions.layout.hint,
    iconKey: "layout",
  },
  {
    id: "annotationManage",
    kind: "menu",
    label: "删除图元",
    hint: viewportToolbarMenuDefinitions.annotationManage.hint,
    iconKey: "annotationManage",
  },
];

export function createDefaultViewportToolGroupSelections(): ViewportToolGroupSelections {
  return {
    measure: viewportToolGroupDefinitions.measure.defaultToolId,
    roi: viewportToolGroupDefinitions.roi.defaultToolId,
  };
}

export function getViewportToolDefinition(toolId: ViewportTool) {
  return viewportToolDefinitions[toolId];
}

export function getViewportToolDefinitions() {
  return Object.values(viewportToolDefinitions);
}

export function getViewportActionDefinition(actionId: ViewportAction) {
  return viewportActionDefinitions[actionId];
}

export function getViewportViewActionDefinition(actionId: ViewportViewAction) {
  return viewportViewActionDefinitions[actionId];
}

export function getViewportToolbarMenuDefinition(menuId: ViewportToolbarMenu) {
  return viewportToolbarMenuDefinitions[menuId];
}

export function getViewportToolGroupDefinition(groupId: ViewportToolGroupId) {
  return viewportToolGroupDefinitions[groupId];
}

export function getViewportToolGroupId(toolId: ViewportTool) {
  return viewportToolDefinitions[toolId].toolbarGroupId ?? null;
}

export function getViewportToolGroupSelection(
  groupId: ViewportToolGroupId,
  selections: Partial<ViewportToolGroupSelections>,
) {
  const groupDefinition = getViewportToolGroupDefinition(groupId);
  const selectedToolId = selections[groupId];

  if (selectedToolId && groupDefinition.toolIds.includes(selectedToolId)) {
    return selectedToolId;
  }

  return groupDefinition.defaultToolId;
}

export function getViewportToolDisplayLabel(toolId: ViewportTool) {
  return viewportToolDefinitions[toolId].label;
}

export function getViewportToolShortLabel(toolId: ViewportTool) {
  return viewportToolDefinitions[toolId].shortLabel;
}

export const MPR_COMPATIBLE_VIEWPORT_TOOLS: ViewportTool[] = [
  "select",
  "pan",
  "zoom",
  "windowLevel",
];

export function isViewportToolSupportedInMpr(toolId: ViewportTool) {
  return MPR_COMPATIBLE_VIEWPORT_TOOLS.includes(toolId);
}

export function getViewportToolInteractionHint(toolId: ViewportTool) {
  return viewportToolDefinitions[toolId].interactionHint;
}

export function getViewportToolCornerstoneName(toolId: ViewportTool) {
  return viewportToolDefinitions[toolId].cornerstoneToolName;
}

export function isViewportAnnotationTool(toolId: ViewportTool) {
  return viewportToolDefinitions[toolId].createsAnnotation;
}

export function getViewportToolFromCornerstoneName(
  cornerstoneToolName: string,
) {
  const matchingDefinition = Object.values(viewportToolDefinitions).find(
    (toolDefinition) =>
      toolDefinition.cornerstoneToolName === cornerstoneToolName,
  );

  return matchingDefinition?.id ?? null;
}

export function isViewportToolInGroup(
  toolId: ViewportTool,
  groupId: ViewportToolGroupId,
) {
  return getViewportToolGroupDefinition(groupId).toolIds.includes(toolId);
}

export function isViewportToolbarAction(
  itemId: ViewportToolbarItemId,
): itemId is ViewportAction {
  return itemId in viewportActionDefinitions;
}

export function isViewportToolbarGroup(
  itemId: ViewportToolbarItemId,
): itemId is ViewportToolGroupId {
  return itemId in viewportToolGroupDefinitions;
}
