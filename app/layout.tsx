import type { ReactNode } from "react";
import type { Metadata } from "next";

import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Mini Viewer",
  description: "A compact DICOM viewer built with Next.js and Cornerstone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
