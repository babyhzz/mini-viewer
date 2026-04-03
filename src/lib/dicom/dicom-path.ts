import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

export const DICOM_ROOT = path.join(process.cwd(), "dicom");
export const DICOM_EXTENSION = ".dcm";
const IGNORED_NAMES = new Set([".DS_Store"]);

export function byName(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function isIgnoredName(name: string) {
  return IGNORED_NAMES.has(name);
}

export function isDicomFileName(name: string) {
  return !isIgnoredName(name) && name.toLowerCase().endsWith(DICOM_EXTENSION);
}

export function createDicomFileUrl(filePath: string) {
  const searchParams = new URLSearchParams({ path: filePath });
  return `/api/dicom?${searchParams.toString()}`;
}

export function resolveDicomFile(relativePath: string) {
  const normalizedRelativePath = path.posix
    .normalize(relativePath.replaceAll("\\", "/"))
    .trim();

  if (
    !normalizedRelativePath ||
    normalizedRelativePath === "." ||
    normalizedRelativePath.startsWith("../") ||
    normalizedRelativePath === ".." ||
    normalizedRelativePath.startsWith("/")
  ) {
    throw new Error("INVALID_DICOM_PATH");
  }

  if (!normalizedRelativePath.toLowerCase().endsWith(DICOM_EXTENSION)) {
    throw new Error("INVALID_DICOM_EXTENSION");
  }

  const absolutePath = path.resolve(DICOM_ROOT, normalizedRelativePath);
  const rootWithSeparator = `${DICOM_ROOT}${path.sep}`;

  if (
    absolutePath !== DICOM_ROOT &&
    !absolutePath.startsWith(rootWithSeparator)
  ) {
    throw new Error("INVALID_DICOM_PATH");
  }

  return {
    absolutePath,
    normalizedRelativePath,
  };
}

export async function statDicomFile(relativePath: string) {
  const resolved = resolveDicomFile(relativePath);
  const fileStats = await stat(resolved.absolutePath);

  if (!fileStats.isFile()) {
    throw new Error("DICOM_FILE_NOT_FOUND");
  }

  return {
    ...resolved,
    size: fileStats.size,
  };
}

export function createDicomReadStream(relativePath: string) {
  const { absolutePath } = resolveDicomFile(relativePath);
  return createReadStream(absolutePath);
}
