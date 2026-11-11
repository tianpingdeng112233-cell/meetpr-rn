import { beforeEach, expect, jest, test } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';
import { resetSessionForTests } from '../../session';
import { chatRepository } from '../chat';
import { UploadInitiateRequestSchema } from '../uploads';
jest.mock('expo-secure-store');
const id = '10000000-0000-4000-8000-000000000000';
beforeEach(() => { resetSessionForTests(); jest.mocked(SecureStore.getItemAsync).mockResolvedValue('access-token'); });
test('sends a photo attachment as an image message with a stable retry client id', async () => {
  const message = { id, conversation_id: id, seq: 1, sender_id: id, kind: 'image', attachment_id: id, client_id: 'retry-id', created_at: '2026-11-10T00:00:00Z' };
  globalThis.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ message }) })) as unknown as typeof fetch;
  await expect(chatRepository.sendImage(id, id, 'retry-id')).resolves.toEqual({ message });
  expect(JSON.parse(jest.mocked(fetch).mock.calls[0][1]?.body as string)).toEqual({ kind: 'image', attachment_id: id, client_id: 'retry-id' });
  expect(UploadInitiateRequestSchema.safeParse({ kind: 'chat_image', content_type: 'image/jpeg', size_bytes: 100000, part_count: 1 }).success).toBe(true);
  expect(UploadInitiateRequestSchema.safeParse({ kind: 'chat_image', content_type: 'video/mp4', size_bytes: 100000, part_count: 1 }).success).toBe(false);
});
