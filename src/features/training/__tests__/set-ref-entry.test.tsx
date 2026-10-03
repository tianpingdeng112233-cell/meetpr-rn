import { afterEach, expect, jest, test } from '@jest/globals';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { SetRefEntryVisibility } from '@/features/chat/set-ref';
import { WorkoutBody } from '../WorkoutBody';
import { day, set } from '@/domain/plan/test-fixtures';
import { synthesizeDrafts } from '../drafts';
import { t } from '@/i18n';
import { SetRefSharePicker } from '@/features/chat/SetRefSharePicker';
import { useSetRefStagingStore } from '@/features/chat/set-ref-staging';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentConversationScreen } from '@/features/chat/StudentConversationScreen';
import { chatRepository } from '@/api/domains/chat';
jest.mock('react-native-compressor', () => ({}));
jest.mock('expo-media-library', () => ({}));
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const cases = [
  [false, false, false, false, false], [false, false, false, true, false],
  [false, false, true, false, false], [false, false, true, true, false],
  [false, true, false, false, false], [false, true, false, true, false],
  [false, true, true, false, false], [false, true, true, true, false],
  [true, false, false, false, false], [true, false, false, true, false],
  [true, false, true, false, false], [true, false, true, true, false],
  [true, true, false, false, false], [true, true, false, true, false],
  [true, true, true, false, false], [true, true, true, true, true],
];
test.each(cases)('entry visibility editable=%s sets=%s coach=%s context=%s => %s', (isEditable, hasAvailableSet, hasActiveCoach, hasSharingContext, expected) => {
  expect(SetRefEntryVisibility.shouldShow({ isEditable, hasAvailableSet, hasActiveCoach, hasSharingContext })).toBe(expected);
});
let renderer: ReactTestRenderer;
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });
test.each([true, false])('hero Ask coach obeys editable=%s', async editable => {
  const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null, sets: [set()] }] });
  await act(async () => { renderer = create(<WorkoutBody exercises={planDay.exercises} drafts={synthesizeDrafts(planDay, [])} editable={editable} recording={false} startLoading={false} onStart={() => {}} suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]} studentId="student" onVideo={() => {}} onRecord={() => {}} onToggleComplete={() => {}} resolveExerciseMetadata={() => null} onAskCoach={() => {}} />); });
  expect(renderer.root.findAllByType(Text).some(node => node.props.children === t('student.askCoach'))).toBe(editable);
});

test('the current-set camera and Log actions deliver the same active draft to their respective callbacks', async () => {
  const nativeModules = jest.requireMock<typeof import('expo-modules-core')>('expo-modules-core');
  const requireNativeModule = nativeModules.requireNativeModule;
  jest.spyOn(nativeModules, 'requireNativeModule').mockImplementation(name => name === 'TrainingVideo'
    ? { hasCamera: async () => true }
    : requireNativeModule(name));
  const planDay = day('day', { exercises: [{ id: 'exercise', plan_day_id: 'day', exercise_id: 'squat', sort_order: 0, is_main_lift: true, notes: null, sets: [set()] }] });
  const drafts = synthesizeDrafts(planDay, []);
  const onVideo = jest.fn();
  const onRecord = jest.fn();
  await act(async () => { renderer = create(<WorkoutBody exercises={planDay.exercises} drafts={drafts} editable recording startLoading={false} onStart={() => {}} suggestionForDraft={() => ({ suggestion: null, reason: null })} historyLogs={[]} studentId="student" onVideo={onVideo} onRecord={onRecord} onToggleComplete={() => {}} resolveExerciseMetadata={() => null} />); });
  const press = (label: string) => act(() => {
    renderer.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label && node.props.onPress)[0].props.onPress();
  });
  press(t('student.todayWorkoutScreen.copy016'));
  expect(onVideo).toHaveBeenCalledWith(drafts[0]);
  expect(onRecord).not.toHaveBeenCalled();
  press(t('student.todayWorkoutScreen.copy015'));
  expect(onRecord).toHaveBeenCalledWith(drafts[0]);
});

// Both hosts render this picker; training supplies the current set, chat leaves selection empty.
test.each(['training', 'chat'] as const)('%s entry writes its question and stages sending in one page', async entry => {
  const id = '10000000-0000-4000-8000-000000000000';
  useSetRefStagingStore.setState({ intents: {} });
  const closed = jest.fn();
  await act(async () => { renderer = create(<SetRefSharePicker conversationId="conversation"
    initialSetLogID={entry === 'training' ? id : undefined} onClose={closed}
    loadCandidates={async () => [{ id, source: { source: 'logged', exerciseName: 'Squat', setNumber: 2, setTotal: 3, weightKg: '50', reps: 5, rpe: '8', dayDate: '2026-10-02', setLogId: id } }]} />); });
  const send = () => renderer.root.findAll(node => node.props.accessibilityLabel === t('chat.sendToCoach') && node.props.onPress)[0];
  expect(send().props.disabled).toBe(entry === 'chat');
  if (entry === 'chat') act(() => renderer.root.findAll(node => node.props.accessibilityRole === 'radio' && node.props.onPress)[0].props.onPress());
  act(() => renderer.root.findByType(TextInput).props.onChangeText('How is my depth?'));
  await act(async () => send().props.onPress());
  expect(closed).toHaveBeenCalledTimes(1);
  expect(useSetRefStagingStore.getState().intents.conversation).toMatchObject({
    body: '[训练分享] Squat 第2组/3 50kg×5 @RPE8 (2026-10-02)\nHow is my depth?', autoSend: true,
  });
});

jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock'));
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), back: jest.fn() }),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@/api/session', () => ({
  ...jest.requireActual<typeof import('@/api/session')>('@/api/session'),
  authenticatedRequest: jest.fn(async () => ({ plans: [], items: [], videos: [], bind_request: null })),
}));
test('arriving in chat sends a picker intent once and retries with the same question and key', async () => {
  const id = '10000000-0000-4000-8000-000000000000';
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const body = '[训练分享] Squat 第1组 50kg×5 @RPE8 (2026-10-02)\nDepth?';
  const setRef = { v: 1 as const, source: 'logged' as const, exerciseName: 'Squat', setNumber: 1, weightKg: '50', reps: 5, rpe: '8', dayDate: '2026-10-02', setLogId: id };
  useSetRefStagingStore.setState({ intents: {} });
  useSetRefStagingStore.getState().stage({ conversationId: id, clientId: 'same-key', setRef, body, video: null, autoSend: true });
  jest.spyOn(chatRepository, 'messages').mockResolvedValue({ messages: [], meta: { has_more: false } });
  const send = jest.spyOn(chatRepository, 'sendSetRef').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ message: {
    id, conversation_id: id, seq: 1, sender_id: '', kind: 'text', body, client_id: 'same-key', created_at: '2026-10-02T09:00:00Z', set_ref: setRef,
  } });
  try {
    await act(async () => { renderer = create(<QueryClientProvider client={client}><StudentConversationScreen conversationId={id} coachName="Coach" /></QueryClientProvider>); });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenLastCalledWith(id, { body, clientID: 'same-key', setRef });
    const retry = renderer.root.findAll(node => node.props.onPress && node.props.disabled === false && node.findAllByType(Text).some(text => text.props.children === t('student.studentBlackGoldChatView.copy026')))[0];
    await act(async () => retry.props.onPress());
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith(id, { body, clientID: 'same-key', setRef });
    expect(useSetRefStagingStore.getState().intents[id]).toBeUndefined();
  } finally { act(() => renderer.unmount()); client.clear(); }
});
