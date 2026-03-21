import { NextResponse } from "next/server";

import { readDicomHierarchy } from "@/lib/dicom/filesystem";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const hierarchy = await readDicomHierarchy();

    return NextResponse.json(hierarchy, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to read DICOM hierarchy", error);

    return NextResponse.json(
      { message: "Failed to read DICOM hierarchy" },
      { status: 500 },
    );
  }
}
