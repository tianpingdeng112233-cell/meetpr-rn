export function mergeMessages<T extends { id: string; seq: number }>(existing: readonly T[], incoming: readonly T[]): T[] {
  return [...new Map([...existing, ...incoming].map(message => [message.id, message])).values()].sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
}
export const CHAT_POLL_MS = 30_000;
/** One controller per focused conversation. Stop prevents reads after navigation. */
export function createConversationSync<T extends { id: string; seq: number }>({ now, fetchPage, markRead }: { now: () => number; fetchPage: () => Promise<T[]>; markRead: (id: string) => Promise<unknown> }) {
  let lastPoll = -Infinity;
  let lastReadSeq = 0;
  let inFlight: Promise<T[] | undefined> | null = null;
  let stopped = false;
  return {
    stop() { stopped = true; },
    refresh(force = false): Promise<T[] | undefined> {
      if (stopped) return Promise.resolve(undefined);
      if (inFlight) return inFlight;
      if (!force && now() - lastPoll < CHAT_POLL_MS) return Promise.resolve(undefined);
      lastPoll = now();
      inFlight = (async () => {
        const messages = mergeMessages([], await fetchPage());
        const latest = messages[messages.length - 1];
        if (!stopped && latest && latest.seq > lastReadSeq) {
          await markRead(latest.id);
          lastReadSeq = latest.seq;
        }
        return stopped ? undefined : messages;
      })().finally(() => { inFlight = null; });
      return inFlight;
    },
  };
}
export function conversationSubtitle(status: string | undefined) {
  if (status === 'abnormal') return 'coach.chat.attentionStudentSubtitle';
  if (status === 'active' || status === 'inEvaluation' || status === 'in_evaluation') return 'coach.chat.activeStudentSubtitle';
  return null;
}
type ReadState = { unread_count: number; my_last_read: { message_id: string; seq: number } };
export function applyReadState<T extends { id: string; unread_count: number; my_last_read?: { message_id: string; seq: number } | null }>(conversations: readonly T[], conversationID: string, read: ReadState): T[] {
  return conversations.map(conversation => conversation.id === conversationID && (conversation.my_last_read?.seq ?? 0) <= read.my_last_read.seq ? { ...conversation, ...read } : conversation);
}
