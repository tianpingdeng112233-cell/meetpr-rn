import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { plansRepository } from '@/api/domains/plans';
import { setsRepository } from '@/api/domains/sets';
import { exercisesRepository } from '@/api/domains/exercises';
import { day, plan } from '@/domain/plan/test-fixtures';
import { gymDayText } from '@/features/training/policy';
import { useVideoUploadStore } from '@/features/training/video-upload/store';
import { EMPTY_VIDEO_UPLOAD } from '@/features/training/video-upload/model';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Modal, Switch, Text } from 'react-native';
import { setLocaleOverride, t } from '@/i18n';
import { SetRefSharePicker, loadTodaySetRefCandidates } from '../SetRefSharePicker';
import { useSetRefStagingStore } from '../set-ref-staging';
import type { SetRefCandidate } from '../set-ref';
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@/analytics/uuid', () => ({ createUUID: () => '20000000-0000-4000-8000-000000000000' }));
const id = '10000000-0000-4000-8000-000000000000';
const candidate: SetRefCandidate = { id, source: { source: 'logged', exerciseName: 'Squat', setNumber: 1, weightKg: '100.00', reps: 5, rpe: '8.0', dayDate: '2026-09-05', setLogId: id } };
let renderer: ReactTestRenderer;
const onClose = jest.fn(); const onStaged = jest.fn();
const copy = () => renderer.root.findAllByType(Text).map(node => node.props.children);
const press = async (key: 'chat.continueSelection' | 'chat.continueToChat' | 'chat.back') => {
  await act(async () => { await renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t(key)).props.onPress(); });
};
async function mount(loadCandidates: () => Promise<SetRefCandidate[]>) {
  await act(async () => { renderer = create(<SetRefSharePicker conversationId={id} loadCandidates={loadCandidates} onClose={onClose} onStaged={onStaged} />); });
}
beforeEach(() => { setLocaleOverride('en'); useSetRefStagingStore.setState({ intents: {} }); jest.clearAllMocks(); });
afterEach(() => { act(() => renderer?.unmount()); setLocaleOverride(null); jest.restoreAllMocks(); });
test('empty picker and Android back', async () => {
  await mount(async () => []);
  expect(copy()).toContain(t('chat.noShareableSets'));
  expect(copy()).toContain(t('chat.noShareableSetsDescription'));
  act(() => renderer.root.findByType(Modal).props.onRequestClose());
  expect(onClose).toHaveBeenCalled();
});
test('load failure uses the localized unavailable state', async () => {
  await mount(async () => { throw new Error('offline'); });
  expect(copy()).toContain(t('chat.trainingLoadFailed'));
});
test('selection, back, confirmation stage a normalized snapshot with a fixed client id', async () => {
  await mount(async () => [candidate]);
  await press('chat.continueSelection');
  expect(copy()).toContain(t('chat.sendCurrentSetRecord'));
  await press('chat.back'); expect(copy()).toContain(t('chat.completedSection'));
  await press('chat.continueSelection'); await press('chat.continueToChat');
  expect(useSetRefStagingStore.getState().intents[id]).toMatchObject({ conversationId: id, clientId: '20000000-0000-4000-8000-000000000000', setRef: { weightKg: '100', rpe: '8' }, body: '[训练分享] Squat 第1组 100kg×5 @RPE8 (2026-09-05)', video: null });
  expect(onStaged).toHaveBeenCalled(); expect(onClose).toHaveBeenCalled();
});
test.each(['uploading', 'failed'] as const)('%s video default and disabled state', async state => {
  await mount(async () => [{ ...candidate, video: state === 'failed' ? { state } : { state, attachmentId: null, recordKey: 'student:set', createdAt: 1 } }]);
  await press('chat.continueSelection');
  expect(renderer.root.findByType(Switch).props.value).toBe(state === 'uploading');
  expect(renderer.root.findByType(Switch).props.disabled).toBe(state === 'failed');
});

test('confirmation resolves an upload that completed while selecting and ignores a double confirm', async () => {
  const recordKey = 'student:set';
  const video = { state: 'uploading' as const, attachmentId: null, recordKey, createdAt: 10 };
  await mount(async () => [{ ...candidate, video }]);
  await press('chat.continueSelection');
  useVideoUploadStore.setState({ records: { [recordKey]: { ...EMPTY_VIDEO_UPLOAD, status: 'uploaded', createdAt: 10, attachmentId: id } } });
  const confirm = renderer.root.find(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === t('chat.continueToChat')).props.onPress;
  await act(async () => { confirm(); confirm(); });
  expect(useSetRefStagingStore.getState().intents[id]?.video).toEqual({ state: 'ready', videoId: id });
  expect(onStaged).toHaveBeenCalledTimes(1);
});

test('today source keeps logs even when their exercise has no remaining prescriptions', async () => {
  const exercise = { id, exercise_id: id, plan_day_id: id, sort_order: 0, is_main_lift: true, notes: null, sets: [] };
  const current = plan([day(id, { exercises: [exercise] })]);
  jest.spyOn(plansRepository, 'list').mockResolvedValue({ plans: [current] });
  jest.spyOn(plansRepository, 'detail').mockResolvedValue(current);
  jest.spyOn(setsRepository, 'range').mockResolvedValue({ logs: [{ id, student_id: id, exercise_id: id, plan_exercise_id: id, set_index: 2, weight_kg: '100.00', reps: 5, rpe: null, logged_at: new Date().toISOString(), logged_date: gymDayText(new Date()), completed: true, failed: false, assumed: false, adhoc: false }] });
  jest.spyOn(exercisesRepository, 'list').mockResolvedValue({ exercises: [] });
  expect(await loadTodaySetRefCandidates(id)).toEqual([expect.objectContaining({ id, source: expect.objectContaining({ source: 'logged', setNumber: 3, setTotal: null }) })]);
});
