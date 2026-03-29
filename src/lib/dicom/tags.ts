import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { resolveDicomFile } from "@/lib/dicom/filesystem";
import type { DicomTagNode, DicomTagResponse } from "@/types/dicom";

const require = createRequire(import.meta.url);
const { explicitElementToString, parseDicom } = require("dicom-parser") as typeof import("dicom-parser");
const { standardDataElements } = require("dicom-data-dictionary") as {
  standardDataElements: Record<
    string,
    {
      vr?: string;
      name?: string;
    }
  >;
};

function formatDisplayTag(tag: string) {
  const normalizedTag = tag.slice(1).toUpperCase();
  return `(${normalizedTag.slice(0, 4)},${normalizedTag.slice(4)})`;
}

function formatTagName(keyword: string | null) {
  if (!keyword) {
    return "Unknown";
  }

  return keyword
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
}

function formatByteLength(length: number) {
  if (length < 1024) {
    return `${length} B`;
  }

  if (length < 1024 * 1024) {
    return `${(length / 1024).toFixed(length >= 10 * 1024 ? 0 : 1)} KB`;
  }

  return `${(length / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeDisplayValue(value: string | undefined) {
  const normalizedValue = value?.replaceAll("\0", " ").replace(/\s+/g, " ").trim();
  return normalizedValue ? normalizedValue : null;
}

function formatElementLength(
  element: import("dicom-parser").Element,
) {
  return element.hadUndefinedLength ? null : element.length;
}

function lookupTagDictionaryEntry(tag: string) {
  return standardDataElements[tag.slice(1).toUpperCase()] ?? null;
}

function getElementVr(
  tag: string,
  element: import("dicom-parser").Element,
) {
  return element.vr ?? lookupTagDictionaryEntry(tag)?.vr ?? "UN";
}

function formatElementValue(
  dataSet: import("dicom-parser").DataSet,
  tag: string,
  element: import("dicom-parser").Element,
) {
  const vr = getElementVr(tag, element);
  const normalizedElement = element.vr === vr ? element : { ...element, vr };

  if (vr === "SQ") {
    const itemCount = element.items?.length ?? 0;
    return `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  }

  const directValue = normalizeDisplayValue(
    explicitElementToString(dataSet, normalizedElement),
  );

  if (directValue) {
    return directValue;
  }

  if (element.length === 0) {
    return "";
  }

  if (["OB", "OD", "OF", "OL", "OW", "OV", "UN"].includes(vr)) {
    return `<${vr} · ${formatByteLength(element.length)}>`;
  }

  return null;
}

function buildSequenceItemNode(
  item: import("dicom-parser").Element,
  itemIndex: number,
  parentId: string,
): DicomTagNode {
  const itemId = `${parentId}/item-${itemIndex + 1}`;
  const children: DicomTagNode[] = item.dataSet
    ? buildDicomTagNodes(item.dataSet, itemId)
    : [];

  return {
    id: itemId,
    nodeType: "item",
    tag: `item-${itemIndex + 1}`,
    displayTag: `Item #${itemIndex + 1}`,
    name: "Sequence Item",
    keyword: null,
    vr: "ITEM",
    value: `${children.length} tag${children.length === 1 ? "" : "s"}`,
    length: formatElementLength(item),
    children,
  } satisfies DicomTagNode;
}

function buildDicomTagNode(
  dataSet: import("dicom-parser").DataSet,
  tag: string,
  parentId: string,
): DicomTagNode {
  const element = dataSet.elements[tag];
  const dictionaryEntry = lookupTagDictionaryEntry(tag);
  const keyword = dictionaryEntry?.name ?? null;
  const vr = getElementVr(tag, element);
  const nodeId = `${parentId}/${tag}`;
  const isSequence = vr === "SQ";
  const children: DicomTagNode[] = isSequence
    ? (element.items ?? []).map((item, index) =>
        buildSequenceItemNode(item, index, nodeId),
      )
    : [];

  return {
    id: nodeId,
    nodeType: "element",
    tag: tag.slice(1).toUpperCase(),
    displayTag: formatDisplayTag(tag),
    name: formatTagName(keyword),
    keyword,
    vr,
    value: formatElementValue(dataSet, tag, element),
    length: formatElementLength(element),
    children,
  } satisfies DicomTagNode;
}

function buildDicomTagNodes(
  dataSet: import("dicom-parser").DataSet,
  parentId: string,
): DicomTagNode[] {
  return Object.keys(dataSet.elements)
    .sort((left, right) => left.localeCompare(right))
    .map((tag) => buildDicomTagNode(dataSet, tag, parentId));
}

function countDicomTagNodes(nodes: DicomTagNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countDicomTagNodes(node.children), 0);
}

export async function readDicomTags(relativePath: string): Promise<DicomTagResponse> {
  const resolved = resolveDicomFile(relativePath);
  const fileBuffer = await readFile(resolved.absolutePath);
  const dataSet = parseDicom(fileBuffer, {
    vrCallback: (tag) => lookupTagDictionaryEntry(tag)?.vr ?? "UN",
  });
  const tags = buildDicomTagNodes(dataSet, "root");

  return {
    filePath: resolved.normalizedRelativePath,
    fileName: path.basename(resolved.normalizedRelativePath),
    generatedAt: new Date().toISOString(),
    tagCount: countDicomTagNodes(tags),
    tags,
  };
}
