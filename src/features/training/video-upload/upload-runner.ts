import { ApiError } from '@/api/client';
import {
  uploadsRepository,
  type UploadInitiateResponse,
  type UploadCompleteRequest,
} from '@/api/domains/uploads';
import { videoPartCount } from './model';
import {
  uploadFileParts,
  PartUploadError,
  UploadCancelledError,
  type MultipartOptions,
} from './multipart';

type UploadRepository = Pick<
  typeof uploadsRepository,
  'abort' | 'complete' | 'initiate'
> &
  Partial<Pick<typeof uploadsRepository, 'remove' | 'url'>>;
export type PreparedUploadInput = {
  localUri: string;
  setLogId: string;
  sizeBytes: number;
  signal: AbortSignal;
  session?: UploadInitiateResponse | null;
  parts?: UploadCompleteRequest['parts'];
  onSession?: (session: UploadInitiateResponse | null) => Promise<void>;
  onPart?: MultipartOptions['onPart'];
  onInitiated: (attachmentId: string) => void;
  onProgress: (progress: number) => void;
};
export type PreparedUploadDependencies = {
  repository?: UploadRepository;
  uploadParts?: (
    fileUri: string,
    partUrls: UploadInitiateResponse['part_urls'],
    options: MultipartOptions,
  ) => Promise<UploadCompleteRequest['parts']>;
};
export async function runPreparedVideoUpload(
  input: PreparedUploadInput,
  dependencies: PreparedUploadDependencies = {},
): Promise<string> {
  const repository = dependencies.repository ?? uploadsRepository;
  const uploadParts = dependencies.uploadParts ?? uploadFileParts;
  let session = input.session;
  let parts = input.parts ?? [];
  let refreshed = false;
  for (;;) {
    if (input.signal.aborted) throw new UploadCancelledError();
    let completing = false;
    try {
      if (!session) {
        session = await repository.initiate({
          kind: 'set_video',
          content_type: 'video/mp4',
          size_bytes: input.sizeBytes,
          part_count: videoPartCount(input.sizeBytes),
          filename: `setlog-${input.setLogId}-${
            input.localUri
              .split('/')
              .pop()
              ?.replace(/\.[^.]+$/, '') ?? 'video'
          }.mp4`,
          set_log_id: input.setLogId,
        });
        // Persist the session before sending any parts, even if cancellation raced initiate.
        await input.onSession?.(session);
        input.onInitiated(session.attachment_id);
      }
      if (input.signal.aborted) throw new UploadCancelledError();
      const completed = await uploadParts(input.localUri, session.part_urls, {
        signal: input.signal,
        onProgress: input.onProgress,
        completedParts: parts,
        onPart: input.onPart,
      });
      if (input.signal.aborted) throw new UploadCancelledError();
      completing = true;
      const attachment = await repository.complete(session.attachment_id, {
        parts: completed,
      });
      return attachment.id;
    } catch (error) {
      if (session && error instanceof PartUploadError && error.status === 403) {
        await (repository.remove ?? repository.abort)(session.attachment_id);
        session = null;
        parts = [];
        await input.onSession?.(null);
        if (!refreshed) {
          refreshed = true;
          continue;
        }
      }
      const completeConflict =
        completing && error instanceof ApiError && error.status === 409;
      if (completeConflict && session && repository.url) {
        // The server may have committed complete just before the process died.
        await repository.url(session.attachment_id);
        return session.attachment_id;
      }
      if (
        session &&
        !completeConflict &&
        (input.signal.aborted || !input.onSession)
      ) {
        await repository.abort(session.attachment_id).catch(() => undefined);
      }
      throw error;
    }
  }
}
