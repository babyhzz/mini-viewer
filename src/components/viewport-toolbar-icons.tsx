import type { SVGProps } from "react";

export type ViewportToolbarIconName =
  | "select"
  | "pan"
  | "windowLevel"
  | "layout"
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

type ToolbarSvgProps = SVGProps<SVGSVGElement>;

function IconFrame({
  children,
  className,
  viewBox = "0 0 20 20",
  ...props
}: ToolbarSvgProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  );
}

function PanIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M10 3v14" />
      <path d="M10 3 7.8 5.2" />
      <path d="M10 3 12.2 5.2" />
      <path d="M10 17 7.8 14.8" />
      <path d="M10 17 12.2 14.8" />
      <path d="M3 10h14" />
      <path d="M3 10 5.2 7.8" />
      <path d="M3 10 5.2 12.2" />
      <path d="M17 10 14.8 7.8" />
      <path d="M17 10 14.8 12.2" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

function SelectIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <rect x="4" y="4" width="12" height="12" rx="1.2" />
      <path d="M7 7.2h6" />
      <path d="M7 10h6" />
      <path d="M7 12.8h3.5" />
      <path d="m12.4 12.1 2.8 2.8" />
      <path d="M12.4 10.1v4.8h4.8" />
    </IconFrame>
  );
}

function WindowLevelIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 14.5V5.5" />
      <path d="M10 14.5V8.2" />
      <path d="M15 14.5V3.8" />
      <path d="M3.8 14.5h12.4" />
      <path d="m7.8 6.8 2.2-2.2 2.2 2.2" />
    </IconFrame>
  );
}

function LayoutIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <rect x="4" y="4" width="5" height="5" rx="0.9" />
      <rect x="11" y="4" width="5" height="5" rx="0.9" />
      <rect x="4" y="11" width="5" height="5" rx="0.9" />
      <rect x="11" y="11" width="5" height="5" rx="0.9" />
    </IconFrame>
  );
}

function LengthIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M4.5 14.5 15.5 5.5" />
      <circle cx="4.5" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="5.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M6.8 12.7 8.4 14.3" />
      <path d="M11.6 5.7 13.2 7.3" />
    </IconFrame>
  );
}

function PolylineIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 13.5 8 8.5 11.4 11.2 16 6.2" />
      <circle cx="4" cy="13.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="11.4" cy="11.2" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="6.2" r="1.4" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

function FreehandIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M3.8 12.8c1.4-3.8 3.3-5.8 5.1-5.8 2.5 0 1.8 5.7 4.7 5.7 1.1 0 1.9-.7 2.6-1.8" />
      <path d="m14.6 10.9 1.8 1.8" />
      <path d="m15.4 8.8 2.2 2.2" />
      <path d="M13.4 12.1 12.7 15l2.9-.7 2-2-2.2-2.2-2 2Z" />
    </IconFrame>
  );
}

function AngleIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 14.5 10 9.5 15.5 14.5" />
      <path d="M10 9.5v-4" />
      <path d="M10 9.5a4 4 0 0 1 3.6 2.3" />
      <circle cx="10" cy="9.5" r="1.4" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

function RectangleRoiIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <rect x="4.5" y="5.5" width="11" height="9" rx="1.1" />
      <path d="M4.5 8v-2.5H7" />
      <path d="M13 5.5h2.5V8" />
      <path d="M15.5 12v2.5H13" />
      <path d="M7 14.5H4.5V12" />
    </IconFrame>
  );
}

function EllipseRoiIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <ellipse cx="10" cy="10" rx="5.8" ry="4.6" />
      <path d="M10 5.4v-1.7" />
      <path d="M10 16.3v-1.7" />
      <path d="M4.2 10H2.8" />
      <path d="M17.2 10h-1.4" />
    </IconFrame>
  );
}

function CircleRoiIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="10" cy="10" r="5.6" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <path d="M10 4.4v1.8" />
      <path d="M15.6 10h-1.8" />
    </IconFrame>
  );
}

function InvertIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="10" cy="10" r="6.2" />
      <path
        d="M10 3.8a6.2 6.2 0 0 1 0 12.4Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M10 3.8v12.4" />
    </IconFrame>
  );
}

function AnnotationManageIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M4.5 5.5h8" />
      <path d="M4.5 10h6.5" />
      <path d="M4.5 14.5h5" />
      <path d="m13.4 8.4 3.2 3.2" />
      <path d="m16.6 8.4-3.2 3.2" />
    </IconFrame>
  );
}

function AnnotationListIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="5.2" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="5.2" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="5.2" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <path d="M8 5.5h7" />
      <path d="M8 10h7" />
      <path d="M8 14.5h7" />
    </IconFrame>
  );
}

function SettingsIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 6h7" />
      <path d="M13.5 6H16" />
      <circle cx="12.2" cy="6" r="1.8" />
      <path d="M4 10h2.5" />
      <path d="M9 10h7" />
      <circle cx="7.4" cy="10" r="1.8" />
      <path d="M4 14h6.5" />
      <path d="M13 14h3" />
      <circle cx="11.4" cy="14" r="1.8" />
    </IconFrame>
  );
}

function ChevronDownIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="m5.5 7.8 4.5 4.5 4.5-4.5" />
    </IconFrame>
  );
}

function OverflowIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="5" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

export function ViewportToolbarIcon({
  name,
  ...props
}: ToolbarSvgProps & { name: ViewportToolbarIconName }) {
  switch (name) {
    case "select":
      return <SelectIcon {...props} />;
    case "pan":
      return <PanIcon {...props} />;
    case "windowLevel":
      return <WindowLevelIcon {...props} />;
    case "layout":
      return <LayoutIcon {...props} />;
    case "length":
      return <LengthIcon {...props} />;
    case "polyline":
      return <PolylineIcon {...props} />;
    case "freehand":
      return <FreehandIcon {...props} />;
    case "angle":
      return <AngleIcon {...props} />;
    case "rectangleRoi":
      return <RectangleRoiIcon {...props} />;
    case "ellipseRoi":
      return <EllipseRoiIcon {...props} />;
    case "circleRoi":
      return <CircleRoiIcon {...props} />;
    case "invert":
      return <InvertIcon {...props} />;
    case "annotationManage":
      return <AnnotationManageIcon {...props} />;
    case "annotationList":
      return <AnnotationListIcon {...props} />;
    case "settings":
      return <SettingsIcon {...props} />;
    case "chevronDown":
      return <ChevronDownIcon {...props} />;
    case "overflow":
      return <OverflowIcon {...props} />;
    default:
      return <PanIcon {...props} />;
  }
}
