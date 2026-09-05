import { ApiError } from '@/api/client';
import {
  uploadsRepository,
  type UploadInitiateResponse,
} from '@/api/domains/uploads';

import { videoPartCount } from './model';
import { uploadFileParts } from './multipart';

type UploadRepository = Pick<
  typeof uploadsRepository,
  'abort' | 'complete' | 'initiate'
>;

export type PreparedUploadInput = {
  localUri: string;
  setLogId: string;
  sizeBytes: number;
  signal: AbortSignal;
  onInitiated: (attachmentId: string) => void;
  onProgress: (progress: number) => void;
};

export type PreparedUploadDependencies = {
  repository?: UploadRepository;
  uploadParts?: (
    fileUri: string,
    partUrls: UploadInitiateResponse['part_urls'],
    options: { signal: AbortSignal; onProgress: (progress: number) => void },
  ) => Promise<{ part_number: number; etag: string }[]>;
};

export async function runPreparedVideoUpload(
  input: PreparedUploadInput,
  dependencies: PreparedUploadDependencies = {},
): Promise<string> {
  const repository = dependencies.repository ?? uploadsRepository;
  const uploadParts = dependencies.uploadParts ?? uploadFileParts;
  let attachmentId: string | null = null;
  let completing = false;

  try {
    const initiated = await repository.initiate({
      kind: 'set_video',
      content_type: 'video/mp4',
      size_bytes: input.sizeBytes,
      part_count: videoPartCount(input.sizeBytes),
      filename: `setlog-${input.setLogId}.mp4`,
      set_log_id: input.setLogId,
    });
    attachmentId = initiated.attachment_id;
    input.onInitiated(attachmentId);
    const parts = await uploadParts(input.localUri, initiated.part_urls, {
      signal: input.signal,
      onProgress: input.onProgress,
    });
    completing = true;
    const attachment = await repository.complete(attachmentId, { parts });
    return attachment.id;
  } catch (error) {
    const completeConflict =
      completing && error instanceof ApiError && error.status === 409;
    if (attachmentId && !completeConflict) {
      await repository.abort(attachmentId).catch(() => undefined);
    }
    throw error;
  }
}
