import { Readable } from "node:stream";

import { NextRequest, NextResponse } from "next/server";

import {
  createDicomReadStream,
  statDicomFile,
} from "@/lib/dicom/filesystem";

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
    const dicomFile = await statDicomFile(relativePath);
    const nodeStream = createDicomReadStream(relativePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Length": String(dicomFile.size),
        "Content-Type": "application/dicom",
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          dicomFile.normalizedRelativePath.split("/").at(-1) ?? "image.dcm",
        )}"`,
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

    console.error("Failed to read DICOM file", error);

    return NextResponse.json(
      { message: "Failed to read DICOM file" },
      { status: 500 },
    );
  }
}
