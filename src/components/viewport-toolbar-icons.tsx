"use client";

import { AppIcon } from "@/components/app-icon";

interface ToolbarIconProps {
  className?: string;
}

export type ViewportToolbarIconName =
  | "select"
  | "pan"
  | "zoom"
  | "windowLevel"
  | "windowPreset"
  | "cine"
  | "fit"
  | "reset"
  | "rotateRight"
  | "flipHorizontal"
  | "flipVertical"
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
  | "keyImage"
  | "keyImageList"
  | "dicomTag"
  | "annotationManage"
  | "annotationList"
  | "settings"
  | "overflow";

export function ViewportToolbarIcon({
  name,
  className,
}: ToolbarIconProps & { name: ViewportToolbarIconName }) {
  return <AppIcon name={name} className={className} />;
}
