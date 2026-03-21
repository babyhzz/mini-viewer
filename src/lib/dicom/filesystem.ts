import { createReadStream } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import type {
  DicomHierarchyResponse,
  DicomImageNode,
  DicomSeriesNode,
  DicomStudyNode,
} from "@/types/dicom";

const require = createRequire(import.meta.url);
const { parseDicom } = require("dicom-parser") as typeof import("dicom-parser");

const DICOM_ROOT = path.join(process.cwd(), "dicom");
const DICOM_EXTENSION = ".dcm";
const IGNORED_NAMES = new Set([".DS_Store"]);

function byName(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function isIgnoredName(name: string) {
  return IGNORED_NAMES.has(name);
}

function isDicomFileName(name: string) {
  return !isIgnoredName(name) && name.toLowerCase().endsWith(DICOM_EXTENSION);
}

function createDicomFileUrl(filePath: string) {
  const searchParams = new URLSearchParams({ path: filePath });
  return `/api/dicom?${searchParams.toString()}`;
}

function normalizeDicomText(value: string | undefined) {
  const normalizedValue = value?.replaceAll("\0", "").trim();
  return normalizedValue ? normalizedValue : undefined;
}

function normalizeDicomPersonName(value: string | undefined) {
  const normalizedValue = normalizeDicomText(value)?.replaceAll("^", " ");

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue.replace(/\s+/g, " ").trim();
}

function formatDicomDate(value: string | undefined) {
  const normalizedValue = normalizeDicomText(value);

  if (!normalizedValue) {
    return undefined;
  }

  const match = normalizedValue.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (!match) {
    return normalizedValue;
  }

  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

function buildStudyTitle(title: string | undefined, index: number) {
  return title ?? `未命名检查 ${index + 1}`;
}

function buildSeriesTitle(
  title: string | undefined,
  seriesNumber: string | undefined,
  index: number,
) {
  if (title && seriesNumber) {
    return `${seriesNumber} ${title}`;
  }

  if (title) {
    return title;
  }

  if (seriesNumber) {
    return `序列 ${seriesNumber}`;
  }

  return `未命名序列 ${index + 1}`;
}

function byOptionalNumber(
  a: number | undefined,
  b: number | undefined,
  aName: string,
  bName: string,
) {
  if (a != null && b != null) {
    return a === b ? byName(aName, bName) : a - b;
  }

  if (a != null) {
    return -1;
  }

  if (b != null) {
    return 1;
  }

  return byName(aName, bName);
}

async function readDicomFileMetadata(relativePath: string) {
  try {
    const fileBuffer = await readFile(path.join(DICOM_ROOT, relativePath));
    const dataSet = parseDicom(fileBuffer, {
      untilTag: "x00200013",
    });

    return {
      studyTitle: normalizeDicomText(dataSet.string("x00081030")),
      seriesTitle: normalizeDicomText(dataSet.string("x0008103e")),
      seriesNumber: dataSet.intString("x00200011")?.toString(),
      modality: normalizeDicomText(dataSet.string("x00080060")),
      patientName: normalizeDicomPersonName(dataSet.string("x00100010")),
      patientId: normalizeDicomText(dataSet.string("x00100020")),
      studyDate: formatDicomDate(dataSet.string("x00080020")),
      instanceNumber: dataSet.intString("x00200013"),
    };
  } catch (error) {
    console.warn(`Failed to read DICOM metadata for ${relativePath}`, error);

    return {
      studyTitle: undefined,
      seriesTitle: undefined,
      seriesNumber: undefined,
      modality: undefined,
      patientName: undefined,
      patientId: undefined,
      studyDate: undefined,
      instanceNumber: undefined,
    };
  }
}

async function listDirectories(dirPath: string) {
  const entries = await readdir(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && !isIgnoredName(entry.name))
    .map((entry) => entry.name)
    .sort(byName);
}

async function listDicomFiles(dirPath: string) {
  const entries = await readdir(dirPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isDicomFileName(entry.name))
    .map((entry) => entry.name)
    .sort(byName);
}

export async function readDicomHierarchy(): Promise<DicomHierarchyResponse> {
  let studyIds: string[] = [];

  try {
    studyIds = await listDirectories(DICOM_ROOT);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return {
        studies: [],
        generatedAt: new Date().toISOString(),
      };
    }

    throw error;
  }

  const studies: DicomStudyNode[] = [];

  for (const [studyIndex, studyId] of studyIds.entries()) {
    const studyPath = path.join(DICOM_ROOT, studyId);
    const seriesIds = await listDirectories(studyPath);
    const seriesList: DicomSeriesNode[] = [];
    let studyTitle: string | undefined;
    let patientName: string | undefined;
    let patientId: string | undefined;
    let studyDate: string | undefined;

    for (const [seriesIndex, seriesId] of seriesIds.entries()) {
      const seriesPath = path.join(studyPath, seriesId);
      const imageFiles = await listDicomFiles(seriesPath);

      if (imageFiles.length === 0) {
        continue;
      }

      const imageEntries: Array<{
        fileName: string;
        filePath: string;
        metadata: Awaited<ReturnType<typeof readDicomFileMetadata>>;
      }> = [];

      for (const fileName of imageFiles) {
        const filePath = path.posix.join(studyId, seriesId, fileName);
        const metadata = await readDicomFileMetadata(filePath);

        imageEntries.push({
          fileName,
          filePath,
          metadata,
        });
      }

      imageEntries.sort((left, right) =>
        byOptionalNumber(
          left.metadata.instanceNumber,
          right.metadata.instanceNumber,
          left.fileName,
          right.fileName,
        ),
      );

      const images: DicomImageNode[] = imageEntries.map((entry) => ({
        imageId: entry.fileName.replace(/\.dcm$/i, ""),
        title: entry.fileName,
        fileName: entry.fileName,
        filePath: entry.filePath,
        dicomUrl: createDicomFileUrl(entry.filePath),
        instanceNumber: entry.metadata.instanceNumber,
      }));

      const displayMetadata = imageEntries[0].metadata;

      if (!studyTitle && displayMetadata.studyTitle) {
        studyTitle = displayMetadata.studyTitle;
      }

      if (!patientName && displayMetadata.patientName) {
        patientName = displayMetadata.patientName;
      }

      if (!patientId && displayMetadata.patientId) {
        patientId = displayMetadata.patientId;
      }

      if (!studyDate && displayMetadata.studyDate) {
        studyDate = displayMetadata.studyDate;
      }

      seriesList.push({
        seriesId,
        title: buildSeriesTitle(
          displayMetadata.seriesTitle,
          displayMetadata.seriesNumber,
          seriesIndex,
        ),
        imageCount: images.length,
        thumbnailPath: images[0].dicomUrl,
        modality: displayMetadata.modality,
        seriesNumber: displayMetadata.seriesNumber,
        images,
      });
    }

    if (seriesList.length === 0) {
      continue;
    }

    studies.push({
      studyId,
      title: buildStudyTitle(studyTitle, studyIndex),
      patientName,
      patientId,
      studyDate,
      series: seriesList,
    });
  }

  return {
    studies,
    generatedAt: new Date().toISOString(),
  };
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

  if (absolutePath !== DICOM_ROOT && !absolutePath.startsWith(rootWithSeparator)) {
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
