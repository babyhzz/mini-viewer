import { NextRequest, NextResponse } from "next/server";

import { normalizeViewerSettings } from "@/lib/settings/overlay";
import {
  readViewerSettings,
  writeViewerSettings,
} from "@/lib/settings/viewer-settings-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = readViewerSettings();

    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to read viewer settings", error);

    return NextResponse.json(
      { message: "Failed to read viewer settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as unknown;
    const settings = normalizeViewerSettings(payload);
    const persistedSettings = writeViewerSettings(settings);

    return NextResponse.json(persistedSettings, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to save viewer settings", error);

    return NextResponse.json(
      { message: "Failed to save viewer settings" },
      { status: 500 },
    );
  }
}
