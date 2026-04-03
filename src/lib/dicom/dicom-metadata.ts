import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { DICOM_ROOT } from "@/lib/dicom/dicom-path";

const require = createRequire(import.meta.url);
const { parseDicom } = require("dicom-parser") as typeof import("dicom-parser");

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

function parseDicomNumberList(
  value: string | undefined,
  expectedLength: number,
): number[] | undefined {
  const normalizedValue = normalizeDicomText(value);

  if (!normalizedValue) {
    return undefined;
  }

  const values = normalizedValue
    .split("\\")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));

  if (values.length !== expectedLength) {
    return undefined;
  }

  return values;
}

export interface DicomFileMetadata {
  studyTitle?: string;
  seriesTitle?: string;
  seriesNumber?: string;
  modality?: string;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  instanceNumber?: number;
  imagePositionPatient?: [number, number, number];
  imageOrientationPatient?: [number, number, number, number, number, number];
  frameOfReferenceUID?: string;
}

export async function readDicomFileMetadata(
  relativePath: string,
): Promise<DicomFileMetadata> {
  try {
    const fileBuffer = await readFile(path.join(DICOM_ROOT, relativePath));
    const dataSet = parseDicom(fileBuffer, {
      untilTag: "x00200052",
    });
    const imagePositionPatient = parseDicomNumberList(
      dataSet.string("x00200032"),
      3,
    );
    const imageOrientationPatient = parseDicomNumberList(
      dataSet.string("x00200037"),
      6,
    );

    return {
      studyTitle: normalizeDicomText(dataSet.string("x00081030")),
      seriesTitle: normalizeDicomText(dataSet.string("x0008103e")),
      seriesNumber: dataSet.intString("x00200011")?.toString(),
      modality: normalizeDicomText(dataSet.string("x00080060")),
      patientName: normalizeDicomPersonName(dataSet.string("x00100010")),
      patientId: normalizeDicomText(dataSet.string("x00100020")),
      studyDate: formatDicomDate(dataSet.string("x00080020")),
      instanceNumber: dataSet.intString("x00200013"),
      imagePositionPatient:
        imagePositionPatient && imagePositionPatient.length === 3
          ? (imagePositionPatient as [number, number, number])
          : undefined,
      imageOrientationPatient:
        imageOrientationPatient && imageOrientationPatient.length === 6
          ? (imageOrientationPatient as [
              number,
              number,
              number,
              number,
              number,
              number,
            ])
          : undefined,
      frameOfReferenceUID: normalizeDicomText(dataSet.string("x00200052")),
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
      imagePositionPatient: undefined,
      imageOrientationPatient: undefined,
      frameOfReferenceUID: undefined,
    };
  }
}
