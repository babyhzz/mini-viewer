"use client";

import "@ant-design/v5-patch-for-react-19";

import type { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider, theme } from "antd";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            borderRadius: 0,
            colorBgBase: "#0b0f14",
            colorBgContainer: "#11161c",
            colorBorder: "#283341",
            colorPrimary: "#3aa0ff",
            colorTextBase: "#edf2f7",
            colorTextDescription: "#90a0b3",
            fontFamily:
              "'Avenir Next', 'SF Pro Display', 'PingFang SC', 'Noto Sans SC', sans-serif",
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
