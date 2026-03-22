import type { IconProps } from "../types";

export function MissingIcon(iconProps: IconProps) {
  return (
  <svg
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...iconProps}
  >
    <g
      fill="none"
      fillRule="evenodd"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
      />
      <path d="M8 8l8 8" />
      <path d="M16 8l-8 8" />
    </g>
  </svg>
  );
}

export default MissingIcon;
