import { z } from 'zod';
import { authenticatedRequest } from '../session';
import { encodeQuery, TimestampSchema, UuidSchema } from './shared';
const CursorSchema = z.object({ message_id: UuidSchema, seq: z.number().int() });
export const ConversationSchema = z.object({
  id: UuidSchema,
  other_party: z.object({ id: UuidSchema, display_name: z.string() }),
  last_message: z.object({ id: UuidSchema, seq: z.number().int(), kind: z.enum(['text', 'image', 'set_ref']), preview: z.string(), preview_kind: z.enum(['text', 'image', 'training_plan', 'training_share']).nullish().catch(null), created_at: TimestampSchema, sender_id: UuidSchema }).nullish(),
  last_message_at: TimestampSchema.nullish(), unread_count: z.number().int().nonnegative(),
  my_last_read: CursorSchema.nullish(), other_last_read: CursorSchema.nullish(),
});
/** Frozen SetRefV1 wire contract. Invalid snapshots degrade to a text row, not a failed page. */
export const ChatSetRefSchema = z.object({
  v: z.literal(1), source: z.enum(['logged', 'planned']),
  exerciseName: z.string().min(1).refine(value => [...value].length <= 120 && !/[\p{Cc}\u2028\u2029]/u.test(value)),
  setNumber: z.number().int().min(1).max(2_147_483_648),
  setTotal: z.number().int().min(1).max(999).nullish(),
  weightKg: z.string().regex(/^(?:0|[1-9]\d{0,3})(?:\.\d?[1-9])?$/).nullish(),
  reps: z.number().int().min(0).max(99).nullish(),
  repsMax: z.number().int().min(0).max(99).nullish(),
  rpe: z.string().regex(/^(?:[0-9](?:\.5)?|10)$/).nullish(),
  dayDate: z.iso.date(), setLogId: UuidSchema.nullish(), planSetId: UuidSchema.nullish(),
}).strict().refine(value => (value.setTotal == null || value.setNumber <= value.setTotal)
  && (value.repsMax == null || (value.reps != null && value.repsMax > value.reps))
  && (value.source === 'logged' ? value.setLogId != null && value.planSetId == null : value.planSetId != null && value.setLogId == null));
export type ChatSetRef = z.infer<typeof ChatSetRefSchema>;
/** Backend/iOS wire shape: snake_case keys, every field present (null, never omitted). */
const SetRefWireSchema = z.object({
  v: z.literal(1), source: z.enum(['logged', 'planned']), exercise_name: z.string(), set_number: z.number(), set_total: z.number().nullable(),
  weight_kg: z.string().nullable(), reps: z.number().nullable(), reps_max: z.number().nullable(), rpe: z.string().nullable(), day_date: z.string(),
  set_log_id: z.string().nullable(), plan_set_id: z.string().nullable(),
}).strict();
export type SetRefWire = z.infer<typeof SetRefWireSchema>;
export function toSetRefWire(value: ChatSetRef): SetRefWire {
  return { v: 1, source: value.source, exercise_name: value.exerciseName, set_number: value.setNumber, set_total: value.setTotal ?? null,
    weight_kg: value.weightKg ?? null, reps: value.reps ?? null, reps_max: value.repsMax ?? null, rpe: value.rpe ?? null, day_date: value.dayDate,
    set_log_id: value.setLogId ?? null, plan_set_id: value.planSetId ?? null };
}
export const ChatSetRefFromWireSchema = SetRefWireSchema.transform((wire, context): ChatSetRef => {
  const parsed = ChatSetRefSchema.safeParse({
    v: wire.v, source: wire.source, exerciseName: wire.exercise_name, setNumber: wire.set_number, setTotal: wire.set_total, weightKg: wire.weight_kg,
    reps: wire.reps, repsMax: wire.reps_max, rpe: wire.rpe, dayDate: wire.day_date, setLogId: wire.set_log_id, planSetId: wire.plan_set_id,
  });
  if (parsed.success) return parsed.data;
  context.addIssue({ code: 'custom', message: 'Invalid set_ref snapshot' });
  return z.NEVER;
});
export const ChatMessageSchema = z.object({
  id: UuidSchema, conversation_id: UuidSchema, seq: z.number().int().positive(), sender_id: UuidSchema,
  kind: z.enum(['text', 'image', 'set_ref']), body: z.string().nullish(), client_id: z.string(), created_at: TimestampSchema,
  attachment_id: UuidSchema.nullish(), image_url: z.string().url().nullish(), image_expires_in: z.number().nullish(),
  set_ref: ChatSetRefFromWireSchema.nullish().catch(null), video_url: z.string().url().nullish(), video_expires_in: z.number().nullish(),
});
export const ChatMessagesSchema = z.object({ messages: z.array(ChatMessageSchema), meta: z.object({ other_last_read: CursorSchema.nullish(), has_more: z.boolean() }) });
export const SendTextSchema = z.object({ kind: z.literal('text'), body: z.string().trim().min(1).max(4000), client_id: z.string().min(1) }).strict();
export type Conversation = z.infer<typeof ConversationSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export const chatRepository = {
  list: () => authenticatedRequest('/conversations', { schema: z.object({ conversations: z.array(ConversationSchema) }) }),
  open: (otherUserId: string) => authenticatedRequest('/conversations', { method: 'POST', body: { other_user_id: UuidSchema.parse(otherUserId) }, schema: z.object({ conversation: ConversationSchema }) }),
  messages: (id: string, query: { since_seq?: number; before_seq?: number; limit?: number } = {}) => authenticatedRequest(`/conversations/${UuidSchema.parse(id)}/messages${encodeQuery({ limit: 50, ...query })}`, { schema: ChatMessagesSchema }),
  send: (id: string, body: string, clientID: string) => authenticatedRequest(`/conversations/${UuidSchema.parse(id)}/messages`, { method: 'POST', body: SendTextSchema.parse({ kind: 'text', body, client_id: clientID }), schema: z.object({ message: ChatMessageSchema }) }),
  sendSetRef: (id: string, input: { body: string; clientID: string; setRef: ChatSetRef; videoId?: string }) => authenticatedRequest(`/conversations/${UuidSchema.parse(id)}/messages`, { method: 'POST', body: { kind: 'text', body: z.string().min(1).max(4000).parse(input.body), client_id: z.string().min(1).parse(input.clientID), set_ref: toSetRefWire(ChatSetRefSchema.parse(input.setRef)), ...(input.videoId == null ? {} : { video_id: UuidSchema.parse(input.videoId) }) }, schema: z.object({ message: ChatMessageSchema }) }),
  read: (id: string, messageID: string) => authenticatedRequest(`/conversations/${UuidSchema.parse(id)}/read`, { method: 'POST', body: { message_id: UuidSchema.parse(messageID) }, schema: z.object({ my_last_read: CursorSchema, unread_count: z.number().int().nonnegative() }) }),
};
export function inboxConversation(value: Conversation) {
  return { id: value.id, otherPartyID: value.other_party.id, otherPartyName: value.other_party.display_name, lastMessageAt: value.last_message_at ?? null, lastMessagePreview: value.last_message?.preview ?? null, lastMessagePreviewKind: value.last_message?.preview_kind ?? null, unreadCount: value.unread_count };
}
