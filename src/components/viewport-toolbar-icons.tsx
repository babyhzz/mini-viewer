"use client";

import type { ComponentType, SVGProps } from "react";

import { ChevronOpen } from "@/components/ohif-icons/Sources/ChevronOpen";
import { Clipboard } from "@/components/ohif-icons/Sources/Clipboard";
import { DicomTagBrowser } from "@/components/ohif-icons/Sources/DicomTagBrowser";
import { GearSettings } from "@/components/ohif-icons/Sources/GearSettings";
import { IconMPR } from "@/components/ohif-icons/Sources/IconMPR";
import { Link } from "@/components/ohif-icons/Sources/Link";
import { More } from "@/components/ohif-icons/Sources/More";
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
  | "mprLayout"
  | "sequenceSync"
  | "length"
  | "polyline"
  | "freehand"
  | "angle"
  | "rectangleRoi"
  | "ellipseRoi"
  | "circleRoi"
  | "invert"
  | "dicomTag"
  | "annotationManage"
  | "annotationList"
  | "settings"
  | "chevronDown"
  | "overflow";

type ToolbarSvgComponent = ComponentType<SVGProps<SVGSVGElement>>;

function SelectCursorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
    </svg>
  );
}

function TrashOutlineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
    </svg>
  );
}

const VIEWPORT_TOOLBAR_ICON_MAP: Record<
  ViewportToolbarIconName,
  ToolbarSvgComponent
> = {
  select: SelectCursorIcon,
  pan: ToolMove,
  windowLevel: ToolWindowLevel,
  layout: ToolLayoutDefault,
  imageLayout: ViewportViews,
  mprLayout: IconMPR,
  sequenceSync: Link,
  length: ToolLength,
  polyline: ToolFreehandPolygon,
  freehand: ToolFreehand,
  angle: ToolAngle,
  rectangleRoi: ToolRectangle,
  ellipseRoi: ToolMeasureEllipse,
  circleRoi: ToolCircle,
  invert: ToolInvert,
  dicomTag: DicomTagBrowser,
  annotationManage: TrashOutlineIcon,
  annotationList: Clipboard,
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
