import { readdir } from "node:fs/promises";
import path from "node:path";

import { createDicomFileUrl, DICOM_ROOT, byName, isDicomFileName, isIgnoredName } from "@/lib/dicom/dicom-path";
import { readDicomFileMetadata } from "@/lib/dicom/dicom-metadata";
import type {
  DicomHierarchyResponse,
  DicomImageNode,
  DicomSeriesNode,
  DicomStudyNode,
} from "@/types/dicom";

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
        imagePositionPatient: entry.metadata.imagePositionPatient,
        imageOrientationPatient: entry.metadata.imageOrientationPatient,
        frameOfReferenceUID: entry.metadata.frameOfReferenceUID,
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
