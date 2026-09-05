import { File } from 'expo-file-system';

import type { UploadCompleteRequest } from '@/api/domains/uploads';

import {
  VIDEO_PART_RETRY_COUNT,
  VIDEO_PART_RETRY_DELAY_MS,
  VIDEO_PART_SIZE_BYTES,
  VIDEO_UPLOAD_CONCURRENCY,
} from './model';

export class UploadCancelledError extends Error {
  constructor() {
    super('Video upload cancelled');
    this.name = 'UploadCancelledError';
  }
}

type PartUrl = { part_number: number; url: string };

type MultipartOptions = {
  signal: AbortSignal;
  onProgress: (progress: number) => void;
  sleep?: (milliseconds: number) => Promise<void>;
  concurrency?: number;
  retryCount?: number;
  retryDelayMs?: number;
};

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function putPart(
  url: string,
  body: Blob,
  signal: AbortSignal,
  onProgress: (loaded: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new UploadCancelledError());
      return;
    }

    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    signal.addEventListener('abort', abort, { once: true });
    request.open('PUT', url);
    request.setRequestHeader('content-type', 'application/octet-stream');
    request.upload.onprogress = (event) => onProgress(event.loaded);
    request.onerror = () => {
      signal.removeEventListener('abort', abort);
      reject(new Error('OSS part upload failed'));
    };
    request.onabort = () => {
      signal.removeEventListener('abort', abort);
      reject(new UploadCancelledError());
    };
    request.onload = () => {
      signal.removeEventListener('abort', abort);
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`OSS part upload returned ${request.status}`));
        return;
      }
      const etag = request.getResponseHeader('etag');
      if (!etag) {
        reject(new Error('OSS part response did not expose ETag'));
        return;
      }
      onProgress(body.size);
      resolve(etag);
    };
    request.send(body);
  });
}

export async function uploadFileParts(
  fileUri: string,
  partUrls: readonly PartUrl[],
  options: MultipartOptions,
): Promise<UploadCompleteRequest['parts']> {
  const file = new File(fileUri);
  const totalBytes = file.size;
  if (totalBytes <= 0) throw new Error('Video file is empty');

  const expectedParts = Math.ceil(totalBytes / VIDEO_PART_SIZE_BYTES);
  if (partUrls.length !== expectedParts) {
    throw new Error('Upload server returned the wrong number of part URLs');
  }

  const urls = [...partUrls].sort((a, b) => a.part_number - b.part_number);
  urls.forEach((part, index) => {
    if (part.part_number !== index + 1) {
      throw new Error('Upload server returned invalid part numbers');
    }
  });

  const loadedByPart = Array.from({ length: expectedParts }, () => 0);
  const results: UploadCompleteRequest['parts'] = [];
  const sleep = options.sleep ?? defaultSleep;
  const retries = options.retryCount ?? VIDEO_PART_RETRY_COUNT;
  const retryDelay = options.retryDelayMs ?? VIDEO_PART_RETRY_DELAY_MS;
  let cursor = 0;

  const report = () => {
    const loaded = loadedByPart.reduce((sum, value) => sum + value, 0);
    options.onProgress(Math.min(1, loaded / totalBytes));
  };

  const worker = async () => {
    while (cursor < urls.length) {
      if (options.signal.aborted) throw new UploadCancelledError();
      const index = cursor;
      cursor += 1;
      const part = urls[index];
      const start = index * VIDEO_PART_SIZE_BYTES;
      const end = Math.min(totalBytes, start + VIDEO_PART_SIZE_BYTES);
      const body = file.slice(start, end, 'application/octet-stream');

      let lastError: unknown;
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        loadedByPart[index] = 0;
        report();
        try {
          const etag = await putPart(
            part.url,
            body,
            options.signal,
            (loaded) => {
              loadedByPart[index] = Math.min(body.size, loaded);
              report();
            },
          );
          results.push({ part_number: part.part_number, etag });
          lastError = undefined;
          break;
        } catch (error) {
          lastError = error;
          if (error instanceof UploadCancelledError || attempt === retries) throw error;
          await sleep(retryDelay);
        }
      }
      if (lastError) throw lastError;
    }
  };

  const concurrency = Math.max(
    1,
    Math.min(options.concurrency ?? VIDEO_UPLOAD_CONCURRENCY, urls.length),
  );
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results.sort((a, b) => a.part_number - b.part_number);
}
