import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, Modal } from 'react-native';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { SetEntrySheet } from '../SetEntrySheet';

jest.mock('expo-media-library', () => ({}));
jest.mock('react-native-compressor', () => ({}));
jest.mock('react-native-video', () => 'Video');
jest.mock('../video-upload/use-camera-availability', () => ({ useCameraAvailability: () => true }));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null, sets: [set()] }] });
let renderer: ReactTestRenderer;
beforeEach(async () => { await AsyncStorage.clear(); jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });

test('first Record entry waits for the native sheet to show before prompting and prompts only once', async () => {
  await act(async () => { renderer = create(<SetEntrySheet studentId="student" initialCamera draft={synthesizeDrafts(planDay, [])[0]} collarOn={false} editable exerciseName="Squat" suggestion={null} suggestionReason={null} ensureSetLog={async () => 'log'} onChangeCollar={() => {}} onClose={() => {}} onSave={async () => {}} />); });
  expect(Alert.alert).not.toHaveBeenCalled();
  await act(async () => { renderer.root.findByType(Modal).props.onShow(); });
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  await act(async () => { renderer.root.findByType(Modal).props.onShow(); });
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});
