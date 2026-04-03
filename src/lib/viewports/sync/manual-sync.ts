export function shouldProcessManualSequenceSyncRequest(
  request: { id: number; sourceViewportId: string } | null,
  lastProcessedRequestId: number,
) {
  if (!request) {
    return false;
  }

  return request.id > lastProcessedRequestId;
}
