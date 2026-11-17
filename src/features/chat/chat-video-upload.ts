import type { ChatMessage } from '@/api/domains/chat';
import type { UploadCompleteRequest, UploadInitiateResponse } from '@/api/domains/uploads';
import type { ChatVideoDraft } from './chat-video-outbox';

type Parts = UploadCompleteRequest['parts'];
type TransferDependencies = {
  initiate: (draft: ChatVideoDraft) => Promise<UploadInitiateResponse>;
  upload: (draft: ChatVideoDraft, parts: UploadInitiateResponse['part_urls'], signal: AbortSignal, progress: (value: number) => void) => Promise<Parts>;
  complete: (id: string, parts: Parts) => Promise<void>;
  post: (draft: ChatVideoDraft, attachmentId: string) => Promise<ChatMessage>;
  abort: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};
/** Owns remote upload cleanup; the session outbox retains the source on failure. */
export function createChatVideoTransfer(deps: TransferDependencies) {
  return async (draft: ChatVideoDraft, signal: AbortSignal, progress: (value: number) => void) => {
    let attachmentId: string | undefined;
    let completed = false;
    const check = () => { if (signal.aborted) throw new Error('Chat video cancelled'); };
    const cleanup = async () => {
      if (!attachmentId) return;
      if (!completed) {
        try { await deps.abort(attachmentId); return; } catch { /* complete may have won the race */ }
      }
      // A lost POST response can leave this attachment referenced. Server-side
      // delete protection rejects that cleanup, preserving the delivered video.
      try { await deps.remove(attachmentId); } catch { /* remote reclamation remains best effort */ }
    };
    try {
      check();
      const upload = await deps.initiate(draft);
      attachmentId = upload.attachment_id;
      check();
      const parts = await deps.upload(draft, upload.part_urls, signal, progress);
      check();
      await deps.complete(attachmentId, parts);
      completed = true;
      check();
      const message = await deps.post(draft, attachmentId);
      if (message.video_id !== attachmentId) await cleanup();
      return message;
    } catch (error) {
      await cleanup();
      throw error;
    }
  };
}
