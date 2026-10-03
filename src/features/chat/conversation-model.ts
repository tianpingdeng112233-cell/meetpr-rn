import type { RealtimeEvent } from '@/api/realtime';
import type { ChatSetRef } from '@/api/domains/chat';
import type { VideoBadgeInfo } from '@/features/video-player/types';

export function mergeMessages<T extends { id: string; seq: number }>(existing: readonly T[], incoming: readonly T[]): T[] {
  return [...new Map([...existing, ...incoming].map(message => [message.id, message])).values()].sort((a, b) => a.seq - b.seq || a.id.localeCompare(b.id));
}
export const CHAT_POLL_MS = 30_000;
export const CONVERSATION_POLL_MS = 3_000;

/** A burst during a request gets one trailing pass, including after a failed request. */
export function createRefreshQueue<T>(operation: () => Promise<T>) {
  let flight: Promise<T | undefined> | undefined;
  let pending = false;
  let stopped = false;
  return {
    get refreshing() { return flight !== undefined; },
    stop() { stopped = true; pending = false; },
    refresh(): Promise<T | undefined> {
      if (stopped) return Promise.resolve(undefined);
      if (flight) { pending = true; return flight; }
      flight = (async () => {
        do {
          pending = false;
          try {
            const value = await operation();
            if (!pending || stopped) return stopped ? undefined : value;
          } catch (error) {
            if (!pending || stopped) throw error;
          }
        } while (!stopped);
      })().finally(() => { flight = undefined; });
      return flight;
    },
  };
}
type ConversationSyncOptions<T> = {
  now: () => number;
  fetchPage: () => Promise<T[]>;
  markRead: (id: string) => Promise<unknown>;
  pollInterval?: number;
  realtime?: {
    conversationId: string;
    userId: string;
    messages: () => readonly T[];
    otherReadSeq: () => number;
    updateOtherRead: (seq: number) => void;
  };
};
/** One controller per focused conversation. Stop prevents reads after navigation. */
export function createConversationSync<T extends { id: string; seq: number }>({ now, fetchPage, markRead, pollInterval = CONVERSATION_POLL_MS, realtime }: ConversationSyncOptions<T>) {
  let lastPoll = -Infinity;
  let lastReadSeq = 0;
  let inFlight: Promise<T[] | undefined> | null = null;
  let stopped = false;
  const queue = createRefreshQueue(async () => {
    lastPoll = now();
    const messages = mergeMessages([], await fetchPage());
    const latest = messages[messages.length - 1];
    if (!stopped && latest && latest.seq > lastReadSeq) {
      await markRead(latest.id);
      lastReadSeq = latest.seq;
    }
    return messages;
  });
  function refresh(force = false): Promise<T[] | undefined> {
    if (stopped) return Promise.resolve(undefined);
    if (inFlight && !force) return inFlight;
    if (!inFlight && !force && now() - lastPoll < pollInterval) return Promise.resolve(undefined);
    inFlight = queue.refresh().finally(() => { inFlight = null; });
    return inFlight;
  }
  return {
    stop() { stopped = true; queue.stop(); },
    refresh,
    receive(event: RealtimeEvent): Promise<T[] | undefined> {
      if (stopped || !realtime || event.type === 'hello' || event.conversationId !== realtime.conversationId) return Promise.resolve(undefined);
      if (event.type === 'chat.read') {
        if (event.userId === realtime.userId || event.lastReadSeq <= realtime.otherReadSeq()) return Promise.resolve(undefined);
        if (realtime.messages().some(message => message.seq === event.lastReadSeq)) {
          realtime.updateOtherRead(event.lastReadSeq);
          return Promise.resolve(undefined);
        }
      }
      return refresh(true);
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

/** Only snapshot metrics belong to a shared-set badge; coach attribution is opt-in. */
export function feedbackVideoBadge(reference: ChatSetRef | null | undefined, includesCoachAttribution: boolean, coachName?: string): VideoBadgeInfo | null {
  if (!reference) return null;
  return {
    exerciseName: reference.exerciseName,
    weightKg: reference.weightKg == null ? null : Number(reference.weightKg),
    reps: reference.reps ?? null,
    rpe: reference.rpe == null ? null : Number(reference.rpe),
    setOrdinal: reference.setNumber,
    coachName: includesCoachAttribution ? coachName ?? null : null,
  };
}
