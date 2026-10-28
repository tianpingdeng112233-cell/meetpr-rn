import { demoVideoUrl, demoVideos, resetDemoUploads, uploadRoute } from './uploads';
import { z } from 'zod';
import { ReadinessSubmitRequestSchema, type ReadinessCheckin } from '@/api/domains/readiness';
import { toSetRefWire, ChatSetRefFromWireSchema } from '@/api/domains/chat';
import type { ApiRequestOptions } from '@/api/client';
import { gymDayToday } from '@/domain/plan/workout-date-policy';
import { buildDemoSeed, demoId, type DemoMessage } from './seed';
import { SetLogUpsertRequestSchema } from '@/api/domains/sets';
import { OnboardingUpsertRequestSchema } from '@/api/domains/onboarding';

export { uploadDemoParts } from './uploads';

let checkins: ReadinessCheckin[] = [];
let serial = 100000;
let state = buildDemoSeed(gymDayToday());
export function resetDemoBackend(today = gymDayToday()): void {
  state = buildDemoSeed(today);
  serial = 100000;
  checkins = [];
  resetDemoUploads();
}

function messageWire(message: DemoMessage) {
  return { ...message, video_url: message.video_id ? demoVideoUrl(message.video_id) : null, video_expires_in: null };
}

/** Only the fetch response surface consumed by apiRequest; decoding stays in the client. */
export async function demoResponse(path: string, options: ApiRequestOptions<unknown> = {}) {
  if (options.signal?.aborted) throw new Error('Request aborted');
  const url = new URL(path, 'https://demo.example.test');
  const route = url.pathname;
  const method = options.method ?? 'GET';
  const now = new Date().toISOString();
  const student = `/students/${state.user.id}`;
  let status = 200;
  let payload: unknown;
  if (method === 'POST' && ['/auth/email/login', '/auth/email/register', '/auth/login', '/auth/register', '/auth/refresh'].includes(route)) {
    payload = { user: state.user, access_token: 'demo-access', refresh_token: 'demo-refresh' };
  } else if ((method === 'PATCH' && route === '/me/timezone') ||
    (method === 'PUT' && route === '/me/password') || (method === 'DELETE' && route === '/me') ||
    (method === 'POST' && ['/auth/email/forgot', '/auth/email/reset', '/events'].includes(route))) payload = {};
  else if (method === 'POST' && route === '/students/me/onboarding/complete') {
    state.profile.completed_at = now; payload = state.profile;
  } else if (method === 'POST' && route === '/bind-requests') {
    state.binding.status = 'accepted'; payload = state.binding;
  } else if (method === 'DELETE' && route === `/bind-requests/${state.binding.id}`) {
    state.binding.status = 'cancelled'; payload = {};
  }
  else if (method === 'GET' && route === `${student}/plans`) payload = { plans: [state.plan] };
  else if (method === 'GET' && route === `/plans/${state.plan.id}`) payload = state.plan;
  else if (method === 'GET' && route === `${student}/sets`) payload = { logs: state.logs.filter(log => log.logged_date >= (url.searchParams.get('from') ?? '') && log.logged_date < (url.searchParams.get('to') ?? '9999')) };
  else if (method === 'GET' && route === `${student}/onboarding`) payload = state.profile;
  else if (method === 'GET' && route === '/exercises') payload = { exercises: state.exercises };
  else if (method === 'GET' && route === '/bind-requests/mine') payload = { bind_request: state.binding };
  else if (method === 'GET' && route === `${student}/feedback`) payload = { items: state.feedback };
  else if (method === 'GET' && route === '/conversations') payload = { conversations: [state.conversation] };
  else if (method === 'GET' && route === `/conversations/${state.conversation.id}/messages`) {
    const candidates = state.messages.filter(message => message.seq > Number(url.searchParams.get('since_seq') ?? 0) && message.seq < Number(url.searchParams.get('before_seq') ?? Infinity));
    const limit = Math.max(1, Number(url.searchParams.get('limit') ?? 50));
    const messages = url.searchParams.has('since_seq') ? candidates.slice(0, limit) : candidates.slice(-limit);
    payload = { messages: messages.map(messageWire), meta: { has_more: candidates.length > messages.length, other_last_read: state.conversation.other_last_read } };
  }
  else if (method === 'GET' && route === `${student}/readiness`) payload = { checkin: checkins.find(checkin => checkin.checkin_date === url.searchParams.get('date')) ?? null };
  else if (method === 'GET' && route === `${student}/videos`) payload = { videos: demoVideos(state.logs, state.exercises) };
  else if (method === 'POST' && route === '/sets/log') {
    const body = SetLogUpsertRequestSchema.parse(options.body);
    const exercise = 'plan_exercise_id' in body ? state.plan.days.flatMap(day => day.exercises).find(exercise => exercise.id === body.plan_exercise_id) : undefined;
    const date = body.logged_date ?? gymDayToday();
    const exerciseId = exercise?.exercise_id ?? ('exercise_id' in body ? body.exercise_id : null);
    if (!exerciseId) { status = 404; payload = { error: 'SETS_EXERCISE_NOT_FOUND' }; }
    else {
      const existing = state.logs.find(log => log.logged_date === date && log.set_index === body.set_index &&
        (exercise ? log.plan_exercise_id === exercise.id : log.adhoc && log.exercise_id === exerciseId));
      const row = { ...body, id: existing?.id ?? demoId(serial++), student_id: state.user.id,
        exercise_id: exerciseId, plan_exercise_id: exercise?.id ?? null, logged_date: date, logged_at: now,
        assumed: false, adhoc: !exercise, rpe: body.rpe ?? null, coach_rpe: null };
      if (existing) Object.assign(existing, row); else state.logs.push(row);
      payload = { id: row.id, logged_at: row.logged_at };
    }
  } else if (['POST', 'DELETE'].includes(method) && /^\/plans\/days\/[^/]+\/complete$/.test(route)) {
    const day = state.plan.days.find(day => day.id === route.split('/')[3]);
    if (!day) { status = 404; payload = { error: 'PLAN_NOT_FOUND' }; }
    else {
      day.completed_at = method === 'POST' ? now : null;
      day.completion_source = method === 'POST' ? 'manual' : null;
      payload = method === 'POST' ? { id: demoId(serial++), plan_day_id: day.id, student_id: state.user.id, source: 'manual', completed_at: now } : {};
    }
  } else if (method === 'PUT' && route === '/students/me/onboarding') {
    Object.assign(state.profile, OnboardingUpsertRequestSchema.parse(options.body), { updated_at: now });
    payload = state.profile;
  }
  else if (method === 'POST' && route === '/students/me/readiness') {
    const body = ReadinessSubmitRequestSchema.parse(options.body);
    const previous = checkins.find(checkin => checkin.checkin_date === body.checkin_date);
    const row = { ...body, id: previous?.id ?? demoId(serial++), student_id: state.user.id, submitted_at: previous?.submitted_at ?? now, updated_at: now };
    if (previous) Object.assign(previous, row); else checkins.push(row);
    payload = row;
  } else if (method === 'PATCH' && /^\/feedback\/[^/]+\/read$/.test(route)) {
    const item = state.feedback.find(item => item.id === route.split('/')[2]);
    if (!item) { status = 404; payload = { error: 'FEEDBACK_NOT_FOUND' }; }
    else { item.read_at ??= now; payload = {}; }
  } else if (method === 'POST' && route === '/conversations') payload = { conversation: state.conversation };
  else if (method === 'POST' && route === `/conversations/${state.conversation.id}/messages`) {
    const body = z.object({ body: z.string(), client_id: z.string(), set_ref: ChatSetRefFromWireSchema.optional(), video_id: z.string().optional() }).parse(options.body);
    let message = state.messages.find(message => message.client_id === body.client_id);
    if (!message) {
      message = { id: demoId(serial++), conversation_id: state.conversation.id, seq: state.messages.length + 1, sender_id: state.user.id,
        kind: 'text', body: body.body, client_id: body.client_id, created_at: now, video_id: body.video_id, ...(body.set_ref ? { set_ref: toSetRefWire(body.set_ref) } : {}) };
      state.messages.push(message);
      state.conversation.last_message = { id: message.id, seq: message.seq, kind: message.kind, preview: message.body,
        preview_kind: body.set_ref ? body.set_ref.source === 'planned' ? 'training_plan' : 'training_share' : 'text', created_at: now, sender_id: message.sender_id };
      state.conversation.last_message_at = now;
    }
    payload = { message: messageWire(message) };
  } else if (method === 'POST' && route === `/conversations/${state.conversation.id}/read`) {
    const body = z.object({ message_id: z.string() }).parse(options.body);
    const message = state.messages.find(message => message.id === body.message_id);
    if (!message) { status = 404; payload = { error: 'DEMO_MESSAGE_NOT_FOUND' }; }
    else {
      if (message.seq > (state.conversation.my_last_read?.seq ?? 0)) state.conversation.my_last_read = { message_id: message.id, seq: message.seq };
      state.conversation.unread_count = state.messages.filter(item => item.sender_id !== state.user.id && item.seq > state.conversation.my_last_read!.seq).length;
      payload = { my_last_read: state.conversation.my_last_read, unread_count: state.conversation.unread_count };
    }
  } else {
    const upload = uploadRoute(route, method, options.body, state.user.id, state.coach.id, () => demoId(serial++));
    status = upload?.status ?? 404;
    payload = upload?.payload ?? { error: 'DEMO_ROUTE_NOT_FOUND' };
  }
  const text = JSON.stringify(payload);
  return { status, ok: status >= 200 && status < 300, text: async () => text };
}
