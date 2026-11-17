import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useSessionStore } from '@/api/session';
import { t } from '@/i18n';
import { chatVideoOutbox, useChatVideos } from '../chat-videos';
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
const mockDelete = jest.fn();
const mockCopy = jest.fn<() => Promise<void>>();
const mockMetadata = jest.fn<() => Promise<{duration: number; width: number; height: number}>>();
let mockSize = 100;
jest.mock('expo-file-system', () => ({ File: class {
  uri: string; exists = true; size = mockSize;
  constructor(input: unknown, filename?: string) { this.uri = filename ? `file:///cache/${filename}` : String(input); }
  delete() { mockDelete(this.uri); } copy() { return mockCopy(); }
}, Directory: class { create() {} }, Paths: { cache: 'file:///cache' } }));
jest.mock('react-native-compressor', () => ({ getVideoMetaData: () => mockMetadata() }));
let renderer: ReactTestRenderer;
let vm: ReturnType<typeof useChatVideos>;
function Probe() { const value = useChatVideos('student', 'coach', 'conversation'); useEffect(() => { vm = value; }, [value]); return null; }
async function mount() { await act(async () => { renderer = create(<Probe />); }); }
beforeEach(() => {
  jest.clearAllMocks(); mockSize = 100;
  mockCopy.mockResolvedValue(); mockMetadata.mockResolvedValue({ duration: 24, width: 1080, height: 1920 });
  useSessionStore.setState({ user: { id: 'student', role: 'coached_student', phone: '', created_at: '' } });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///gallery/original.mp4', mimeType: 'video/mp4', width: 1080, height: 1920 }] });
});
afterEach(() => { act(() => renderer?.unmount()); chatVideoOutbox.setContext(null); useSessionStore.setState({ user: null }); jest.restoreAllMocks(); });
test('single video picker stages a playable owned copy; cancellation removes only that copy and never sends', async () => {
  const enqueue = jest.spyOn(chatVideoOutbox, 'enqueue');
  await mount(); await act(async () => { await vm.pick(); });
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['videos'], allowsMultipleSelection: false, allowsEditing: false }));
  expect(vm.preview).toMatchObject({ durationSeconds: 24, contentType: 'video/mp4', sizeBytes: 100 });
  const uri = vm.preview!.uri;
  await act(async () => vm.discardPreview());
  expect(vm.preview).toBeNull(); expect(mockDelete).toHaveBeenCalledWith(uri);
  expect(mockDelete).not.toHaveBeenCalledWith('file:///gallery/original.mp4'); expect(enqueue).not.toHaveBeenCalled();
});
test('oversized videos are rejected before preparation', async () => {
  mockSize = 200 * 1024 * 1024 + 1;
  await mount(); await act(async () => { await vm.pick(); });
  expect(vm.preview).toBeNull(); expect(vm.error).toBe(t('chat.videoTooLarge'));
});
test('logout during the native picker prevents a late selection from becoming a preview', async () => {
  let finish!: (result: ImagePicker.ImagePickerResult) => void;
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await mount(); let picking!: Promise<void>;
  await act(async () => { picking = vm.pick(); });
  await act(async () => useSessionStore.setState({ user: null }));
  await act(async () => { finish({ canceled: false, assets: [{ uri: 'file:///gallery/original.mp4', mimeType: 'video/mp4', width: 100, height: 200 }] }); await picking; });
  expect(vm.preview).toBeNull();
});

test('native metadata waits until the asynchronous file copy finishes', async () => {
  let finish!: () => void;
  mockCopy.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount(); let picking!: Promise<void>;
  await act(async () => { picking = vm.pick(); await Promise.resolve(); });
  expect(mockMetadata).not.toHaveBeenCalled();
  expect(vm.preview).toBeNull();
  await act(async () => { finish(); await picking; });
  expect(mockMetadata).toHaveBeenCalledTimes(1);
  expect(vm.preview?.durationSeconds).toBe(24);
});

test('logout during a delayed copy removes the late copy without decoding or staging it', async () => {
  let finish!: () => void;
  mockCopy.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await mount(); let picking!: Promise<void>;
  await act(async () => { picking = vm.pick(); await Promise.resolve(); });
  await act(async () => useSessionStore.setState({ user: null }));
  await act(async () => { finish(); await picking; });
  expect(mockMetadata).not.toHaveBeenCalled(); expect(vm.preview).toBeNull();
  expect(mockDelete).toHaveBeenCalledWith(expect.stringContaining('file:///cache/'));
  expect(mockDelete).not.toHaveBeenCalledWith('file:///gallery/original.mp4');
});
