export type RetainedVideo = {
  key: string;
  createdAt: number;
  sizeBytes: number;
  uploaded: boolean;
};
export const VIDEO_LOCAL_LIMIT_BYTES = 500 * 1024 * 1024;
export function localRetentionRemovals(
  files: readonly RetainedVideo[],
  now: number,
): string[] {
  const removed = new Set(
    files
      .filter(
        (file) =>
          file.uploaded &&
          new Date(file.createdAt).toDateString() !==
            new Date(now).toDateString(),
      )
      .map((file) => file.key),
  );
  const remaining = files
    .filter((file) => !removed.has(file.key))
    .sort((a, b) => a.createdAt - b.createdAt || a.key.localeCompare(b.key));
  let total = remaining.reduce((sum, file) => sum + file.sizeBytes, 0);
  for (const file of remaining) {
    if (total <= VIDEO_LOCAL_LIMIT_BYTES) break;
    removed.add(file.key);
    total -= file.sizeBytes;
  }
  return [...removed];
}
export function removedVideoUris(record: {
  localUri: string | null;
  source: { uri: string } | null;
}): string[] {
  return [
    ...new Set(
      [record.localUri, record.source?.uri].filter((uri): uri is string =>
        Boolean(uri),
      ),
    ),
  ];
}
export async function selectPlaybackSource(
  localUri: string | null,
  exists: (uri: string) => boolean,
  remote: () => Promise<string>,
): Promise<string> {
  return localUri && exists(localUri) ? localUri : remote();
}
