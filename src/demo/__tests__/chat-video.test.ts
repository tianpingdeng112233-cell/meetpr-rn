import { beforeEach, expect, jest, test } from '@jest/globals';
import { demoVideoUrl, resetDemoUploads, uploadDemoParts, uploadRoute } from '../uploads';
const mockFiles = new Set(['file:///source.mp4']);
const mockCopyGate = jest.fn<() => Promise<void>>();
beforeEach(() => { resetDemoUploads(); mockFiles.clear(); mockFiles.add('file:///source.mp4'); mockCopyGate.mockResolvedValue(); });
jest.mock('expo-file-system', () => ({
  File: class { uri: string; constructor(base: { uri: string } | string, name?: string) { this.uri = name ? `${typeof base === 'string' ? base : base.uri}/${name}` : String(base); } get exists() { return mockFiles.has(this.uri); } async copy(to: { uri: string }) { mockFiles.add(to.uri); await mockCopyGate(); } delete() { mockFiles.delete(this.uri); } },
  Directory: class { uri: string; constructor(base: string, name: string) { this.uri = `${base}/${name}`; } create() {} }, Paths: { cache: 'file:///cache' },
}));
test('demo remote video survives outbox source cleanup and reset removes its separate copy', async () => {
  uploadRoute('/uploads/initiate', 'POST', { kind: 'chat_video', content_type: 'video/mp4', size_bytes: 100, part_count: 1 }, 'student', 'coach', () => 'attachment');
  await uploadDemoParts('file:///source.mp4', [{ part_number: 1, url: 'demo://upload/attachment/1' }], { signal: new AbortController().signal, onProgress: () => {} });
  uploadRoute('/uploads/attachment/complete', 'POST', {}, 'student', 'coach', () => 'unused');
  mockFiles.delete('file:///source.mp4');
  const url = demoVideoUrl('attachment')!;
  expect(mockFiles.has(url)).toBe(true);
  expect(url).not.toBe('file:///source.mp4');
  resetDemoUploads(); expect(mockFiles.has(url)).toBe(false);
});

test('demo upload cannot complete before its separate file copy is ready', async () => {
  let finish!: () => void;
  mockCopyGate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  uploadRoute('/uploads/initiate', 'POST', { kind: 'chat_video', content_type: 'video/mp4', size_bytes: 100, part_count: 1 }, 'student', 'coach', () => 'attachment');
  let completed = false;
  const uploading = uploadDemoParts('file:///source.mp4', [{ part_number: 1, url: 'demo://upload/attachment/1' }], { signal: new AbortController().signal, onProgress: () => {} }).then(() => { completed = true; });
  await Promise.resolve(); await Promise.resolve();
  expect(completed).toBe(false);
  finish(); await uploading;
  uploadRoute('/uploads/attachment/complete', 'POST', {}, 'student', 'coach', () => 'unused');
  expect(mockFiles.has(demoVideoUrl('attachment')!)).toBe(true);
});

test('a partially written demo copy is removed when copying fails', async () => {
  mockCopyGate.mockRejectedValueOnce(new Error('Partial copy'));
  uploadRoute('/uploads/initiate', 'POST', { kind: 'chat_video', content_type: 'video/mp4', size_bytes: 100, part_count: 1 }, 'student', 'coach', () => 'attachment');
  await expect(uploadDemoParts('file:///source.mp4', [{ part_number: 1, url: 'demo://upload/attachment/1' }], { signal: new AbortController().signal, onProgress: () => {} })).rejects.toThrow('Partial copy');
  expect([...mockFiles].filter(uri => uri.includes('demo-chat-videos'))).toEqual([]);
});
test('reset during copying removes the late target and cancels the old upload', async () => {
  let finish!: () => void;
  mockCopyGate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  uploadRoute('/uploads/initiate', 'POST', { kind: 'chat_video', content_type: 'video/mp4', size_bytes: 100, part_count: 1 }, 'student', 'coach', () => 'attachment');
  const uploading = uploadDemoParts('file:///source.mp4', [{ part_number: 1, url: 'demo://upload/attachment/1' }], { signal: new AbortController().signal, onProgress: () => {} });
  await Promise.resolve(); resetDemoUploads(); finish();
  await expect(uploading).rejects.toThrow();
  expect([...mockFiles].filter(uri => uri.includes('demo-chat-videos'))).toEqual([]);
});

test('a late old copy cannot delete a new upload reusing the reset demo id', async () => {
  let finish!: () => void;
  mockCopyGate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const initiate = () => uploadRoute('/uploads/initiate', 'POST', { kind: 'chat_video', content_type: 'video/mp4', size_bytes: 100, part_count: 1 }, 'student', 'coach', () => 'attachment');
  const copy = () => uploadDemoParts('file:///source.mp4', [{ part_number: 1, url: 'demo://upload/attachment/1' }], { signal: new AbortController().signal, onProgress: () => {} });
  initiate(); const old = copy(); await Promise.resolve();
  resetDemoUploads(); initiate(); await copy();
  uploadRoute('/uploads/attachment/complete', 'POST', {}, 'student', 'coach', () => 'unused');
  const currentUri = demoVideoUrl('attachment')!;
  finish(); await expect(old).rejects.toThrow();
  expect(mockFiles.has(currentUri)).toBe(true);
});
