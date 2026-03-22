"use client";

import type { ComponentType, SVGProps } from "react";

import { ChevronOpen } from "@/components/ohif-icons/Sources/ChevronOpen";
import { GearSettings } from "@/components/ohif-icons/Sources/GearSettings";
import { ListView } from "@/components/ohif-icons/Sources/ListView";
import { More } from "@/components/ohif-icons/Sources/More";
import { Trash } from "@/components/ohif-icons/Sources/Trash";
import { ViewportViews } from "@/components/ohif-icons/Sources/ViewportViews";
import {
  ToolAngle,
  ToolCircle,
  ToolFreehand,
  ToolFreehandPolygon,
  ToolInvert,
  ToolLayoutDefault,
  ToolLength,
  ToolMeasureEllipse,
  ToolMove,
  ToolRectangle,
  ToolStackScroll,
  ToolWindowLevel,
} from "@/components/ohif-icons/Sources/Tools";

interface ToolbarIconProps {
  className?: string;
}

export type ViewportToolbarIconName =
  | "select"
  | "pan"
  | "windowLevel"
  | "layout"
  | "imageLayout"
  | "length"
  | "polyline"
  | "freehand"
  | "angle"
  | "rectangleRoi"
  | "ellipseRoi"
  | "circleRoi"
  | "invert"
  | "annotationManage"
  | "annotationList"
  | "settings"
  | "chevronDown"
  | "overflow";

type ToolbarSvgComponent = ComponentType<SVGProps<SVGSVGElement>>;

const VIEWPORT_TOOLBAR_ICON_MAP: Record<
  ViewportToolbarIconName,
  ToolbarSvgComponent
> = {
  select: ToolStackScroll,
  pan: ToolMove,
  windowLevel: ToolWindowLevel,
  layout: ToolLayoutDefault,
  imageLayout: ViewportViews,
  length: ToolLength,
  polyline: ToolFreehandPolygon,
  freehand: ToolFreehand,
  angle: ToolAngle,
  rectangleRoi: ToolRectangle,
  ellipseRoi: ToolMeasureEllipse,
  circleRoi: ToolCircle,
  invert: ToolInvert,
  annotationManage: Trash,
  annotationList: ListView,
  settings: GearSettings,
  chevronDown: ChevronOpen,
  overflow: More,
};

export function ViewportToolbarIcon({
  name,
  className,
}: ToolbarIconProps & { name: ViewportToolbarIconName }) {
  const IconComponent =
    VIEWPORT_TOOLBAR_ICON_MAP[name] ?? VIEWPORT_TOOLBAR_ICON_MAP.select;

  return <IconComponent className={className} />;
}
