"use client";

import type { HTMLAttributes } from "react";

interface BootstrapIconProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  spin?: boolean;
}

export function BootstrapIcon({
  name,
  className,
  spin = false,
  ...props
}: BootstrapIconProps) {
  const classes = [
    "bi",
    `bi-${name}`,
    "bootstrap-icon",
    spin ? "is-spin" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <span aria-hidden="true" className={classes} {...props} />;
}
