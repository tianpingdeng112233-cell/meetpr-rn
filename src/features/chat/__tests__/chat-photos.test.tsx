import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import { useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatRepository, type ChatMessage } from '@/api/domains/chat';
import { useSessionStore } from '@/api/session';
import { readChatPhotos, useChatPhotos, writeChatPhotos } from '../chat-photos';
import { t } from '@/i18n';
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn() }));
const mockDelete = jest.fn();
jest.mock('expo-file-system', () => ({ File: class { uri = 'file:///documents/photo.jpg'; size = 100; delete = mockDelete; copy() {} }, Directory: class { create() {} }, Paths: { document: 'file:///documents' } }));
jest.mock('react-native-compressor', () => ({ Image: { compress: async () => 'file:///compressed.jpg' } }));
let renderer: ReactTestRenderer;
let client: QueryClient;
let vm: ReturnType<typeof useChatPhotos>;
const sent = jest.fn();
const photo = { clientId: 'retry-id', uri: 'file:///documents/photo.jpg', width: 100, height: 150, attachmentId: 'attachment' };
function Probe() {
  const value = useChatPhotos('student', 'conversation', sent);
  useEffect(() => { vm = value; }, [value]);
  return null;
}
async function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Probe /></QueryClientProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
}
beforeEach(async () => {
  await AsyncStorage.clear(); sent.mockClear(); mockDelete.mockClear();
  useSessionStore.setState({ user: { id: 'student', role: 'coached_student', phone: '', created_at: '' } });
});
afterEach(() => { act(() => renderer?.unmount()); client?.clear(); jest.restoreAllMocks(); useSessionStore.setState({ user: null }); });
test('failed image survives remount and retries the same attachment and client id before deleting its file', async () => {
  const message = { id: 'message', client_id: photo.clientId } as ChatMessage;
  const send = jest.spyOn(chatRepository, 'sendImage').mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ message });
  await mount();
  await act(async () => { await vm.send(photo); });
  expect(await readChatPhotos('student', 'conversation')).toEqual([photo]);
  expect(mockDelete).not.toHaveBeenCalled();
  act(() => renderer.unmount()); client.clear(); await mount();
  expect(vm.photos).toEqual([photo]);
  await act(async () => { await vm.send(vm.photos[0]); });
  expect(send.mock.calls).toEqual([['conversation', 'attachment', 'retry-id'], ['conversation', 'attachment', 'retry-id']]);
  expect(await readChatPhotos('student', 'conversation')).toEqual([]);
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(sent).toHaveBeenCalledWith(message);
});
test('camera denial offers system settings without opening the camera', async () => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: false } as ImagePicker.CameraPermissionResponse);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await mount(); await act(async () => { await vm.takePhoto(); });
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][2]?.map(button => button.text)).toContain(t('student.coachTab.settings'));
});
test('pending photos belong to the account and cannot send after account switching', async () => {
  await writeChatPhotos('student', 'conversation', [photo]);
  expect(await readChatPhotos('other', 'conversation')).toEqual([]);
  const send = jest.spyOn(chatRepository, 'sendImage');
  await mount();
  useSessionStore.setState({ user: { id: 'other', role: 'coached_student', phone: '', created_at: '' } });
  await act(async () => { await vm.send(photo); });
  expect(send).not.toHaveBeenCalled();
  expect(await readChatPhotos('student', 'conversation')).toEqual([photo]);
});

test('switching accounts while persisting a photo blocks the subsequent upload initiation', async () => {
  const { uploadsRepository } = jest.requireActual<typeof import('@/api/domains/uploads')>('@/api/domains/uploads');
  const initiate = jest.spyOn(uploadsRepository, 'initiate').mockRejectedValue(new Error('Must not start'));
  const original = AsyncStorage.setItem;
  let release!: () => void;
  jest.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(async (key, value) => {
    await new Promise<void>(resolve => { release = resolve; });
    return original(key, value);
  });
  await mount();
  let sending!: Promise<void>;
  await act(async () => { sending = vm.send({ ...photo, attachmentId: undefined }); });
  useSessionStore.setState({ user: { id: 'other', role: 'coached_student', phone: '', created_at: '' } });
  await act(async () => { release(); await sending; });
  expect(initiate).not.toHaveBeenCalled();
  expect(await readChatPhotos('student', 'conversation')).toHaveLength(1);
});

test('cancel and retake cannot destroy a photo while its send is being persisted', async () => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: true } as ImagePicker.CameraPermissionResponse);
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///camera.jpg', width: 100, height: 150 }] });
  const { uploadsRepository } = jest.requireActual<typeof import('@/api/domains/uploads')>('@/api/domains/uploads');
  jest.spyOn(uploadsRepository, 'initiate').mockRejectedValue(new Error('Offline'));
  await mount();
  await act(async () => { await vm.takePhoto(); });
  const original = AsyncStorage.setItem;
  let release!: () => void;
  jest.spyOn(AsyncStorage, 'setItem').mockImplementationOnce(async (key, value) => {
    await new Promise<void>(resolve => { release = resolve; });
    return original(key, value);
  });
  let sending!: Promise<void>;
  await act(async () => { sending = vm.send(vm.preview!); });
  await act(async () => { vm.discardPreview(); await vm.takePhoto(); });
  expect(mockDelete).not.toHaveBeenCalled();
  await act(async () => { release(); await sending; });
  expect(await readChatPhotos('student', 'conversation')).toHaveLength(1);
});
