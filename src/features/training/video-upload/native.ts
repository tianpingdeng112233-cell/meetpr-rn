import { SerialTaskQueue } from '../serial-task-queue';
import { t } from '@/i18n';
import { Directory, File, Paths } from 'expo-file-system';
import { requireNativeModule, uuid } from 'expo-modules-core';
import {
  type SelectedVideo,
  VIDEO_MAX_DURATION_SECONDS,
  VIDEO_UPLOAD_ERRORS,
} from './model';
import { passthroughEligibility, type TrackMetadata } from './passthrough';
import { UploadCancelledError } from './multipart';
import * as ImagePicker from 'expo-image-picker';
export type VideoSource = 'camera' | 'library';
export class VideoNativeError extends Error {
  readonly deterministic: boolean;
  constructor(
    readonly copy: string,
    options?: { cause?: unknown; deterministic?: boolean },
  ) {
    super(copy, options);
    this.deterministic = options?.deterministic ?? false;
  }
}
const exportsQueue = new SerialTaskQueue();
// compressor 2.0.3 writes UUID-named MP4s directly to cache (including fast-start siblings).
function cachedExports(): File[] {
  return new Directory(Paths.cache)
    .list()
    .filter(
      (file): file is File =>
        file instanceof File &&
        /^[a-f0-9-]{36}(?:[-_.]streamable)?\.mp4$/i.test(file.name),
    );
}
async function compressVideo(
  source: SelectedVideo,
  control: PrepareVideoControl,
): Promise<string> {
  return exportsQueue.enqueue(async () => {
    if (control.signal.aborted) throw new UploadCancelledError();
    const compressor = await import('react-native-compressor');
    const before = new Set(cachedExports().map((file) => file.uri));
    let cancellationId: string | null = null;
    let abort: () => void = () => {};
    const cancelled = new Promise<never>((_, reject) => {
      abort = () => {
        cancelVideoCompression(cancellationId);
        reject(new UploadCancelledError());
      };
      control.signal.addEventListener('abort', abort, { once: true });
    });
    const pending = compressor.Video.compress(source.uri, {
      compressionMethod: 'manual',
      maxSize: 1280,
      bitrate: 2_750_000,
      minimumFileSizeForCompress: 0,
      getCancellationId: (id) => {
        cancellationId = id;
        control.setCompressionCancellationId(id);
      },
    });
    // Some native cancellations settle late. A late output must never become an orphan.
    void pending.then(
      (uri) => {
        if (control.signal.aborted && uri !== source.uri) deleteLocalVideo(uri);
      },
      () => undefined,
    );
    try {
      if (control.signal.aborted) abort();
      return await Promise.race([pending, cancelled]);
    } catch (error) {
      for (const file of cachedExports())
        if (!before.has(file.uri)) deleteLocalVideo(file.uri);
      throw error;
    } finally {
      control.signal.removeEventListener('abort', abort);
    }
  });
}
const directory = () => {
  const folder = new Directory(Paths.document, 'training-videos');
  folder.create({ intermediates: true, idempotent: true });
  return folder;
};
export async function hasTrainingCamera(): Promise<boolean> {
  try {
    return await requireNativeModule<{ hasCamera(): Promise<boolean> }>(
      'TrainingVideo',
    ).hasCamera();
  } catch {
    return false;
  }
}
export async function pickTrainingVideo(
  _source: VideoSource = 'library',
): Promise<SelectedVideo | null> {
  // Android's system photo picker grants access only to the selected item.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    quality: 1,
    selectionLimit: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration ?? null,
    mimeType: asset.mimeType ?? null,
    fileName: asset.fileName ?? null,
    codec: null,
    rotationDegrees: 0,
  };
}
export function retainVideoSource(source: SelectedVideo): SelectedVideo {
  const file = new File(directory(), `${uuid.v4()}.mp4`);
  new File(source.uri).copy(file);
  deleteLocalVideo(source.uri);
  return { ...source, uri: file.uri };
}
export type PrepareVideoControl = {
  signal: AbortSignal;
  setCompressionCancellationId: (id: string) => void;
};
export async function prepareTrainingVideo(
  source: SelectedVideo,
  control: PrepareVideoControl,
): Promise<{ localUri: string; sizeBytes: number }> {
  const check = () => {
    if (control.signal.aborted) throw new UploadCancelledError();
  };
  check();
  if (!localVideoSize(source.uri))
    throw new VideoNativeError(t('student.videoAttachmentViewModel.copy002'), {
      deterministic: true,
    });
  const compressor = await import('react-native-compressor');
  let output: string | null = null;
  try {
    const metadata = await compressor.getVideoMetaData(source.uri);
    if (
      metadata.duration > VIDEO_MAX_DURATION_SECONDS ||
      (source.durationMs ?? 0) > VIDEO_MAX_DURATION_SECONDS * 1000
    ) {
      throw new VideoNativeError(
        VIDEO_UPLOAD_ERRORS.tooLong(VIDEO_MAX_DURATION_SECONDS),
        { deterministic: true },
      );
    }
    check();
    const tracks = await requireNativeModule<{
      readTracks(uri: string): Promise<TrackMetadata>;
    }>('TrainingVideo').readTracks(source.uri);
    check();
    if (passthroughEligibility(tracks) === 'passthrough')
      return { localUri: source.uri, sizeBytes: new File(source.uri).size };
    output = await compressVideo(source, control);
    check();
    const retained = retainVideoSource({ ...source, uri: output });
    output = retained.uri;
    const file = new File(output);
    if (!file.exists || file.size <= 0) throw new Error('Empty export');
    return { localUri: output, sizeBytes: file.size };
  } catch (cause) {
    if (output && output !== source.uri) deleteLocalVideo(output);
    if (
      cause instanceof UploadCancelledError ||
      cause instanceof VideoNativeError
    )
      throw cause;
    throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.transcode, { cause });
  }
}
export function cancelVideoCompression(id: string | null): void {
  if (id)
    void import('react-native-compressor')
      .then(({ Video }) => Video.cancelCompression(id))
      .catch(() => undefined);
}
export function localVideoSize(uri: string): number {
  try {
    const file = new File(uri);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}
export function deleteLocalVideo(uri: string | null): void {
  if (
    !uri?.startsWith('file://') ||
    (!uri.startsWith(Paths.cache.uri) && !uri.startsWith(Paths.document.uri))
  )
    return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* Best effort cleanup. */
  }
}

/** Sources copied before a crash but never attached are safe to reclaim at cold startup. */
export function cleanOrphanVideos(referencedUris: readonly string[]): void {
  const referenced = new Set(referencedUris);
  for (const file of cachedExports())
    if (!referenced.has(file.uri)) deleteLocalVideo(file.uri);
  for (const file of directory().list()) {
    if (file instanceof File && !referenced.has(file.uri))
      deleteLocalVideo(file.uri);
  }
}
