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
  | "keyboard"
  | "layout"
  | "length"
  | "mprLayout"
  | "overflow"
  | "pan"
  | "pencil-square"
  | "plus-lg"
  | "polyline"
  | "rectangleRoi"
  | "reset"
  | "rotateRight"
  | "select"
  | "sequenceSync"
  | "settings"
  | "trash3"
  | "windowLevel"
  | "windowPreset"
  | "x-lg"
  | "zoom";

interface AppIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: AppIconName;
}

const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function SvgIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
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
      opacity={0.78}
      {...props}
    />
  );
}

function AccentRect(props: SVGProps<SVGRectElement>) {
  return (
    <rect
      fill="var(--app-icon-accent, currentColor)"
      opacity={0.78}
      {...props}
    />
  );
}

function AccentCircle(props: SVGProps<SVGCircleElement>) {
  return (
    <circle
      fill="var(--app-icon-accent, currentColor)"
      opacity={0.78}
      {...props}
    />
  );
}

function AccentEllipse(props: SVGProps<SVGEllipseElement>) {
  return (
    <ellipse
      fill="var(--app-icon-accent, currentColor)"
      opacity={0.78}
      {...props}
    />
  );
}

const icons: Record<AppIconName, ReactNode> = {
  select: (
    <>
      <path
        d="M5.25 4.5L14.1 13.48L10.52 14.16L12.64 19.42L10.55 20.28L8.43 15.03L5.7 17.26L5.25 4.5Z"
        fill="currentColor"
      />
      <StrokePath d="M15.5 4.5H19.5V8.5" />
    </>
  ),
  pan: (
    <>
      <AccentRect x="9.25" y="9.25" width="5.5" height="5.5" rx="1" />
      <StrokePath d="M12 4.75V19.25" />
      <StrokePath d="M4.75 12H19.25" />
      <StrokePath d="M12 4.75L9.7 7.05" />
      <StrokePath d="M12 4.75L14.3 7.05" />
      <StrokePath d="M12 19.25L9.7 16.95" />
      <StrokePath d="M12 19.25L14.3 16.95" />
      <StrokePath d="M4.75 12L7.05 9.7" />
      <StrokePath d="M4.75 12L7.05 14.3" />
      <StrokePath d="M19.25 12L16.95 9.7" />
      <StrokePath d="M19.25 12L16.95 14.3" />
    </>
  ),
  zoom: (
    <>
      <AccentCircle cx="10.5" cy="10.5" r="4.75" />
      <StrokeCircle cx="10.5" cy="10.5" r="5.75" />
      <StrokePath d="M14.8 14.8L19 19" />
    </>
  ),
  windowLevel: (
    <>
      <AccentRect x="6.5" y="6" width="7" height="12" rx="1" />
      <StrokeRect x="5" y="5" width="10" height="14" rx="1.2" />
      <StrokePath d="M10 5V19" />
      <StrokePath d="M18 6V18" />
      <StrokePath d="M16.6 7.7L18 6L19.4 7.7" />
      <StrokePath d="M16.6 16.3L18 18L19.4 16.3" />
    </>
  ),
  windowPreset: (
    <>
      <AccentRect x="6" y="7" width="12" height="10" rx="1.2" />
      <StrokeRect x="5" y="6" width="14" height="12" rx="1.4" />
      <StrokePath d="M8 9H16" />
      <StrokePath d="M8 12H16" />
      <StrokePath d="M8 15H13" />
    </>
  ),
  fit: (
    <>
      <AccentRect x="9" y="9" width="6" height="6" rx="1" />
      <StrokePath d="M9 5H5V9" />
      <StrokePath d="M15 5H19V9" />
      <StrokePath d="M19 15V19H15" />
      <StrokePath d="M9 19H5V15" />
    </>
  ),
  reset: (
    <>
      <AccentRect x="8.5" y="8.5" width="7" height="7" rx="1.1" />
      <StrokePath d="M8.5 6.5H5V10" />
      <StrokePath d="M5.2 10A7.25 7.25 0 1 0 12 4.75C10.63 4.75 9.35 5.13 8.25 5.8" />
    </>
  ),
  rotateRight: (
    <>
      <AccentRect x="7.5" y="8" width="7.5" height="7.5" rx="1" />
      <StrokeRect x="6.5" y="7" width="9" height="9" rx="1.1" />
      <StrokePath d="M14.5 4.5H19V9" />
      <StrokePath d="M19 9A7.5 7.5 0 0 1 5.5 13.5" />
    </>
  ),
  flipHorizontal: (
    <>
      <AccentRect x="6" y="7" width="5.5" height="10" rx="0.8" />
      <StrokeRect x="5" y="6" width="14" height="12" rx="1" />
      <StrokePath d="M12 7V17" />
      <StrokePath d="M7.7 10L5.5 12L7.7 14" />
      <StrokePath d="M16.3 10L18.5 12L16.3 14" />
      <StrokePath d="M11.2 12H6" />
      <StrokePath d="M12.8 12H18" />
    </>
  ),
  flipVertical: (
    <>
      <AccentRect x="7" y="6" width="10" height="5.5" rx="0.8" />
      <StrokeRect x="6" y="5" width="12" height="14" rx="1" />
      <StrokePath d="M7 12H17" />
      <StrokePath d="M10 7.7L12 5.5L14 7.7" />
      <StrokePath d="M10 16.3L12 18.5L14 16.3" />
      <StrokePath d="M12 11.2V6" />
      <StrokePath d="M12 12.8V18" />
    </>
  ),
  layout: (
    <>
      <AccentRect x="6" y="6" width="5" height="5" rx="0.8" />
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M12 5V19" />
      <StrokePath d="M5 12H19" />
    </>
  ),
  imageLayout: (
    <>
      <AccentRect x="7" y="10" width="4" height="4" rx="0.7" />
      <StrokeRect x="5" y="4.5" width="14" height="15" rx="1.2" />
      <StrokePath d="M5 8.5H19" />
      <StrokePath d="M12 8.5V19.5" />
      <StrokePath d="M5 14H19" />
    </>
  ),
  mprLayout: (
    <>
      <rect x="6.3" y="6.3" width="4.7" height="4.7" rx="0.7" fill="currentColor" opacity="0.14" />
      <rect x="13" y="6.3" width="4.7" height="4.7" rx="0.7" fill="currentColor" opacity="0.22" />
      <rect x="6.3" y="13" width="11.4" height="4.7" rx="0.7" fill="currentColor" opacity="0.3" />
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M12 5V12" />
      <StrokePath d="M5 12H19" />
    </>
  ),
  sequenceSync: (
    <>
      <AccentCircle cx="12" cy="12" r="2.4" />
      <StrokeRect x="4.5" y="7" width="5.5" height="10" rx="1" />
      <StrokeRect x="14" y="7" width="5.5" height="10" rx="1" />
      <StrokePath d="M10 12H14" />
      <StrokePath d="M12 9.5V14.5" />
    </>
  ),
  length: (
    <>
      <AccentCircle cx="6.5" cy="16.5" r="1.6" />
      <AccentCircle cx="17.5" cy="7.5" r="1.6" />
      <StrokePath d="M6.5 16.5L17.5 7.5" />
      <StrokePath d="M5.1 15.1L7.9 17.9" />
      <StrokePath d="M16.1 6.1L18.9 8.9" />
    </>
  ),
  polyline: (
    <>
      <AccentCircle cx="5.5" cy="16" r="1.5" />
      <AccentCircle cx="10" cy="9.5" r="1.5" />
      <AccentCircle cx="14" cy="13" r="1.5" />
      <AccentCircle cx="18.5" cy="7.5" r="1.5" />
      <StrokePath d="M5.5 16L10 9.5L14 13L18.5 7.5" />
    </>
  ),
  freehand: (
    <>
      <AccentCircle cx="5.5" cy="14.5" r="1.5" />
      <AccentCircle cx="18.2" cy="12.2" r="1.5" />
      <StrokePath d="M5.5 14.5C7.1 10.1 9.8 8.6 11.8 10.1C13.3 11.2 13.2 14 15 14.6C16.1 14.97 17.16 14.2 18.2 12.2" />
    </>
  ),
  angle: (
    <>
      <AccentCircle cx="6" cy="16" r="1.5" />
      <AccentCircle cx="11" cy="11" r="1.5" />
      <AccentCircle cx="18" cy="14" r="1.5" />
      <StrokePath d="M6 16L11 11L18 14" />
      <StrokePath d="M11 14A3.15 3.15 0 0 1 13.95 12.9" />
    </>
  ),
  rectangleRoi: (
    <>
      <AccentRect x="7" y="7" width="10" height="10" rx="1" />
      <StrokeRect x="6.5" y="6.5" width="11" height="11" rx="1.1" />
      <circle cx="6.5" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="6.5" cy="17.5" r="1.1" fill="currentColor" />
      <circle cx="17.5" cy="17.5" r="1.1" fill="currentColor" />
    </>
  ),
  ellipseRoi: (
    <>
      <AccentEllipse cx="12" cy="12" rx="5.2" ry="4.2" />
      <StrokeEllipse cx="12" cy="12" rx="5.7" ry="4.7" />
      <circle cx="12" cy="7.3" r="1.1" fill="currentColor" />
      <circle cx="17.7" cy="12" r="1.1" fill="currentColor" />
      <circle cx="12" cy="16.7" r="1.1" fill="currentColor" />
      <circle cx="6.3" cy="12" r="1.1" fill="currentColor" />
    </>
  ),
  circleRoi: (
    <>
      <AccentCircle cx="12" cy="12" r="5" />
      <StrokeCircle cx="12" cy="12" r="5.7" />
      <circle cx="12" cy="6.3" r="1.1" fill="currentColor" />
      <circle cx="17.7" cy="12" r="1.1" fill="currentColor" />
      <circle cx="12" cy="17.7" r="1.1" fill="currentColor" />
      <circle cx="6.3" cy="12" r="1.1" fill="currentColor" />
    </>
  ),
  invert: (
    <>
      <path d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20V4Z" fill="currentColor" opacity="0.2" />
      <StrokeCircle cx="12" cy="12" r="8" />
      <StrokePath d="M12 4V20" />
    </>
  ),
  dicomTag: (
    <>
      <AccentPath d="M7 6H14.5L18 9.5V18H7V6Z" />
      <StrokePath d="M7 6H14.5L18 9.5V18H7V6Z" />
      <StrokePath d="M14.5 6V9.5H18" />
      <StrokePath d="M9 12H15" />
      <StrokePath d="M9 15H13" />
    </>
  ),
  annotationManage: (
    <>
      <AccentRect x="8" y="9" width="8" height="9" rx="1" />
      <StrokePath d="M9 7V5.5H15V7" />
      <StrokePath d="M6 7H18" />
      <StrokePath d="M7.5 7.5L8.5 19H15.5L16.5 7.5" />
      <StrokePath d="M10.5 10.5V16" />
      <StrokePath d="M13.5 10.5V16" />
    </>
  ),
  annotationList: (
    <>
      <AccentRect x="6" y="6" width="12" height="12" rx="1.2" />
      <StrokeRect x="5" y="5" width="14" height="14" rx="1.2" />
      <StrokePath d="M9 9H15" />
      <StrokePath d="M9 12H15" />
      <StrokePath d="M9 15H13" />
      <circle cx="7.1" cy="9" r="0.9" fill="currentColor" />
      <circle cx="7.1" cy="12" r="0.9" fill="currentColor" />
      <circle cx="7.1" cy="15" r="0.9" fill="currentColor" />
    </>
  ),
  settings: (
    <>
      <StrokePath d="M5 8H19" />
      <StrokePath d="M5 12H19" />
      <StrokePath d="M5 16H19" />
      <AccentCircle cx="9" cy="8" r="2" />
      <AccentCircle cx="15" cy="12" r="2" />
      <AccentCircle cx="11" cy="16" r="2" />
      <StrokeCircle cx="9" cy="8" r="2.3" />
      <StrokeCircle cx="15" cy="12" r="2.3" />
      <StrokeCircle cx="11" cy="16" r="2.3" />
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
