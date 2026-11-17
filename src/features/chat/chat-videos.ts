import { createUUID } from '@/analytics/uuid';
import { apiRequest } from '@/api/client';
import { CHAT_VIDEO_FALLBACK_BODY, ChatMessageSchema } from '@/api/domains/chat';
import { AttachmentSchema, UploadInitiateRequestSchema, UploadInitiateResponseSchema } from '@/api/domains/uploads';
import { getAccessToken, useSessionStore } from '@/api/session';
import { uploadFileParts } from '@/features/training/video-upload/multipart';
import { VIDEO_PART_SIZE_BYTES } from '@/features/training/video-upload/model';
import { t } from '@/i18n';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';
import { createChatVideoOutbox, type ChatVideoDraft } from './chat-video-outbox';
import { createChatVideoTransfer } from './chat-video-upload';

function removeFile(uri: string) {
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* best-effort cache removal */ }
}
export const chatVideoOutbox = createChatVideoOutbox({
  removeFile,
  send: async (draft, signal, progress) => {
    const accessToken = await getAccessToken();
    if (signal.aborted || useSessionStore.getState().user?.id !== draft.ownerId) throw new Error('Chat video cancelled');
    // Capture this account's credential once. Cleanup after a logout must never
    // issue an old attachment request with the next account's credentials.
    const transfer = createChatVideoTransfer({
      initiate: video => apiRequest('/uploads/initiate', { accessToken, method: 'POST', schema: UploadInitiateResponseSchema,
        body: UploadInitiateRequestSchema.parse({ kind: 'chat_video', content_type: video.contentType, size_bytes: video.sizeBytes,
          part_count: Math.ceil(video.sizeBytes / VIDEO_PART_SIZE_BYTES), filename: video.contentType === 'video/mp4' ? 'video.mp4' : 'video.mov' }) }),
      upload: (video, parts, uploadSignal, onProgress) => uploadFileParts(video.uri, parts, { signal: uploadSignal, onProgress }),
      complete: async (id, parts) => {
        const attachment = await apiRequest(`/uploads/${id}/complete`, { accessToken, method: 'POST', body: { parts }, schema: AttachmentSchema });
        if (attachment.id !== id || attachment.kind !== 'chat_video') throw new Error('Invalid video attachment');
      },
      post: async (video, id) => (await apiRequest(`/conversations/${video.conversationId}/messages`, { accessToken, method: 'POST',
        body: { kind: 'text', body: CHAT_VIDEO_FALLBACK_BODY, video_id: id, client_id: video.clientId }, schema: z.object({ message: ChatMessageSchema }) })).message,
      abort: id => apiRequest<void>(`/uploads/${id}/abort`, { accessToken, method: 'POST', body: {} }),
      remove: id => apiRequest<void>(`/uploads/${id}`, { accessToken, method: 'DELETE' }),
    });
    return transfer(draft, signal, progress);
  },
});

/** Mounted once at the app shell; screen navigation does not affect the outbox. */
export function useChatVideoSession() {
  useEffect(() => {
    const update = () => chatVideoOutbox.setContext(useSessionStore.getState().user?.id ?? null);
    const unsubscribe = useSessionStore.subscribe(update);
    update();
    return () => { unsubscribe(); chatVideoOutbox.setContext(null); };
  }, []);
}

export function useChatVideos(ownerId: string, coachId: string, conversationId: string) {
  const items = useSyncExternalStore(chatVideoOutbox.subscribe, chatVideoOutbox.getSnapshot);
  const [preview, setPreview] = useState<ChatVideoDraft | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retained = useRef<ChatVideoDraft | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    generation.current += 1;
    setPreview(null); setPreparing(false);
    if (coachId) chatVideoOutbox.setContext(ownerId, coachId);
    const cancel = () => {
      generation.current += 1;
      if (retained.current) removeFile(retained.current.uri);
      retained.current = null;
    };
    const unsubscribe = useSessionStore.subscribe(state => { if (state.user?.id !== ownerId) { cancel(); setPreview(null); } });
    return () => { unsubscribe(); cancel(); };
  }, [ownerId, coachId, conversationId]);
  const owned = (version: number) => version === generation.current && useSessionStore.getState().user?.id === ownerId;
  function discardPreview() {
    if (retained.current) removeFile(retained.current.uri);
    retained.current = null; setPreview(null); setError(null);
  }
  async function pick() {
    if (busy.current || !coachId) return;
    busy.current = true; setPreparing(true); setError(null);
    const version = generation.current;
    let copied: File | undefined;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, allowsMultipleSelection: false, selectionLimit: 1, quality: 1 });
      if (!owned(version) || result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const extension = asset.fileName ?? asset.uri;
      const type = asset.mimeType ?? (/\.mov(?:$|\?)/i.test(extension) ? 'video/quicktime' : /\.mp4(?:$|\?)/i.test(extension) ? 'video/mp4' : null);
      if (type !== 'video/mp4' && type !== 'video/quicktime') throw new Error(t('chat.videoUnsupported'));
      const original = new File(asset.uri);
      if (!original.exists || original.size <= 0) throw new Error(t('chat.standaloneVideoUnavailable'));
      if (original.size > 200 * 1024 * 1024) throw new Error(t('chat.videoTooLarge'));
      const folder = new Directory(Paths.cache, 'chat-videos');
      folder.create({ intermediates: true, idempotent: true });
      const clientId = createUUID();
      copied = new File(folder, `${clientId}.${type === 'video/mp4' ? 'mp4' : 'mov'}`);
      await original.copy(copied);
      if (!owned(version)) return;
      // Use the existing native decoder to reject non-video/invalid sources.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getVideoMetaData } = require('react-native-compressor') as typeof import('react-native-compressor');
      const metadata = await getVideoMetaData(copied.uri);
      if (!owned(version)) return;
      if (!Number.isFinite(metadata.duration) || metadata.duration <= 0 || metadata.width <= 0 || metadata.height <= 0) throw new Error(t('chat.standaloneVideoUnavailable'));
      const video: ChatVideoDraft = { ownerId, coachId, conversationId, clientId, uri: copied.uri, contentType: type, sizeBytes: copied.size,
        durationSeconds: metadata.duration, width: metadata.width, height: metadata.height };
      discardPreview();
      retained.current = video; setPreview(video); copied = undefined;
    } catch (cause) { if (owned(version)) setError(cause instanceof Error && (['chat.videoUnsupported', 'chat.videoTooLarge', 'chat.standaloneVideoUnavailable'] as const).some(key => t(key) === cause.message) ? cause.message : t('chat.videoPreparationFailed')); }
    finally { if (copied) removeFile(copied.uri); busy.current = false; if (owned(version)) setPreparing(false); }
  }
  function sendPreview() {
    const video = retained.current;
    if (!video || busy.current) return;
    retained.current = null; setPreview(null);
    void chatVideoOutbox.enqueue(video);
  }
  return { items: items.filter(item => item.draft.ownerId === ownerId && item.draft.conversationId === conversationId), preview, preparing, error, pick, discardPreview, sendPreview };
}
