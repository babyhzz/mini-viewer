import React from 'react';
import type { IconProps } from '../types';

export const Code = (props: IconProps) => (
  <svg
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      fillRule="evenodd"
    >
      <path d="M8.25 7.5 4.5 12l3.75 4.5" />
      <path d="M15.75 7.5 19.5 12l-3.75 4.5" />
      <path d="M13.25 5.75 10.75 18.25" />
    </g>
  </svg>
);

export default Code;
