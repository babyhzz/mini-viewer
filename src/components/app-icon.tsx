"use client";

import type {
  HTMLAttributes,
  ReactNode,
  SVGProps,
} from "react";

export type AppIconName =
  | "annotationList"
  | "annotationManage"
  | "angle"
  | "arrow-clockwise"
  | "arrow-down"
  | "arrow-repeat"
  | "arrow-up"
  | "caret-right-fill"
  | "chevron-down"
  | "cine"
  | "circleRoi"
  | "dicomTag"
  | "ellipseRoi"
  | "exclamation-circle"
  | "fit"
  | "floppy"
  | "flipHorizontal"
  | "flipVertical"
  | "freehand"
  | "imageLayout"
  | "invert"
  | "keyImage"
  | "keyImageList"
  | "keyboard"
  | "layout"
  | "length"
  | "mprLayout"
  | "mprSlab"
  | "overflow"
  | "pan"
  | "pencil-square"
  | "plus-lg"
  | "polyline"
  | "referenceLines"
  | "redo"
  | "rectangleRoi"
  | "reset"
  | "rotateRight"
  | "select"
  | "sequenceSync"
  | "settings"
  | "trash3"
  | "undo"
  | "windowLevel"
  | "windowPreset"
  | "x-lg"
  | "zoom";

interface AppIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: AppIconName;
}

const ICON_VIEWBOX_SIZE = 32;
const ICON_SOURCE_GRID_SIZE = 24;
const ICON_SCALE = ICON_VIEWBOX_SIZE / ICON_SOURCE_GRID_SIZE;

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.55 / ICON_SCALE,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SvgIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 ${ICON_VIEWBOX_SIZE} ${ICON_VIEWBOX_SIZE}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`scale(${ICON_SCALE})`}>{children}</g>
    </svg>
  );
}

function StrokePath(props: SVGProps<SVGPathElement>) {
  return <path {...STROKE_PROPS} {...props} />;
}

function StrokeRect(props: SVGProps<SVGRectElement>) {
  return <rect {...STROKE_PROPS} {...props} />;
}

function StrokeCircle(props: SVGProps<SVGCircleElement>) {
  return <circle {...STROKE_PROPS} {...props} />;
}

function StrokeEllipse(props: SVGProps<SVGEllipseElement>) {
  return <ellipse {...STROKE_PROPS} {...props} />;
}

function AccentPath(props: SVGProps<SVGPathElement>) {
  return (
    <path
      fill="var(--app-icon-accent, currentColor)"
      opacity={0.32}
      {...props}
    />
  );
}

function AccentRect(props: SVGProps<SVGRectElement>) {
  return (
    <rect
      fill="var(--app-icon-accent, currentColor)"
      opacity={0.32}
      {...props}
    />
  );
}

function AccentCircle(props: SVGProps<SVGCircleElement>) {
  return (
    <circle
      fill="var(--app-icon-accent, currentColor)"
      opacity={0.32}
      {...props}
    />
  );
}

function SolidCircle(props: SVGProps<SVGCircleElement>) {
  return <circle fill="currentColor" {...props} />;
}

const icons: Record<AppIconName, ReactNode> = {
  select: (
    <>
      <StrokePath d="M5.35 7.4V5.35H7.4" />
      <StrokePath d="M16.6 5.35H18.65V7.4" />
      <StrokePath d="M18.65 16.6V18.65H16.6" />
      <StrokePath d="M7.4 18.65H5.35V16.6" />
      <path
        d="M7.1 5.1L14.52 12.26L11.56 12.98L13.48 17.72L11.45 18.54L9.54 13.8L7.32 15.97L7.1 5.1Z"
        fill="currentColor"
      />
    </>
  ),
  pan: (
    <>
      <AccentRect x="9.35" y="9.35" width="5.3" height="5.3" rx="0.95" />
      <StrokePath d="M12 4.5V8.1" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M12 15.9V19.5" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M4.5 12H8.1" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M15.9 12H19.5" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M12 4.5L9.65 6.85" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M12 4.5L14.35 6.85" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M12 19.5L9.65 17.15" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M12 19.5L14.35 17.15" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M4.5 12L6.85 9.65" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M4.5 12L6.85 14.35" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M19.5 12L17.15 9.65" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M19.5 12L17.15 14.35" strokeWidth={1.8 / ICON_SCALE} />
    </>
  ),
  zoom: (
    <>
      <AccentCircle cx="10.35" cy="10.35" r="3.45" />
      <StrokeCircle cx="10.35" cy="10.35" r="5.45" />
      <StrokePath d="M14.25 14.25L18.95 18.95" strokeWidth={1.8 / ICON_SCALE} />
      <StrokePath d="M10.35 7.95V12.75" />
      <StrokePath d="M7.95 10.35H12.75" />
    </>
  ),
  windowLevel: (
    <>
      <AccentPath d="M12 6.15A5.85 5.85 0 0 1 12 17.85V6.15Z" />
      <StrokeCircle cx="12" cy="12" r="5.85" />
      <StrokePath d="M8.85 15.15L15.15 8.85" />
      <StrokePath d="M12 3.9V6.15" />
      <StrokePath d="M12 17.85V20.1" />
      <StrokePath d="M3.9 12H6.15" />
      <StrokePath d="M17.85 12H20.1" />
    </>
  ),
  windowPreset: (
    <>
      <StrokeRect x="5.15" y="5.55" width="13.7" height="12.9" rx="1.25" />
      <AccentRect x="6.5" y="7" width="11" height="2.2" rx="0.65" />
      <StrokePath d="M6.9 11.45H17.1" />
      <StrokePath d="M6.9 14.2H14" />
      <StrokePath d="M6.9 16.95H11.7" />
    </>
  ),
  cine: (
    <>
      <StrokeRect x="5.05" y="6.15" width="13.9" height="11.7" rx="1.2" />
      <StrokePath d="M8.05 6.15V17.85" />
      <StrokePath d="M15.95 6.15V17.85" />
      <SolidCircle cx="6.35" cy="8.9" r="0.6" />
      <SolidCircle cx="6.35" cy="12" r="0.6" />
      <SolidCircle cx="6.35" cy="15.1" r="0.6" />
      <SolidCircle cx="17.65" cy="8.9" r="0.6" />
      <SolidCircle cx="17.65" cy="12" r="0.6" />
      <SolidCircle cx="17.65" cy="15.1" r="0.6" />
      <path d="M10 9L14.8 12L10 15V9Z" fill="currentColor" />
    </>
  ),
  fit: (
    <>
      <AccentRect x="8.45" y="8.45" width="7.1" height="7.1" rx="0.9" />
      <StrokeRect x="8.45" y="8.45" width="7.1" height="7.1" rx="0.9" />
      <StrokePath d="M9.1 5H5V9.1" />
      <StrokePath d="M14.9 5H19V9.1" />
      <StrokePath d="M19 14.9V19H14.9" />
      <StrokePath d="M9.1 19H5V14.9" />
    </>
  ),
  reset: (
    <>
      <StrokeRect x="8.2" y="8.2" width="7.6" height="7.6" rx="1" />
      <StrokePath d="M8.1 5.75H4.95V8.9" />
      <StrokePath d="M5 8.85A7.1 7.1 0 1 0 12.05 4.9C10.68 4.9 9.4 5.22 8.1 5.75" />
    </>
  ),
  rotateRight: (
    <>
      <StrokeRect x="8.1" y="8.1" width="7.8" height="7.8" rx="1" />
      <StrokePath d="M14.15 5H18.8V9.65" />
      <StrokePath d="M18.8 9.65A7.35 7.35 0 0 1 5.9 13.2" />
    </>
  ),
  flipHorizontal: (
    <>
      <AccentRect x="6" y="7" width="5.6" height="10" rx="0.8" />
      <StrokeRect x="5" y="6" width="14" height="12" rx="1" />
      <StrokePath d="M12 7V17" />
      <StrokePath d="M8.1 10L5.7 12L8.1 14" />
      <StrokePath d="M15.9 10L18.3 12L15.9 14" />
      <StrokePath d="M11.1 12H6.1" />
      <StrokePath d="M12.9 12H17.9" />
    </>
  ),
  flipVertical: (
    <>
      <AccentRect x="7" y="6" width="10" height="5.6" rx="0.8" />
      <StrokeRect x="6" y="5" width="12" height="14" rx="1" />
      <StrokePath d="M7 12H17" />
      <StrokePath d="M10 8.1L12 5.7L14 8.1" />
      <StrokePath d="M10 15.9L12 18.3L14 15.9" />
      <StrokePath d="M12 11.1V6.1" />
      <StrokePath d="M12 12.9V17.9" />
    </>
  ),
  layout: (
    <>
      <StrokeRect x="4.6" y="6.05" width="14.8" height="11.9" rx="1.15" />
      <AccentRect x="12.75" y="7.15" width="5.55" height="3.85" rx="0.6" />
      <StrokePath d="M11.95 6.05V17.95" />
      <StrokePath d="M11.95 12H19.4" />
    </>
  ),
  imageLayout: (
    <>
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <AccentRect x="6.15" y="6.15" width="5.15" height="5.15" rx="0.65" />
      <StrokePath d="M12 5V19" />
      <StrokePath d="M5 12H19" />
    </>
  ),
  mprLayout: (
    <>
      <AccentRect x="6.15" y="6.15" width="5.25" height="5.25" rx="0.65" />
      <rect
        x="12.6"
        y="6.15"
        width="5.25"
        height="5.25"
        rx="0.65"
        fill="currentColor"
        opacity="0.14"
      />
      <rect
        x="6.15"
        y="12.6"
        width="11.7"
        height="5.25"
        rx="0.65"
        fill="currentColor"
        opacity="0.22"
      />
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M12 5V11.4" />
      <StrokePath d="M5 12H19" />
    </>
  ),
  mprSlab: (
    <>
      <StrokeRect x="5" y="5.45" width="14" height="13.1" rx="1.2" />
      <AccentRect x="7" y="10.2" width="10" height="3.55" rx="0.55" />
      <StrokePath d="M7 8.3H17" />
      <StrokePath d="M7 10H17" />
      <StrokePath d="M7 14H17" />
      <StrokePath d="M7 15.7H17" />
      <StrokePath d="M19.1 9.35L21 12L19.1 14.65" />
    </>
  ),
  sequenceSync: (
    <>
      <StrokeRect x="4.85" y="7.1" width="4.9" height="9.8" rx="0.9" />
      <AccentRect x="15.15" y="8.3" width="3.3" height="7.4" rx="0.55" />
      <StrokeRect x="14.25" y="7.1" width="4.9" height="9.8" rx="0.9" />
      <StrokePath d="M9.95 10.05L11.25 8.75C11.95 8.05 13.1 8.05 13.8 8.75C14.5 9.45 14.5 10.6 13.8 11.3L13 12.1" />
      <StrokePath d="M14.05 13.95L12.75 15.25C12.05 15.95 10.9 15.95 10.2 15.25C9.5 14.55 9.5 13.4 10.2 12.7L11 11.9" />
    </>
  ),
  length: (
    <>
      <StrokePath d="M6.4 16.6L17.6 7.4" />
      <StrokePath d="M5.2 15.1L7.6 18.1" />
      <StrokePath d="M16.4 5.9L18.8 8.9" />
      <StrokePath d="M9.5 14L10.9 15.7" />
      <StrokePath d="M12.2 11.8L13.5 13.4" />
      <StrokePath d="M14.7 9.7L16 11.3" />
    </>
  ),
  polyline: (
    <>
      <StrokePath d="M5.5 16.1L10 9.5L14 13L18.5 7.5" />
      <SolidCircle cx="5.5" cy="16.1" r="1" />
      <SolidCircle cx="10" cy="9.5" r="1" />
      <SolidCircle cx="14" cy="13" r="1" />
      <SolidCircle cx="18.5" cy="7.5" r="1" />
    </>
  ),
  freehand: (
    <>
      <StrokePath d="M5.4 14.7C7.1 10 9.8 8.55 11.8 10.05C13.25 11.15 13.35 13.95 15 14.55C16.1 14.95 17.15 14.15 18.4 12" />
      <SolidCircle cx="5.4" cy="14.7" r="0.95" />
      <SolidCircle cx="18.4" cy="12" r="0.95" />
    </>
  ),
  angle: (
    <>
      <StrokePath d="M6.2 16L11 11L18 14" />
      <StrokePath d="M11 14A3.25 3.25 0 0 1 14 12.95" />
      <SolidCircle cx="6.2" cy="16" r="0.95" />
      <SolidCircle cx="11" cy="11" r="0.95" />
      <SolidCircle cx="18" cy="14" r="0.95" />
    </>
  ),
  rectangleRoi: (
    <>
      <StrokeRect x="6.6" y="6.6" width="10.8" height="10.8" rx="0.9" />
      <SolidCircle cx="6.6" cy="6.6" r="0.95" />
      <SolidCircle cx="17.4" cy="6.6" r="0.95" />
      <SolidCircle cx="6.6" cy="17.4" r="0.95" />
      <SolidCircle cx="17.4" cy="17.4" r="0.95" />
    </>
  ),
  ellipseRoi: (
    <>
      <StrokeEllipse cx="12" cy="12" rx="5.7" ry="4.8" />
      <SolidCircle cx="12" cy="7.2" r="0.95" />
      <SolidCircle cx="17.7" cy="12" r="0.95" />
      <SolidCircle cx="12" cy="16.8" r="0.95" />
      <SolidCircle cx="6.3" cy="12" r="0.95" />
    </>
  ),
  circleRoi: (
    <>
      <StrokeCircle cx="12" cy="12" r="5.7" />
      <SolidCircle cx="12" cy="6.3" r="0.95" />
      <SolidCircle cx="17.7" cy="12" r="0.95" />
      <SolidCircle cx="12" cy="17.7" r="0.95" />
      <SolidCircle cx="6.3" cy="12" r="0.95" />
    </>
  ),
  invert: (
    <>
      <AccentPath d="M12 4.6A7.4 7.4 0 0 1 12 19.4V4.6Z" />
      <StrokeCircle cx="12" cy="12" r="7.4" />
      <StrokePath d="M12 4.6V19.4" />
    </>
  ),
  keyImage: (
    <>
      <StrokeRect x="5.6" y="5.4" width="12.8" height="13.2" rx="1.1" />
      <path
        d="M9.2 5.4H14.8V13.45L12 11.85L9.2 13.45V5.4Z"
        fill="var(--app-icon-accent, currentColor)"
        opacity="0.32"
      />
      <StrokePath d="M9.2 5.4V13.45L12 11.85L14.8 13.45V5.4" />
      <StrokePath d="M8.1 16.15H15.9" />
    </>
  ),
  keyImageList: (
    <>
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <path
        d="M7 7.35H9V10.9L8 10.25L7 10.9V7.35Z"
        fill="var(--app-icon-accent, currentColor)"
        opacity="0.32"
      />
      <path
        d="M7 12.7H9V16.25L8 15.6L7 16.25V12.7Z"
        fill="currentColor"
        opacity="0.82"
      />
      <StrokePath d="M10.3 8.3H15.6" />
      <StrokePath d="M10.3 13.65H15.6" />
    </>
  ),
  dicomTag: (
    <>
      <StrokeRect x="5.1" y="5.4" width="13.8" height="13.2" rx="1.15" />
      <SolidCircle cx="7.95" cy="8.85" r="0.9" />
      <AccentCircle cx="7.95" cy="12" r="0.9" />
      <SolidCircle cx="7.95" cy="15.15" r="0.9" opacity="0.84" />
      <StrokePath d="M10.25 8.85H16.25" />
      <StrokePath d="M10.25 12H16.25" />
      <StrokePath d="M10.25 15.15H15" />
    </>
  ),
  annotationManage: (
    <>
      <StrokePath d="M6.15 15.55L9.4 9.2L13.1 11.5L16.15 7.8" />
      <SolidCircle cx="6.15" cy="15.55" r="0.92" />
      <AccentCircle cx="9.4" cy="9.2" r="1.1" />
      <SolidCircle cx="13.1" cy="11.5" r="0.92" />
      <StrokePath d="M15.1 14.2L18.4 17.5" />
      <StrokePath d="M18.4 14.2L15.1 17.5" />
    </>
  ),
  annotationList: (
    <>
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <AccentCircle cx="7.2" cy="8.9" r="0.85" />
      <SolidCircle cx="7.2" cy="12" r="0.85" />
      <SolidCircle cx="7.2" cy="15.1" r="0.85" opacity="0.84" />
      <StrokePath d="M9.3 8.9H15.5" />
      <StrokePath d="M9.3 12H15.5" />
      <StrokePath d="M9.3 15.1H14" />
    </>
  ),
  undo: (
    <>
      <StrokePath d="M8.7 8.9H15.4C17.17 8.9 18.6 10.33 18.6 12.1C18.6 13.87 17.17 15.3 15.4 15.3H10.55" />
      <StrokePath d="M9 6.5L5 10.1L9 13.7" />
    </>
  ),
  redo: (
    <>
      <StrokePath d="M15.3 8.9H8.6C6.83 8.9 5.4 10.33 5.4 12.1C5.4 13.87 6.83 15.3 8.6 15.3H13.45" />
      <StrokePath d="M15 6.5L19 10.1L15 13.7" />
    </>
  ),
  referenceLines: (
    <>
      <StrokeRect x="5.15" y="5.15" width="13.7" height="13.7" rx="1.35" />
      <StrokePath d="M12 5.15V18.85" />
      <StrokePath d="M5.15 12H18.85" />
      <StrokePath d="M12 3.9V7.1" />
      <StrokePath d="M12 16.9V20.1" />
      <StrokePath d="M3.9 12H7.1" />
      <StrokePath d="M16.9 12H20.1" />
      <AccentCircle cx="12" cy="12" r="1.1" />
    </>
  ),
  settings: (
    <>
      <StrokePath d="M5 8H19" />
      <StrokePath d="M5 12H19" />
      <StrokePath d="M5 16H19" />
      <StrokeCircle cx="8.2" cy="8" r="1.75" />
      <AccentCircle cx="15.7" cy="12" r="1.75" />
      <StrokeCircle cx="15.7" cy="12" r="1.75" />
      <StrokeCircle cx="10.6" cy="16" r="1.75" />
    </>
  ),
  overflow: (
    <>
      <circle cx="7" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="17" cy="12" r="1.6" fill="currentColor" />
    </>
  ),
  "x-lg": (
    <>
      <StrokePath d="M6 6L18 18" />
      <StrokePath d="M18 6L6 18" />
    </>
  ),
  trash3: (
    <>
      <AccentRect x="8" y="9" width="8" height="9" rx="1" />
      <StrokePath d="M9 7V5.5H15V7" />
      <StrokePath d="M6 7H18" />
      <StrokePath d="M7.5 7.5L8.5 19H15.5L16.5 7.5" />
      <StrokePath d="M10.5 10.5V16" />
      <StrokePath d="M13.5 10.5V16" />
    </>
  ),
  "arrow-repeat": (
    <>
      <StrokePath d="M6.5 8.5A6.5 6.5 0 0 1 17 6.6" />
      <StrokePath d="M17 6.6H13.9" />
      <StrokePath d="M17 6.6V9.7" />
      <StrokePath d="M17.5 15.5A6.5 6.5 0 0 1 7 17.4" />
      <StrokePath d="M7 17.4H10.1" />
      <StrokePath d="M7 17.4V14.3" />
    </>
  ),
  "arrow-clockwise": (
    <>
      <StrokePath d="M6.2 12A5.8 5.8 0 1 1 12 17.8C10.15 17.8 8.5 17.12 7.24 15.98" />
      <StrokePath d="M13.8 5.2H18.2V9.6" />
      <StrokePath d="M18.2 5.2L15.3 8.1" />
    </>
  ),
  "arrow-up": (
    <>
      <StrokePath d="M12 19V5" />
      <StrokePath d="M7 10L12 5L17 10" />
    </>
  ),
  "arrow-down": (
    <>
      <StrokePath d="M12 5V19" />
      <StrokePath d="M7 14L12 19L17 14" />
    </>
  ),
  "caret-right-fill": (
    <path d="M9 7L16 12L9 17V7Z" fill="currentColor" />
  ),
  "chevron-down": <StrokePath d="M6 9L12 15L18 9" />,
  "exclamation-circle": (
    <>
      <StrokeCircle cx="12" cy="12" r="8" />
      <StrokePath d="M12 8V12.5" />
      <circle cx="12" cy="16.2" r="1.2" fill="currentColor" />
    </>
  ),
  floppy: (
    <>
      <AccentRect x="6" y="6" width="12" height="12" rx="1.2" />
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M8 5V10H15V5" />
      <StrokeRect x="8" y="13" width="8" height="5" rx="0.8" />
      <rect x="13.5" y="6.5" width="1.8" height="2.8" fill="currentColor" />
    </>
  ),
  keyboard: (
    <>
      <AccentRect x="5.5" y="7" width="13" height="9" rx="1.2" />
      <StrokeRect x="4.5" y="6" width="15" height="11" rx="1.4" />
      <StrokePath d="M7 10H17" />
      <StrokePath d="M7 13H10" />
      <StrokePath d="M11.5 13H14.5" />
      <StrokePath d="M16 13H17" />
    </>
  ),
  "pencil-square": (
    <>
      <AccentRect x="5.5" y="5.5" width="11" height="11" rx="1.2" />
      <StrokeRect x="4.5" y="4.5" width="12" height="12" rx="1.4" />
      <StrokePath d="M14 15L18.5 10.5L15.5 7.5L11 12L10.5 15.5L14 15Z" />
    </>
  ),
  "plus-lg": (
    <>
      <StrokePath d="M12 5V19" />
      <StrokePath d="M5 12H19" />
    </>
  ),
};

export function AppIcon({
  name,
  className,
  ...props
}: AppIconProps) {
  const classes = ["app-icon", className].filter(Boolean).join(" ");

  return (
    <span aria-hidden="true" className={classes} {...props}>
      <SvgIcon>{icons[name]}</SvgIcon>
    </span>
  );
}
