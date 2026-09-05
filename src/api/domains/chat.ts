import { z } from 'zod';
import { authenticatedRequest } from '../session';
import { encodeQuery, TimestampSchema, UuidSchema } from './shared';
const CursorSchema = z.object({ message_id: UuidSchema, seq: z.number().int() });
export const ConversationSchema = z.object({
  id: UuidSchema,
  other_party: z.object({ id: UuidSchema, display_name: z.string() }),
  last_message: z.object({ id: UuidSchema, seq: z.number().int(), kind: z.enum(['text', 'image', 'set_ref']), preview: z.string(), created_at: TimestampSchema, sender_id: UuidSchema }).nullish(),
  last_message_at: TimestampSchema.nullish(), unread_count: z.number().int().nonnegative(),
  my_last_read: CursorSchema.nullish(), other_last_read: CursorSchema.nullish(),
});
export const ChatMessageSchema = z.object({
  id: UuidSchema, conversation_id: UuidSchema, seq: z.number().int().positive(), sender_id: UuidSchema,
  kind: z.enum(['text', 'image', 'set_ref']), body: z.string().nullish(), client_id: z.string(), created_at: TimestampSchema,
  attachment_id: UuidSchema.nullish(), image_url: z.string().url().nullish(), image_expires_in: z.number().nullish(),
  set_ref: z.unknown().optional(), video_url: z.string().url().nullish(), video_expires_in: z.number().nullish(),
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
  read: (id: string, messageID: string) => authenticatedRequest(`/conversations/${UuidSchema.parse(id)}/read`, { method: 'POST', body: { message_id: UuidSchema.parse(messageID) }, schema: z.object({ my_last_read: CursorSchema, unread_count: z.number().int().nonnegative() }) }),
};
export function inboxConversation(value: Conversation) {
  return { id: value.id, otherPartyID: value.other_party.id, otherPartyName: value.other_party.display_name, lastMessageAt: value.last_message_at ?? null, lastMessagePreview: value.last_message?.preview ?? null, unreadCount: value.unread_count };
}
