export function toCornerstoneImageId(dicomUrl: string) {
  if (typeof window === "undefined") {
    return `wadouri:${dicomUrl}`;
  }

  return `wadouri:${new URL(dicomUrl, window.location.origin).href}`;
}
