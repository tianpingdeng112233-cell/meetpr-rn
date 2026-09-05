/* eslint-disable import/no-unresolved -- W1-h native dependencies are supplied by the native workspace; this offline worktree lacks their node_modules entries. */
import { File, Paths } from 'expo-file-system';

import {
  type SelectedVideo,
  shouldPassthroughVideo,
  transcodeMaxSize,
  VIDEO_MAX_DURATION_SECONDS,
  VIDEO_UPLOAD_ERRORS,
} from './model';
import { UploadCancelledError } from './multipart';

export type VideoSource = 'camera' | 'library';

export class VideoNativeError extends Error {
  readonly copy: string;

  constructor(copy: string, options?: { cause?: unknown }) {
    super(copy, options);
    this.name = 'VideoNativeError';
    this.copy = copy;
  }
}

function numberOr(value: string | number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function pickTrainingVideo(
  source: VideoSource,
): Promise<SelectedVideo | null> {
  const ImagePicker = await import('expo-image-picker');
  if (source === 'camera') {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (!cameraPermission.granted) {
      throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing);
    }
  } else {
    const libraryPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libraryPermission.granted) {
      throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing);
    }
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['videos'],
          allowsEditing: true,
          quality: 1,
          videoMaxDuration: VIDEO_MAX_DURATION_SECONDS,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['videos'],
          allowsEditing: true,
          quality: 1,
          selectionLimit: 1,
        });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  if (source === 'camera') {
    try {
      const MediaLibrary = await import('expo-media-library');
      const permission = await MediaLibrary.requestPermissionsAsync(true, ['video']);
      if (!permission.granted) throw new Error('Media library permission denied');
      await MediaLibrary.Asset.create(asset.uri);
    } catch (cause) {
      throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing, { cause });
    }
  }

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

export type PrepareVideoControl = {
  signal: AbortSignal;
  setCompressionCancellationId: (id: string) => void;
};

export async function prepareTrainingVideo(
  source: SelectedVideo,
  control: PrepareVideoControl,
): Promise<{ localUri: string; sizeBytes: number }> {
  if (
    source.durationMs !== null &&
    source.durationMs > VIDEO_MAX_DURATION_SECONDS * 1_000
  ) {
    throw new VideoNativeError(
      VIDEO_UPLOAD_ERRORS.tooLong(VIDEO_MAX_DURATION_SECONDS),
    );
  }
  if (control.signal.aborted) throw new UploadCancelledError();

  let Compressor: typeof import('react-native-compressor');
  let metadata: Awaited<ReturnType<typeof import('react-native-compressor')['getVideoMetaData']>>;
  try {
    Compressor = await import('react-native-compressor');
    metadata = await Compressor.getVideoMetaData(source.uri);
  } catch (cause) {
    throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing, { cause });
  }

  const durationSeconds = numberOr(metadata.duration, 0);
  if (
    durationSeconds > VIDEO_MAX_DURATION_SECONDS ||
    (durationSeconds === 0 &&
      source.durationMs !== null &&
      source.durationMs > VIDEO_MAX_DURATION_SECONDS * 1_000)
  ) {
    throw new VideoNativeError(
      VIDEO_UPLOAD_ERRORS.tooLong(VIDEO_MAX_DURATION_SECONDS),
    );
  }

  const width = numberOr(metadata.width, source.width);
  const height = numberOr(metadata.height, source.height);
  const codec = metadata.codec ?? source.codec;
  const rotationDegrees = numberOr(metadata.rotation, source.rotationDegrees);
  const isMp4 =
    source.mimeType === 'video/mp4' ||
    metadata.extension?.toLowerCase().replace(/^\./, '') === 'mp4' ||
    /\.mp4(?:$|[?#])/i.test(source.uri);
  const passthrough =
    isMp4 &&
    shouldPassthroughVideo({ codec, width, height, rotationDegrees });

  let localUri = source.uri;
  if (!passthrough) {
    try {
      localUri = await Compressor.Video.compress(
        source.uri,
        {
          compressionMethod: 'manual',
          maxSize: transcodeMaxSize(width, height),
          minimumFileSizeForCompress: 0,
          progressDivider: 1,
          getCancellationId: control.setCompressionCancellationId,
        },
        () => undefined,
      );
      if (control.signal.aborted) throw new UploadCancelledError();
      const outputMetadata = await Compressor.getVideoMetaData(localUri);
      const extension = outputMetadata.extension?.toLowerCase().replace(/^\./, '');
      if (extension && extension !== 'mp4') {
        throw new Error('Compressor did not produce MP4');
      }
    } catch (cause) {
      if (cause instanceof UploadCancelledError) throw cause;
      throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.transcode, { cause });
    }
  }

  try {
    const file = new File(localUri);
    if (!file.exists || file.size <= 0) throw new Error('Prepared video is empty');
    if (localUri !== source.uri) deleteLocalVideo(source.uri);
    return { localUri, sizeBytes: file.size };
  } catch (cause) {
    if (cause instanceof VideoNativeError) throw cause;
    throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing, { cause });
  }
}

export function cancelVideoCompression(cancellationId: string | null): void {
  if (!cancellationId) return;
  void import('react-native-compressor')
    .then(({ Video }) => Video.cancelCompression(cancellationId))
    .catch(() => undefined);
}

export function deleteLocalVideo(uri: string | null): void {
  if (
    !uri?.startsWith('file://') ||
    (!uri.startsWith(Paths.cache.uri) && !uri.startsWith(Paths.document.uri))
  ) {
    return;
  }
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Local cleanup is best-effort and must not alter the upload result.
  }
}
