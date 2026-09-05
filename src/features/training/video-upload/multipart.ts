import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import type { UploadCompleteRequest } from '@/api/domains/uploads';
import {
  VIDEO_PART_SIZE_BYTES,
  VIDEO_UPLOAD_CONCURRENCY,
  VIDEO_UPLOAD_ERRORS,
} from './model';
import { VideoNativeError } from './native-error';
export class UploadCancelledError extends Error {
  constructor() {
    super('Video upload cancelled');
    this.name = 'UploadCancelledError';
  }
}
export class PartUploadError extends Error {
  constructor(readonly status: number) {
    super(`Part upload returned ${status}`);
  }
}
export type MultipartOptions = {
  signal: AbortSignal;
  onProgress: (progress: number) => void;
  completedParts?: UploadCompleteRequest['parts'];
  onPart?: (part: UploadCompleteRequest['parts'][number]) => Promise<void>;
  concurrency?: number;
};
const partDirectory = () => new Directory(Paths.cache, 'video-parts');
/** Called at cold startup, before any workers exist. */
export function cleanInterruptedParts(): void {
  try {
    const directory = partDirectory();
    if (directory.exists) directory.delete();
  } catch (cause) {
    throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing, {
      cause,
      deterministic: true,
    });
  }
}
export async function uploadFileParts(
  fileUri: string,
  partUrls: readonly { part_number: number; url: string }[],
  options: MultipartOptions,
): Promise<UploadCompleteRequest['parts']> {
  const file = new File(fileUri);
  const totalBytes = file.size;
  if (totalBytes <= 0) throw new Error('Video file is empty');
  const count = Math.ceil(totalBytes / VIDEO_PART_SIZE_BYTES);
  const urls = [...partUrls].sort((a, b) => a.part_number - b.part_number);
  if (
    urls.length !== count ||
    urls.some((part, index) => part.part_number !== index + 1)
  )
    throw new Error('Invalid multipart URLs');
  const results = [...(options.completedParts ?? [])];
  const directory = partDirectory();
  directory.create({ intermediates: true, idempotent: true });
  const batch = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal.addEventListener('abort', abort, { once: true });
  if (options.signal.aborted) abort();
  let cursor = 0;
  let firstError: unknown;
  const worker = async () => {
    try {
      while (cursor < urls.length) {
        if (controller.signal.aborted) throw new UploadCancelledError();
        const part = urls[cursor++];
        if (results.some((done) => done.part_number === part.part_number))
          continue;
        const start = (part.part_number - 1) * VIDEO_PART_SIZE_BYTES;
        const size = Math.min(VIDEO_PART_SIZE_BYTES, totalBytes - start);
        const temporary = new File(
          directory,
          `${batch}-${part.part_number}.part`,
        );
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let timedOut = false;
        let cancelUpload: (() => void) | undefined;
        try {
          const handle = file.open();
          try {
            handle.offset = start;
            temporary.write(handle.readBytes(size));
          } finally {
            handle.close();
          }
          const task = FileSystem.createUploadTask(part.url, temporary.uri, {
            httpMethod: 'PUT',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            // OSS signs without Content-Type. expo/fetch can infer a null header from File
            // bodies that Android NativeRequest rejects, even when headers are omitted.
          });
          const cancelled = new Promise<never>((_resolve, reject) => {
            let cancellationRequested = false;
            cancelUpload = () => {
              if (cancellationRequested) return;
              cancellationRequested = true;
              // Do not depend on uploadAsync settling after native cancellation.
              void task.cancelAsync().then(
                () => reject(new UploadCancelledError()),
                reject,
              );
            };
            controller.signal.addEventListener('abort', cancelUpload, { once: true });
            timeout = setTimeout(() => {
              timedOut = true;
              cancelUpload!();
            }, 60_000);
          });
          const response = await Promise.race([task.uploadAsync(), cancelled]);
          if (timedOut) throw new PartUploadError(408);
          if (controller.signal.aborted) throw new UploadCancelledError();
          if (!response) throw new Error('Part upload returned no response');
          if (response.status < 200 || response.status >= 300)
            throw new PartUploadError(response.status);
          const etag = Object.entries(response.headers).find(
            ([name]) => name.toLowerCase() === 'etag',
          )?.[1];
          if (!etag) throw new Error('Part response omitted ETag');
          const completed = { part_number: part.part_number, etag };
          await options.onPart?.(completed);
          results.push(completed);
          options.onProgress(results.length / count);
        } catch (error) {
          throw timedOut ? new PartUploadError(408) : error;
        } finally {
          clearTimeout(timeout);
          if (cancelUpload)
            controller.signal.removeEventListener('abort', cancelUpload);
          try {
            if (temporary.exists) temporary.delete();
          } catch (cause) {
            throw new VideoNativeError(VIDEO_UPLOAD_ERRORS.processing, {
              cause,
              deterministic: true,
            });
          }
        }
      }
    } catch (error) {
      firstError ??= error;
      controller.abort();
    }
  };
  try {
    await Promise.all(
      Array.from(
        {
          length: Math.max(
            1,
            Math.min(options.concurrency ?? VIDEO_UPLOAD_CONCURRENCY, count),
          ),
        },
        worker,
      ),
    );
    if (options.signal.aborted) throw new UploadCancelledError();
    if (firstError) throw firstError;
    return results.sort((a, b) => a.part_number - b.part_number);
  } finally {
    options.signal.removeEventListener('abort', abort);
  }
}
