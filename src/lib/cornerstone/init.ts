let cornerstoneInitPromise:
  | Promise<{
      core: typeof import("@cornerstonejs/core");
      tools: typeof import("@cornerstonejs/tools");
    }>
  | undefined;

let cornerstoneConfigured = false;
const registeredToolNames = new Set<string>();

const ONE_MB = 1024 * 1024;
const MIN_CACHE_SIZE_MB = 128;
const MAX_CACHE_SIZE_MB = 512;

type BrowserNavigator = Navigator & {
  deviceMemory?: number;
};

function getCornerstoneCacheSizeInBytes() {
  const deviceMemory = Number(
    (navigator as BrowserNavigator).deviceMemory ?? 4,
  );
  const cacheSizeInMb = Math.min(
    MAX_CACHE_SIZE_MB,
    Math.max(MIN_CACHE_SIZE_MB, Math.round(deviceMemory * 64)),
  );

  return cacheSizeInMb * ONE_MB;
}

export async function initializeCornerstone() {
  if (typeof window === "undefined") {
    throw new Error("Cornerstone can only be initialized in the browser.");
  }

  if (!cornerstoneInitPromise) {
    cornerstoneInitPromise = (async () => {
      const [core, tools, dicomImageLoader] = await Promise.all([
        import("@cornerstonejs/core"),
        import("@cornerstonejs/tools"),
        import("@cornerstonejs/dicom-image-loader"),
      ]);

      core.init();
      tools.init();
      dicomImageLoader.init({
        maxWebWorkers: Math.max(
          1,
          Math.min(4, Math.floor((navigator.hardwareConcurrency || 2) / 2)),
        ),
      });

      if (!cornerstoneConfigured) {
        // Keep stack prefetch bounded to nearby slices on typical laptops.
        core.cache.setMaxCacheSize(getCornerstoneCacheSizeInBytes());
        cornerstoneConfigured = true;
      }

      const { registerCornerstoneViewportTools } = await import(
        "@/lib/tools/cornerstone-tool-adapter"
      );

      registerCornerstoneViewportTools(core, tools, registeredToolNames);

      return { core, tools };
    })();
  }

  return cornerstoneInitPromise;
}
