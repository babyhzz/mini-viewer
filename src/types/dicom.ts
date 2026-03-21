export interface DicomImageNode {
  imageId: string;
  title: string;
  fileName: string;
  filePath: string;
  dicomUrl: string;
  instanceNumber?: number;
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
