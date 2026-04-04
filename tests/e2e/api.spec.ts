import { expect, test } from "@playwright/test";

test.describe("DICOM viewer smoke coverage", () => {
  test("hierarchy api exposes the local study tree @smoke", async ({ request }) => {
    const response = await request.get("/api/hierarchy");

    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/json");

    const payload = (await response.json()) as {
      generatedAt: string;
      studies: Array<{
        studyId: string;
        title: string;
        series: Array<{
          seriesId: string;
          title: string;
          images: Array<{
            dicomUrl: string;
            filePath: string;
            instanceNumber?: number;
          }>;
        }>;
      }>;
    };

    expect(payload.generatedAt).toBeTruthy();
    expect(payload.studies.length).toBeGreaterThan(0);
    expect(payload.studies[0].studyId).toBeTruthy();
    expect(payload.studies[0].title).toBeTruthy();
    expect(payload.studies[0].title).not.toBe(payload.studies[0].studyId);
    expect(payload.studies[0].series.length).toBeGreaterThan(0);
    expect(payload.studies[0].series[0].seriesId).toBeTruthy();
    expect(payload.studies[0].series[0].title).toBeTruthy();
    expect(payload.studies[0].series[0].title).not.toBe(
      payload.studies[0].series[0].seriesId,
    );
    expect(payload.studies[0].series[0].images.length).toBeGreaterThan(0);
    expect(payload.studies[0].series[0].images[0].dicomUrl).toContain(
      "/api/dicom",
    );

    const sortableSeries = payload.studies
      .flatMap((study) => study.series)
      .find(
        (series) =>
          series.images.filter((image) => image.instanceNumber != null)
            .length >= 2,
      );

    expect(sortableSeries).toBeTruthy();

    const instanceNumbers = sortableSeries!.images
      .map((image) => image.instanceNumber)
      .filter((value): value is number => value != null);

    expect(instanceNumbers.length).toBeGreaterThan(1);

    for (let index = 1; index < instanceNumbers.length; index += 1) {
      expect(instanceNumbers[index]).toBeGreaterThanOrEqual(
        instanceNumbers[index - 1],
      );
    }
  });

  test("settings api exposes the default overlay configuration @smoke", async ({
    request,
  }) => {
    const response = await request.get("/api/settings");

    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as {
      schemaVersion: number;
      viewportOverlay: {
        schemaVersion: number;
        corners: Record<string, Array<{ id: string; tagKey: string }>>;
      };
      toolbarShortcuts: {
        schemaVersion: number;
        bindings: Record<string, { code: string } | null>;
      };
      mprProjection: {
        schemaVersion: number;
        defaultSlabMode: string;
        defaultSlabThickness: number;
      };
    };

    expect(payload.schemaVersion).toBe(1);
    expect(payload.viewportOverlay.schemaVersion).toBe(1);
    expect(payload.viewportOverlay.corners.topLeft.length).toBeGreaterThan(0);
    expect(payload.viewportOverlay.corners.topRight.length).toBeGreaterThan(0);
    expect(payload.viewportOverlay.corners.bottomLeft.length).toBeGreaterThan(
      0,
    );
    expect(payload.viewportOverlay.corners.bottomRight.length).toBeGreaterThan(
      0,
    );
    expect(payload.toolbarShortcuts.schemaVersion).toBe(1);
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("select");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("undo");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("redo");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("referenceLines");
    expect(payload.toolbarShortcuts.bindings.keyImage?.code).toBe("KeyK");
    expect(payload.toolbarShortcuts.bindings.dicomTag?.code).toBe("F2");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("settings");
    expect(payload.mprProjection.schemaVersion).toBe(1);
    expect(payload.mprProjection.defaultSlabMode).toBe("none");
    expect(payload.mprProjection.defaultSlabThickness).toBe(10);
  });

  test("dicom tags api returns the parsed tag tree for a real image", async ({
    request,
  }) => {
    const hierarchyResponse = await request.get("/api/hierarchy");
    const hierarchyPayload = (await hierarchyResponse.json()) as {
      studies: Array<{
        series: Array<{
          images: Array<{
            filePath: string;
          }>;
        }>;
      }>;
    };
    const firstImagePath =
      hierarchyPayload.studies[0]?.series[0]?.images[0]?.filePath ?? null;

    expect(firstImagePath).toBeTruthy();

    const response = await request.get(
      `/api/dicom-tags?path=${encodeURIComponent(firstImagePath!)}`,
    );

    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as {
      filePath: string;
      fileName: string;
      tagCount: number;
      tags: Array<{
        displayTag: string;
        name: string;
        vr: string;
        children: unknown[];
      }>;
    };

    expect(payload.filePath).toBe(firstImagePath);
    expect(payload.fileName).toBeTruthy();
    expect(payload.tagCount).toBeGreaterThan(0);
    expect(payload.tags.length).toBeGreaterThan(0);
    expect(payload.tags[0].displayTag).toMatch(/^\([0-9A-F]{4},[0-9A-F]{4}\)$/);
    expect(payload.tags[0].name).toBeTruthy();
    expect(payload.tags[0].vr).toBeTruthy();
    expect(Array.isArray(payload.tags[0].children)).toBeTruthy();
  });
});
