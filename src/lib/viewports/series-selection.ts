import type {
  DicomHierarchyResponse,
  DicomSeriesNode,
  DicomStudyNode,
} from "@/types/dicom";

export interface SelectedSeries {
  key: string;
  study: DicomStudyNode;
  series: DicomSeriesNode;
}

export function buildSeriesKey(studyId: string, seriesId: string) {
  return `${studyId}::${seriesId}`;
}

export function getOrderedSeriesEntries(
  hierarchy: DicomHierarchyResponse | null,
): SelectedSeries[] {
  if (!hierarchy) {
    return [];
  }

  return hierarchy.studies.flatMap((study) =>
    study.series.map((series) => ({
      key: buildSeriesKey(study.studyId, series.seriesId),
      study,
      series,
    })),
  );
}
