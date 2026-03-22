export interface DicomImageNode {
  imageId: string;
  title: string;
  fileName: string;
  filePath: string;
  dicomUrl: string;
  instanceNumber?: number;
  imagePositionPatient?: [number, number, number];
  imageOrientationPatient?: [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  frameOfReferenceUID?: string;
}

export interface DicomSeriesNode {
  seriesId: string;
  title: string;
  imageCount: number;
  thumbnailPath: string;
  modality?: string;
  seriesNumber?: string;
  images: DicomImageNode[];
}

export interface DicomStudyNode {
  studyId: string;
  title: string;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  series: DicomSeriesNode[];
}

export interface DicomHierarchyResponse {
  studies: DicomStudyNode[];
  generatedAt: string;
}

export interface DicomTagNode {
  id: string;
  nodeType: "element" | "item";
  tag: string;
  displayTag: string;
  name: string;
  keyword: string | null;
  vr: string;
  value: string | null;
  length: number | null;
  children: DicomTagNode[];
}

export interface DicomTagResponse {
  filePath: string;
  fileName: string;
  generatedAt: string;
  tagCount: number;
  tags: DicomTagNode[];
}
