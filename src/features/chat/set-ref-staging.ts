import { create } from 'zustand';
import type { ChatSetRef } from '@/api/domains/chat';
import type { SetRefVideo } from './set-ref';
import { useVideoUploadStore } from '@/features/training/video-upload/store';

export type SetRefSendIntent = {
  conversationId: string;
  clientId: string;
  setRef: ChatSetRef;
  body: string;
  video: Exclude<SetRefVideo, { state: 'failed' }> | null;
};
export const useSetRefStagingStore = create<{
  intents: Record<string, SetRefSendIntent>;
  stage: (intent: SetRefSendIntent) => void;
  discard: (conversationId: string, clientId?: string) => void;
}>((set) => ({
  intents: {},
  stage: intent => set(state => ({ intents: { ...state.intents, [intent.conversationId]: intent } })),
  discard: (conversationId, clientId) => set(state => {
    if (clientId && state.intents[conversationId]?.clientId !== clientId) return state;
    const intents = { ...state.intents };
    delete intents[conversationId];
    return { intents };
  }),
}));

/** Subscribe before reading, and retain local identity until the remote attachment exists. */
export function waitForSetRefVideo(video: SetRefSendIntent['video'], signal?: AbortSignal): Promise<string | undefined> {
  if (signal?.aborted) return Promise.reject(new Error('chat.videoUnavailable'));
  if (!video) return Promise.resolve(undefined);
  if (video.state === 'ready') return Promise.resolve(video.videoId);
  // attachmentId belongs to a renewable server upload session; createdAt identifies the local selection.
  return new Promise((resolve, reject) => {
    const finish = (id?: string, error?: string) => {
      unsubscribe(); signal?.removeEventListener('abort', aborted);
      if (error) reject(new Error(error)); else resolve(id);
    };
    const aborted = () => finish(undefined, 'chat.videoUnavailable');
    const check = () => {
      const record = useVideoUploadStore.getState().records[video.recordKey];
      if (!record || record.createdAt !== video.createdAt || record.status === 'none') finish(undefined, 'chat.videoUnavailable');
      else if (record.status === 'failed') finish(undefined, 'chat.videoFailed');
      else if (record.status === 'uploaded') finish(record.attachmentId ?? undefined, record.attachmentId ? undefined : 'chat.videoUnavailable');
    };
    const unsubscribe = useVideoUploadStore.subscribe(check);
    signal?.addEventListener('abort', aborted, { once: true });
    check();
  });
}
