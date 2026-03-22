import type { SVGProps } from "react";

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

interface ToolbarIconProps {
  className?: string;
}

type ToolbarSvgProps = SVGProps<SVGSVGElement>;

function IconFrame({
  children,
  className,
  viewBox = "0 0 24 24",
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
      strokeWidth="1.8"
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  );
}

function AnchorPoint({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r="1.2" fill="currentColor" stroke="none" />;
}

function SelectIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 4.8v3" />
      <path d="M12 16.2v3" />
      <path d="M4.8 12h3" />
      <path d="M16.2 12h3" />
      <path d="M8.6 8.6 6.9 6.9" />
      <path d="m17.1 17.1-1.7-1.7" />
      <path d="m15.4 8.6 1.7-1.7" />
      <path d="m6.9 17.1 1.7-1.7" />
      <circle cx="12" cy="12" r="3.2" />
      <AnchorPoint cx={12} cy={12} />
    </IconFrame>
  );
}

function PanIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 4.8v14.4" />
      <path d="M4.8 12h14.4" />
      <path d="m12 4.8-2 2" />
      <path d="m12 4.8 2 2" />
      <path d="m19.2 12-2-2" />
      <path d="m19.2 12-2 2" />
      <path d="m12 19.2-2-2" />
      <path d="m12 19.2 2-2" />
      <path d="m4.8 12 2-2" />
      <path d="m4.8 12 2 2" />
      <circle cx="12" cy="12" r="1.4" />
    </IconFrame>
  );
}

function WindowLevelIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <rect x="6.4" y="5.4" width="11.2" height="13.2" rx="1.4" />
      <path d="M12 5.4v13.2" />
      <path
        d="M12 7.1a4.9 4.9 0 0 1 0 9.8Z"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="12" cy="12" r="4.9" />
    </IconFrame>
  );
}

function LayoutIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <rect x="4.8" y="4.8" width="6.2" height="6.2" />
      <rect x="13" y="4.8" width="6.2" height="6.2" />
      <rect x="4.8" y="13" width="6.2" height="6.2" />
      <rect x="13" y="13" width="6.2" height="6.2" />
    </IconFrame>
  );
}

function ImageLayoutIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <rect x="4.8" y="4.8" width="14.4" height="14.4" rx="1.6" />
      <path d="M12 4.8v14.4" />
      <path d="M4.8 12h14.4" />
      <circle cx="8.3" cy="8.3" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.7" cy="15.7" r="1" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

function LengthIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M7 16.5 17 7.5" />
      <path d="m7.8 13.4-2.1 1.8.9 2.6 2.4-.5" />
      <path d="m16.2 10.6 2.1-1.8-.9-2.6-2.4.5" />
      <AnchorPoint cx={7} cy={16.5} />
      <AnchorPoint cx={17} cy={7.5} />
    </IconFrame>
  );
}

function PolylineIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M6 16.5 10 9.5l4 3 4-5" />
      <AnchorPoint cx={6} cy={16.5} />
      <AnchorPoint cx={10} cy={9.5} />
      <AnchorPoint cx={14} cy={12.5} />
      <AnchorPoint cx={18} cy={7.5} />
    </IconFrame>
  );
}

function FreehandIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M5.5 15.8c1.4-2.8 3-4.7 4.8-5.6c1.8-.9 3.1-.4 4.2.8c1 .9 1.8 2 3 1.8c.7-.1 1.3-.5 2-1.2" />
      <path d="M6.1 18.3c1.7.7 3.2.9 4.9.7c2.7-.3 5.2-1.5 7.4-3.8" />
      <AnchorPoint cx={5.5} cy={15.8} />
      <AnchorPoint cx={18.7} cy={12.4} />
    </IconFrame>
  );
}

function AngleIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M6.6 16.8 12 11.5l5.6 5.3" />
      <path d="M12 11.5V6.2" />
      <path d="M12 14.4a3.7 3.7 0 0 1 2.9 1.4" />
      <path d="M12 16.1a5.4 5.4 0 0 1 4 1.7" />
      <AnchorPoint cx={6.6} cy={16.8} />
      <AnchorPoint cx={12} cy={11.5} />
      <AnchorPoint cx={17.6} cy={16.8} />
    </IconFrame>
  );
}

function RectangleRoiIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <rect x="6.2" y="7" width="11.6" height="10" rx="1.2" />
      <path d="M6.2 10.2H4.6" />
      <path d="M17.8 13.8h1.6" />
      <path d="M12 7V5.4" />
      <path d="M12 18.6v-1.6" />
      <AnchorPoint cx={12} cy={12} />
    </IconFrame>
  );
}

function EllipseRoiIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <ellipse cx="12" cy="12" rx="6.2" ry="4.8" />
      <path d="M12 7.2V5.6" />
      <path d="M12 18.4v-1.6" />
      <path d="M5.8 12H4.2" />
      <path d="M19.8 12h-1.6" />
      <AnchorPoint cx={12} cy={12} />
    </IconFrame>
  );
}

function CircleRoiIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="5.8" />
      <path d="M12 6.2V4.6" />
      <path d="M12 19.4v-1.6" />
      <path d="M6.2 12H4.6" />
      <path d="M19.4 12h-1.6" />
      <AnchorPoint cx={12} cy={12} />
    </IconFrame>
  );
}

function InvertIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="6.3" />
      <path
        d="M12 5.7a6.3 6.3 0 0 1 0 12.6Z"
        fill="currentColor"
        stroke="none"
      />
      <path d="M12 5.7v12.6" />
    </IconFrame>
  );
}

function AnnotationManageIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="M7.5 7.2h9" />
      <path d="M9 7.2V5.8h6v1.4" />
      <path d="M8.3 7.2v10.2a1 1 0 0 0 1 1h5.4a1 1 0 0 0 1-1V7.2" />
      <path d="M10.5 10.2v4.4" />
      <path d="M13.5 10.2v4.4" />
    </IconFrame>
  );
}

function AnnotationListIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="7.2" cy="8" r="1" fill="currentColor" stroke="none" />
      <circle cx="7.2" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="7.2" cy="16" r="1" fill="currentColor" stroke="none" />
      <path d="M10.2 8h6.6" />
      <path d="M10.2 12h6.6" />
      <path d="M10.2 16h6.6" />
    </IconFrame>
  );
}

function SettingsIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 5.2v1.6" />
      <path d="M12 17.2v1.6" />
      <path d="m16.8 7.2-.9 1.3" />
      <path d="m8.1 15.5-.9 1.3" />
      <path d="M18.8 12h-1.6" />
      <path d="M6.8 12H5.2" />
      <path d="m16 15.9.9 1.3" />
      <path d="m7.2 7.2.9 1.3" />
    </IconFrame>
  );
}

function ChevronDownIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <path d="m7.5 10.2 4.5 4.5 4.5-4.5" />
    </IconFrame>
  );
}

function OverflowIcon(props: ToolbarSvgProps) {
  return (
    <IconFrame {...props}>
      <circle cx="7" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

export function ViewportToolbarIcon({
  name,
  className,
}: ToolbarIconProps & { name: ViewportToolbarIconName }) {
  switch (name) {
    case "select":
      return <SelectIcon className={className} />;
    case "pan":
      return <PanIcon className={className} />;
    case "windowLevel":
      return <WindowLevelIcon className={className} />;
    case "layout":
      return <LayoutIcon className={className} />;
    case "imageLayout":
      return <ImageLayoutIcon className={className} />;
    case "length":
      return <LengthIcon className={className} />;
    case "polyline":
      return <PolylineIcon className={className} />;
    case "freehand":
      return <FreehandIcon className={className} />;
    case "angle":
      return <AngleIcon className={className} />;
    case "rectangleRoi":
      return <RectangleRoiIcon className={className} />;
    case "ellipseRoi":
      return <EllipseRoiIcon className={className} />;
    case "circleRoi":
      return <CircleRoiIcon className={className} />;
    case "invert":
      return <InvertIcon className={className} />;
    case "annotationManage":
      return <AnnotationManageIcon className={className} />;
    case "annotationList":
      return <AnnotationListIcon className={className} />;
    case "settings":
      return <SettingsIcon className={className} />;
    case "chevronDown":
      return <ChevronDownIcon className={className} />;
    case "overflow":
      return <OverflowIcon className={className} />;
    default:
      return <SelectIcon className={className} />;
  }
}
