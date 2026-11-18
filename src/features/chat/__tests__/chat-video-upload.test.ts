import { expect, jest, test } from '@jest/globals';
import { createChatVideoTransfer } from '../chat-video-upload';
import type { ChatVideoDraft } from '../chat-video-outbox';
const draft: ChatVideoDraft = { clientId: 'stable', ownerId: 'student', coachId: 'coach', conversationId: 'conversation', uri: 'file:///video.mp4', sizeBytes: 100, contentType: 'video/mp4', durationSeconds: 24, width: 100, height: 200 };
test('a message failure removes the completed orphan and keeps the local video for retry', async () => {
  const remove = jest.fn<() => Promise<void>>().mockResolvedValue();
  const send = createChatVideoTransfer({
    initiate: async () => ({ attachment_id: 'attachment', upload_id: 'upload', part_urls: [{ part_number: 1, url: 'https://upload.invalid' }] }),
    upload: async (_draft, _parts, _signal, progress) => { progress(1); return [{ part_number: 1, etag: 'etag' }]; },
    complete: async () => {}, post: async () => { throw new Error('Offline'); },
    abort: async () => {}, remove,
  });
  await expect(send(draft, new AbortController().signal, () => {})).rejects.toThrow('Offline');
  expect(remove).toHaveBeenCalledWith('attachment');
});

test('logout during initiate aborts the late upload without transferring or posting', async () => {
  const controller = new AbortController();
  const upload = jest.fn<() => Promise<[]>>().mockResolvedValue([]);
  const abort = jest.fn<() => Promise<void>>().mockResolvedValue();
  const post = jest.fn<() => Promise<never>>();
  const send = createChatVideoTransfer({
    initiate: async () => { controller.abort(); return { attachment_id: 'late', upload_id: 'upload', part_urls: [] }; },
    upload, complete: async () => {}, post, abort, remove: async () => {},
  });
  await expect(send(draft, controller.signal, () => {})).rejects.toThrow('cancelled');
  expect(abort).toHaveBeenCalledWith('late');
  expect(upload).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
});

test('an idempotent replay cleans only the newly uploaded duplicate attachment', async () => {
  const remove = jest.fn<() => Promise<void>>().mockResolvedValue();
  const send = createChatVideoTransfer({
    initiate: async () => ({ attachment_id: 'new-upload', upload_id: 'upload', part_urls: [] }),
    upload: async () => [], complete: async () => {},
    post: async () => ({ id: 'original-message', video_id: 'original-upload' } as import('@/api/domains/chat').ChatMessage),
    abort: async () => {}, remove,
  });
  const message = await send(draft, new AbortController().signal, () => {});
  expect(message.id).toBe('original-message'); expect(remove).toHaveBeenCalledWith('new-upload');
});
