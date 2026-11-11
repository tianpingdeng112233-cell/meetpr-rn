import { createUUID } from '@/analytics/uuid';
import { chatRepository, type ChatMessage } from '@/api/domains/chat';
import { uploadsRepository } from '@/api/domains/uploads';
import { useSessionStore } from '@/api/session';
import AsyncStorage from '@/demo/storage';
import { uploadFileParts } from '@/features/training/video-upload/multipart';
import { VIDEO_PART_SIZE_BYTES } from '@/features/training/video-upload/model';
import { t } from '@/i18n';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { File, Directory, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { z } from 'zod';

const PhotoSchema = z.object({ clientId: z.string(), uri: z.string(), width: z.number(), height: z.number(), attachmentId: z.string().optional() });
export type ChatPhoto = z.infer<typeof PhotoSchema>;
const photoKey = (student: string, conversation: string) => `meetpr.chat-photos.v1.${student}.${conversation}`;
export async function readChatPhotos(student: string, conversation: string): Promise<ChatPhoto[]> {
  const raw = await AsyncStorage.getItem(photoKey(student, conversation));
  return raw ? z.array(PhotoSchema).parse(JSON.parse(raw)) : [];
}
export const writeChatPhotos = (student: string, conversation: string, photos: ChatPhoto[]) => AsyncStorage.setItem(photoKey(student, conversation), JSON.stringify(photos));

export function useChatPhotos(studentId: string, conversationId: string, onSent: (message: ChatMessage) => void) {
  const client = useQueryClient();
  const queryKey = ['chat-photos', studentId, conversationId] as const;
  const photos = useQuery({ queryKey, queryFn: () => readChatPhotos(studentId, conversationId) });
  const writes = useRef(Promise.resolve());
  const update = (change: (items: ChatPhoto[]) => ChatPhoto[]) => {
    const next = writes.current.then(async () => {
      const items = change(await readChatPhotos(studentId, conversationId));
      await writeChatPhotos(studentId, conversationId, items);
      client.setQueryData(queryKey, items);
    });
    writes.current = next.catch(() => {});
    return next;
  };
  const [preview, setPreview] = useState<ChatPhoto | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const busy = useRef(false);
  const [failed, setFailed] = useState(false);
  const activeUpload = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = useSessionStore.subscribe(state => {
      if (state.user?.id !== studentId) activeUpload.current?.abort();
    });
    return () => { mounted.current = false; activeUpload.current?.abort(); unsubscribe(); };
  }, [studentId]);
  const owned = () => mounted.current && useSessionStore.getState().user?.id === studentId;
  async function takePhoto() {
    if (busy.current || !owned()) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!owned() || busy.current) return;
      if (!permission.granted) {
        Alert.alert(t('student.coachTab.cameraTitle'), t('student.coachTab.cameraPermission'), [
          { text: t('designSystem.action.cancel'), style: 'cancel' },
          { text: t('student.coachTab.settings'), onPress: () => { void Linking.openSettings(); } },
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !owned() || busy.current) return;
      const asset = result.assets[0];
      // Use the already-installed native compressor; retain a durable copy before sending.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Image } = require('react-native-compressor') as typeof import('react-native-compressor');
      const compressed = await Image.compress(asset.uri, { maxWidth: 1600, maxHeight: 1600, quality: 0.8, output: 'jpg' });
      if (!owned() || busy.current) return;
      const id = createUUID();
      const folder = new Directory(Paths.document, 'chat-images', studentId);
      folder.create({ intermediates: true, idempotent: true });
      const file = new File(folder, `${id}.jpg`);
      new File(compressed).copy(file);
      if (preview) { try { new File(preview.uri).delete(); } catch {} }
      setPreview({ clientId: id, uri: file.uri, width: asset.width, height: asset.height });
      setFailed(false);
    } catch { setFailed(true); }
  }
  function discardPreview() {
    if (busy.current) return;
    if (preview) { try { new File(preview.uri).delete(); } catch {} }
    setPreview(null); setFailed(false);
  }
  async function send(photo: ChatPhoto) {
    if (busy.current || !owned()) return;
    busy.current = true; setSending(photo.clientId); setFailed(false);
    const controller = new AbortController();
    activeUpload.current = controller;
    const canContinue = () => owned() && !controller.signal.aborted;
    try {
      // Persist before the first network request; retries reuse the same client id.
      await update(items => [...items.filter(item => item.clientId !== photo.clientId), photo]);
      if (!canContinue()) return;
      setPreview(null);
      let attachmentId = photo.attachmentId;
      if (!attachmentId) {
        const file = new File(photo.uri);
        const upload = await uploadsRepository.initiate({ kind: 'chat_image', content_type: 'image/jpeg', size_bytes: file.size, part_count: Math.ceil(file.size / VIDEO_PART_SIZE_BYTES), filename: 'photo.jpg' });
        if (!canContinue()) return;
        const parts = await uploadFileParts(photo.uri, upload.part_urls, { signal: controller.signal, onProgress: () => {} });
        if (!canContinue()) return;
        await uploadsRepository.complete(upload.attachment_id, { parts });
        if (!canContinue()) return;
        attachmentId = upload.attachment_id;
        photo = { ...photo, attachmentId };
        await update(items => items.map(item => item.clientId === photo.clientId ? photo : item));
      }
      if (!canContinue()) return;
      const { message } = await chatRepository.sendImage(conversationId, attachmentId, photo.clientId);
      if (!canContinue()) return;
      await update(items => items.filter(item => item.clientId !== photo.clientId));
      try { new File(photo.uri).delete(); } catch {}
      if (owned()) onSent(message);
    } catch { setFailed(true); }
    finally { activeUpload.current = null; busy.current = false; setSending(null); }
  }
  return { photos: photos.data ?? [], preview, sending, failed: failed || photos.isError, takePhoto, discardPreview, send };
}
