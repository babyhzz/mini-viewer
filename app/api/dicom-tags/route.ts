import { NextRequest, NextResponse } from "next/server";

import { readDicomTags } from "@/lib/dicom/tags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const relativePath = request.nextUrl.searchParams.get("path");

  if (!relativePath) {
    return badRequest("Missing DICOM path");
  }

  try {
    const payload = await readDicomTags(relativePath);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DICOM_FILE_NOT_FOUND";

    if (
      message === "INVALID_DICOM_PATH" ||
      message === "INVALID_DICOM_EXTENSION"
    ) {
      return badRequest("Invalid DICOM path");
    }

    if (
      message === "DICOM_FILE_NOT_FOUND" ||
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return NextResponse.json(
        { message: "DICOM file not found" },
        { status: 404 },
      );
    }

    console.error("Failed to read DICOM tags", error);

    return NextResponse.json(
      { message: "Failed to read DICOM tags" },
      { status: 500 },
    );
  }
}
