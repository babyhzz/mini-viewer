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

function AccentEllipse(props: SVGProps<SVGEllipseElement>) {
  return (
    <ellipse
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
      <path
        d="M5 4.75L13.78 13.2L10.38 13.98L12.38 19.1L10.42 19.92L8.42 14.79L5.82 17.02L5 4.75Z"
        fill="currentColor"
      />
      <StrokePath d="M15.2 5.2H19V9" strokeWidth={1.7 / ICON_SCALE} />
    </>
  ),
  pan: (
    <>
      <AccentRect x="9.25" y="9.25" width="5.5" height="5.5" rx="1" />
      <StrokePath d="M12 4.75V19.25" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M4.75 12H19.25" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M12 4.75L9.7 7.05" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M12 4.75L14.3 7.05" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M12 19.25L9.7 16.95" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M12 19.25L14.3 16.95" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M4.75 12L7.05 9.7" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M4.75 12L7.05 14.3" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M19.25 12L16.95 9.7" strokeWidth={1.7 / ICON_SCALE} />
      <StrokePath d="M19.25 12L16.95 14.3" strokeWidth={1.7 / ICON_SCALE} />
    </>
  ),
  zoom: (
    <>
      <StrokeCircle cx="10.4" cy="10.4" r="5.5" />
      <StrokePath d="M14.35 14.35L18.8 18.8" />
      <StrokePath d="M10.4 8.1V12.7" />
      <StrokePath d="M8.1 10.4H12.7" />
    </>
  ),
  windowLevel: (
    <>
      <StrokeRect x="5.35" y="5" width="7.6" height="14" rx="1.2" />
      <AccentRect x="6.1" y="6.05" width="3.1" height="11.9" rx="0.7" />
      <StrokePath d="M9.15 5V19" />
      <StrokePath d="M17.8 6.15V17.85" />
      <StrokePath d="M16.45 7.75L17.8 6.15L19.15 7.75" />
      <StrokePath d="M16.45 16.25L17.8 17.85L19.15 16.25" />
    </>
  ),
  windowPreset: (
    <>
      <StrokeRect x="5.25" y="6.1" width="13.5" height="11.8" rx="1.3" />
      <AccentRect x="7" y="7.7" width="8.7" height="2" rx="0.65" />
      <StrokePath d="M7.8 11.8H16.2" />
      <StrokePath d="M7.8 14.7H13.9" />
    </>
  ),
  cine: (
    <>
      <StrokeRect x="5.2" y="6.15" width="13.6" height="11.7" rx="1.2" />
      <StrokePath d="M8 6.15V17.85" />
      <StrokePath d="M16 6.15V17.85" />
      <SolidCircle cx="6.45" cy="8.95" r="0.58" />
      <SolidCircle cx="6.45" cy="12" r="0.58" />
      <SolidCircle cx="6.45" cy="15.05" r="0.58" />
      <SolidCircle cx="17.55" cy="8.95" r="0.58" />
      <SolidCircle cx="17.55" cy="12" r="0.58" />
      <SolidCircle cx="17.55" cy="15.05" r="0.58" />
      <path d="M10 9.2L14.55 12L10 14.8V9.2Z" fill="currentColor" />
    </>
  ),
  fit: (
    <>
      <StrokeRect x="8.35" y="8.35" width="7.3" height="7.3" rx="0.95" />
      <StrokePath d="M9 5H5V9" />
      <StrokePath d="M15 5H19V9" />
      <StrokePath d="M19 15V19H15" />
      <StrokePath d="M9 19H5V15" />
    </>
  ),
  reset: (
    <>
      <StrokeRect x="8.3" y="8.2" width="7.4" height="7.4" rx="1" />
      <StrokePath d="M8.25 5.85H5V9.1" />
      <StrokePath d="M5.1 9.1A7.2 7.2 0 1 0 12 4.8C10.68 4.8 9.43 5.16 8.25 5.85" />
    </>
  ),
  rotateRight: (
    <>
      <StrokeRect x="6.8" y="7.2" width="8.7" height="8.7" rx="1" />
      <StrokePath d="M14.35 4.9H18.8V9.35" />
      <StrokePath d="M18.8 9.35A7.35 7.35 0 0 1 5.8 13.7" />
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
      <AccentRect x="6.15" y="6.15" width="4.95" height="4.95" rx="0.65" />
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M12 5V19" />
      <StrokePath d="M5 12H19" />
    </>
  ),
  imageLayout: (
    <>
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <AccentRect x="6.1" y="6.1" width="5.5" height="11.8" rx="0.7" />
      <StrokePath d="M12.2 5V19" />
      <StrokePath d="M12.2 12H19" />
    </>
  ),
  mprLayout: (
    <>
      <AccentRect x="6.2" y="6.2" width="4.9" height="4.9" rx="0.65" />
      <rect x="12.9" y="6.2" width="4.9" height="4.9" rx="0.65" fill="currentColor" opacity="0.12" />
      <rect x="6.2" y="12.9" width="11.6" height="4.9" rx="0.65" fill="currentColor" opacity="0.18" />
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M12 5V12" />
      <StrokePath d="M5 12H19" />
    </>
  ),
  mprSlab: (
    <>
      <StrokeRect x="5" y="5.35" width="14" height="13.3" rx="1.2" />
      <AccentRect x="7.2" y="10.15" width="9.6" height="3.7" rx="0.55" />
      <StrokePath d="M7.2 8.1H16.8" />
      <StrokePath d="M7.2 10H16.8" />
      <StrokePath d="M7.2 14H16.8" />
      <StrokePath d="M7.2 15.9H16.8" />
      <StrokePath d="M19 9.3L21 12L19 14.7" />
    </>
  ),
  sequenceSync: (
    <>
      <StrokeRect x="4.8" y="7.1" width="4.8" height="9.8" rx="0.9" />
      <StrokeRect x="14.4" y="7.1" width="4.8" height="9.8" rx="0.9" />
      <StrokePath d="M10.55 13.7L9.3 12.45C8.45 11.6 8.45 10.38 9.3 9.53C10.15 8.68 11.37 8.68 12.22 9.53L13.05 10.36" />
      <StrokePath d="M13.45 10.3L14.7 11.55C15.55 12.4 15.55 13.62 14.7 14.47C13.85 15.32 12.63 15.32 11.78 14.47L10.95 13.64" />
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
      <path d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20V4Z" fill="currentColor" opacity="0.2" />
      <StrokeCircle cx="12" cy="12" r="8" />
      <StrokePath d="M12 4V20" />
    </>
  ),
  keyImage: (
    <>
      <StrokeRect x="5.8" y="5.3" width="12.4" height="13.4" rx="1" />
      <StrokePath d="M9.3 5.3V13.8L12 12.15L14.7 13.8V5.3" />
      <StrokePath d="M7.9 16H16.1" />
    </>
  ),
  keyImageList: (
    <>
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <path d="M7.1 7.7H8.8V11.45L7.95 10.85L7.1 11.45V7.7Z" fill="currentColor" />
      <path d="M7.1 12.95H8.8V16.7L7.95 16.1L7.1 16.7V12.95Z" fill="currentColor" opacity="0.88" />
      <StrokePath d="M10 8.6H15.2" />
      <StrokePath d="M10 14.05H15.2" />
    </>
  ),
  dicomTag: (
    <>
      <StrokePath d="M6.9 5.9H14.55L18.1 9.45V18.1H6.9V5.9Z" />
      <StrokePath d="M14.55 5.9V9.45H18.1" />
      <StrokePath d="M9.1 11.8H15.1" />
      <StrokePath d="M9.1 14.8H13.6" />
    </>
  ),
  annotationManage: (
    <>
      <StrokePath d="M9 7V5.6H15V7" />
      <StrokePath d="M6.1 7H17.9" />
      <StrokePath d="M7.55 7.5L8.45 18.8H15.55L16.45 7.5" />
      <StrokePath d="M10.5 10.4V15.9" />
      <StrokePath d="M13.5 10.4V15.9" />
    </>
  ),
  annotationList: (
    <>
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M9.1 8.9H15.3" />
      <StrokePath d="M9.1 12H15.3" />
      <StrokePath d="M9.1 15.1H13.7" />
      <SolidCircle cx="7.1" cy="8.9" r="0.82" />
      <SolidCircle cx="7.1" cy="12" r="0.82" />
      <SolidCircle cx="7.1" cy="15.1" r="0.82" />
    </>
  ),
  undo: (
    <>
      <StrokePath d="M8.35 9.35H16.15C17.82 9.35 19.15 10.68 19.15 12.35C19.15 14.02 17.82 15.35 16.15 15.35H11.45" />
      <StrokePath d="M9.35 6.95L4.95 10.95L9.35 14.95" />
    </>
  ),
  redo: (
    <>
      <StrokePath d="M15.65 9.35H7.85C6.18 9.35 4.85 10.68 4.85 12.35C4.85 14.02 6.18 15.35 7.85 15.35H12.55" />
      <StrokePath d="M14.65 6.95L19.05 10.95L14.65 14.95" />
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
