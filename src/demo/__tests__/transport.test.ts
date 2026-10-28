import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadFileParts } from '@/features/training/video-upload/multipart';
import { uploadsRepository } from '@/api/domains/uploads';
import { videoMarkersRepository } from '@/api/domains/video-markers';
import * as SecureStore from 'expo-secure-store';
import { apiRequest, ApiError } from '@/api/client';
import { emailLogin, requestPasswordReset, resetPassword, refreshRequest, emailRegister } from '@/api/auth';
import { accountRepository } from '@/api/domains/account';
import { resetSessionForTests, useSessionStore } from '@/api/session';
import { plansRepository } from '@/api/domains/plans';
import { setsRepository } from '@/api/domains/sets';
import { onboardingRepository } from '@/api/domains/onboarding';
import { exercisesRepository } from '@/api/domains/exercises';
import { bindRepository } from '@/api/domains/bind';
import { feedbackRepository } from '@/api/domains/feedback';
import { chatRepository } from '@/api/domains/chat';
import { readinessRepository } from '@/api/domains/readiness';
import { videosRepository } from '@/api/domains/videos';
import { resetDemoBackend } from '../backend';
import { gymDayToday } from '@/domain/plan/workout-date-policy';
import { ChatSetCardPresentation } from '@/features/chat/set-ref';

jest.mock('expo-secure-store');
jest.mock('expo-file-system/legacy', () => ({ createUploadTask: jest.fn() }));
const originalFetch = global.fetch;
const originalFlag = process.env.EXPO_PUBLIC_DEMO_MODE;
const storage = new Map<string, string>();
beforeEach(() => {
  process.env.EXPO_PUBLIC_DEMO_MODE = '1';
  storage.clear();
  resetDemoBackend();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async key => storage.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => { storage.set(key, value); });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async key => { storage.delete(key); });
  resetSessionForTests();
  global.fetch = jest.fn<typeof fetch>().mockRejectedValue(new Error('Network forbidden'));
});
afterEach(() => {
  global.fetch = originalFetch;
  if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_DEMO_MODE; else process.env.EXPO_PUBLIC_DEMO_MODE = originalFlag;
});

test('S1: existing student readers validate demo DTOs without fetch; unknown routes retain ApiError 404', async () => {
  const { user } = await emailLogin({ email: 'any@example.test', password: '' });
  await useSessionStore.getState().loginWithEmail({ email: 'any@example.test', password: '' });
  const { plans } = await plansRepository.list(user.id);
  const plan = await plansRepository.detail(plans[0].id);
  expect(plan.days).toHaveLength(24);
  expect((await setsRepository.range(user.id, { from: plan.start_date, to: plan.end_date })).logs.length).toBeGreaterThan(0);
  expect((await onboardingRepository.get(user.id))?.weight_kg).toBe('83.5');
  expect((await exercisesRepository.list()).exercises).toHaveLength(12);
  expect((await bindRepository.mine()).bind_request?.status).toBe('accepted');
  expect((await feedbackRepository.list(user.id)).items).toHaveLength(3);
  const { conversations } = await chatRepository.list();
  const { messages } = await chatRepository.messages(conversations[0].id);
  expect(messages).toHaveLength(5);
  expect(messages.find(message => message.set_ref)?.set_ref?.source).toBe('planned');
  expect((await readinessRepository.get(user.id, gymDayToday())).checkin).toBeNull();
  expect((await videosRepository.list(user.id)).videos).toEqual([]);
  await expect(apiRequest('/not-implemented')).rejects.toMatchObject({ status: 404 });
  await expect(apiRequest('/not-implemented')).rejects.toBeInstanceOf(ApiError);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('rework 1: the student shares today’s planned squat as a training card through the message reader', async () => {
  await useSessionStore.getState().bootstrap();
  const student = useSessionStore.getState().user!.id;
  const { conversations } = await chatRepository.list();
  const { messages } = await chatRepository.messages(conversations[0].id);
  const shared = messages.find(message => message.set_ref)!;
  const plan = await plansRepository.detail((await plansRepository.list(student)).plans[0].id);
  const today = plan.days.find(day => !day.completed_at)!;
  const set = today.exercises[0].sets[0];

  expect(ChatSetCardPresentation(shared)).toEqual({
    setRef: expect.objectContaining({
      source: 'planned', exerciseName: 'Squat', planSetId: set.id, setLogId: null,
      dayDate: gymDayToday(), setNumber: 1, setTotal: 3, weightKg: set.target_weight, reps: set.target_reps,
    }),
    note: 'Should I keep this weight for today’s squat?',
  });
  expect(shared.sender_id).toBe(student);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('S3: set writes, undo, day completion and profile edits read back through the real repositories', async () => {
  const user = await useSessionStore.getState().loginWithEmail({ email: 'any@example.test', password: '' });
  const { plans } = await plansRepository.list(user.id);
  const plan = await plansRepository.detail(plans[0].id);
  const today = gymDayToday();
  const day = plan.days.find(day => !day.completed_at)!;
  const input = { plan_exercise_id: day.exercises[0].id, set_index: 0, weight_kg: '152.5', reps: 5, rpe: '8', completed: true, logged_date: today };
  const saved = await setsRepository.upsert(input);
  const range = { from: plan.start_date, to: plan.end_date };
  expect((await setsRepository.range(user.id, range)).logs.find(log => log.id === saved.id)).toMatchObject(input);
  await setsRepository.upsert({ ...input, completed: false });
  const undone = (await setsRepository.range(user.id, range)).logs.filter(log => log.id === saved.id);
  expect(undone).toHaveLength(1);
  expect(undone[0].completed).toBe(false);
  await plansRepository.completeDay(day.id);
  expect((await plansRepository.detail(plan.id)).days.find(row => row.id === day.id)?.completed_at).toBeTruthy();
  await plansRepository.undoDayCompletion(day.id);
  expect((await plansRepository.detail(plan.id)).days.find(row => row.id === day.id)?.completed_at).toBeNull();
  const profile = { weight_kg: '84.25', competition_date: plan.end_date, target_weight_class: 'IPF · 93 kg', note_to_coach: 'Feeling ready.' };
  await onboardingRepository.upsert(profile);
  expect(await onboardingRepository.get(user.id)).toMatchObject(profile);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('S4: empty token storage cold-starts as the demo student; logout stays anonymous until login', async () => {
  await useSessionStore.getState().bootstrap();
  expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', bootstrapped: true, user: { name: 'Alex Chen', role: 'coached_student' } });
  await useSessionStore.getState().logout();
  await useSessionStore.getState().bootstrap();
  expect(useSessionStore.getState().status).toBe('anonymous');
  await useSessionStore.getState().loginWithEmail({ email: 'anything@example.test', password: 'anything' });
  expect(useSessionStore.getState().user?.name).toBe('Alex Chen');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('S1/S3: chat, feedback and readiness mutations survive their existing readers', async () => {
  await useSessionStore.getState().bootstrap();
  const student = useSessionStore.getState().user!.id;
  const binding = (await bindRepository.mine()).bind_request!;
  const { conversation } = await chatRepository.open(binding.coach_id);
  const sent = await chatRepository.send(conversation.id, 'Session felt good.', 'local-message-1');
  expect((await chatRepository.messages(conversation.id, { since_seq: 5 })).messages).toEqual([sent.message]);
  expect((await chatRepository.send(conversation.id, 'Session felt good.', 'local-message-1')).message.id).toBe(sent.message.id);
  const read = await chatRepository.read(conversation.id, sent.message.id);
  expect(read.unread_count).toBe(0);
  expect((await chatRepository.list()).conversations[0]).toMatchObject({ unread_count: 0, my_last_read: { seq: 6 }, last_message: { preview: 'Session felt good.' } });
  const feedback = (await feedbackRepository.list(student)).items.find(item => !item.read_at)!;
  await feedbackRepository.markRead(feedback.id);
  expect((await feedbackRepository.list(student)).items.find(item => item.id === feedback.id)?.read_at).toBeTruthy();
  const input = { checkin_date: gymDayToday(), sleep_quality: 4, mood: 3, stress: 2, muscle_fatigue: [{ muscle_group: 'quad' as const, severity: 2 }] };
  await readinessRepository.submit(input);
  expect((await readinessRepository.get(student, input.checkin_date)).checkin).toMatchObject(input);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('S1/S3: uploaded video returns its local URI, appears in videos and supports markers without native upload', async () => {
  await useSessionStore.getState().bootstrap();
  const student = useSessionStore.getState().user!.id;
  const plan = await plansRepository.detail((await plansRepository.list(student)).plans[0].id);
  const exercise = plan.days.find(day => !day.completed_at)!.exercises[0];
  const log = await setsRepository.upsert({ plan_exercise_id: exercise.id, set_index: 0, weight_kg: '145', reps: 5, completed: true });
  const session = await uploadsRepository.initiate({ kind: 'set_video', content_type: 'video/mp4', size_bytes: 100, part_count: 1, set_log_id: log.id });
  const nativeUpload = jest.spyOn(FileSystem, 'createUploadTask');
  const onProgress = jest.fn();
  const onPart = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const uri = 'file:///demo-local-recording.mp4';
  const parts = await uploadFileParts(uri, session.part_urls, { signal: new AbortController().signal, onProgress, onPart });
  expect(parts[0].etag).toBeTruthy();
  expect(onProgress).toHaveBeenLastCalledWith(1);
  expect(onPart).toHaveBeenCalledWith(parts[0]);
  expect((await uploadsRepository.complete(session.attachment_id, { parts })).status).toBe('ready');
  expect((await uploadsRepository.url(session.attachment_id)).url).toBe(uri);
  expect((await videosRepository.list(student)).videos).toEqual([expect.objectContaining({ id: session.attachment_id, set_log_id: log.id, exercise_name: 'Squat' })]);
  const conversation = (await chatRepository.list()).conversations[0];
  const shared = await chatRepository.sendSetRef(conversation.id, {
    body: 'Here is my squat.', clientID: 'local-video-share', videoId: session.attachment_id,
    setRef: { v: 1, source: 'logged', exerciseName: 'Squat', setNumber: 1, setTotal: 3, weightKg: '145', reps: 5, dayDate: gymDayToday(), setLogId: log.id },
  });
  expect(shared.message.video_url).toBe(uri);
  expect((await chatRepository.messages(conversation.id)).messages.find(message => message.id === shared.message.id)?.video_url).toBe(uri);
  const marker = await videoMarkersRepository.create(session.attachment_id, 1000, 'Check this frame.');
  expect((await videoMarkersRepository.list(session.attachment_id)).markers).toEqual([marker]);
  await videoMarkersRepository.remove(session.attachment_id, marker.id);
  expect((await videoMarkersRepository.list(session.attachment_id)).markers).toEqual([]);
  await uploadsRepository.remove(session.attachment_id);
  expect((await videosRepository.list(student)).videos).toEqual([]);
  await expect(uploadsRepository.url(session.attachment_id)).rejects.toMatchObject({ status: 404 });
  expect(nativeUpload).not.toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
  nativeUpload.mockRestore();
});

test('S1: account, auth and onboarding lifecycle endpoints succeed locally', async () => {
  await requestPasswordReset({ email: 'any@example.test' });
  await resetPassword({ email: 'any@example.test', code: 'demo', newPassword: '' });
  const registered = await emailRegister({ email: 'any@example.test', password: '', timezone: 'UTC' });
  expect(registered.user.name).toBe('Alex Chen');
  expect((await refreshRequest('anything')).access_token).toBeTruthy();
  await useSessionStore.getState().bootstrap();
  expect((await onboardingRepository.complete()).completed_at).toBeTruthy();
  await accountRepository.changePassword({ old_password: '', new_password: '' });
  const binding = await bindRepository.create({ code: 'ANY', display_name: 'Alex Chen' });
  expect((await bindRepository.mine()).bind_request?.id).toBe(binding.id);
  await bindRepository.cancel(binding.id);
  expect((await bindRepository.mine()).bind_request?.status).toBe('cancelled');
  await accountRepository.deleteAccount();
  expect(global.fetch).not.toHaveBeenCalled();
});
