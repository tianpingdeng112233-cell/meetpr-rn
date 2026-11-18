import type { ChatMessage } from '@/api/domains/chat';

export type ChatVideoDraft = {
  clientId: string; ownerId: string; coachId: string; conversationId: string;
  uri: string; sizeBytes: number; contentType: 'video/mp4' | 'video/quicktime';
  durationSeconds: number; width: number; height: number;
};
export type ChatVideoItem = {
  draft: ChatVideoDraft; state: 'sending' | 'failed' | 'confirmed'; progress: number;
  message?: ChatMessage;
};
type Dependencies = {
  send: (draft: ChatVideoDraft, signal: AbortSignal, progress: (value: number) => void) => Promise<ChatMessage>;
  removeFile: (uri: string) => void;
};

/** A login-session outbox. Unsubscribing a screen never cancels its deliveries. */
export function createChatVideoOutbox(deps: Dependencies) {
  let ownerId: string | null = null;
  let coachId: string | null = null;
  let generation = 0;
  let items: ChatVideoItem[] = [];
  const observers = new Set<() => void>();
  const flights = new Map<string, { controller: AbortController; promise: Promise<void> }>();
  const publish = (next: ChatVideoItem[]) => { items = next; observers.forEach(listener => listener()); };
  const owned = (draft: ChatVideoDraft) => draft.ownerId === ownerId && draft.coachId === coachId;
  const update = (id: string, patch: Partial<ChatVideoItem>) => publish(items.map(item => item.draft.clientId === id ? { ...item, ...patch } : item));
  function send(draft: ChatVideoDraft): Promise<void> {
    if (!owned(draft)) return Promise.resolve();
    const flight = flights.get(draft.clientId);
    if (flight) return flight.promise;
    const controller = new AbortController();
    const capturedGeneration = generation;
    update(draft.clientId, { state: 'sending', progress: 0 });
    const promise = Promise.resolve().then(async () => {
      try {
        const message = await deps.send(draft, controller.signal, progress => {
          if (capturedGeneration === generation && !controller.signal.aborted)
            update(draft.clientId, { progress: Math.max(0, Math.min(1, progress)) });
        });
        if (capturedGeneration !== generation || controller.signal.aborted) return;
        update(draft.clientId, { state: 'confirmed', progress: 1, message });
        deps.removeFile(draft.uri);
      } catch {
        if (capturedGeneration === generation && !controller.signal.aborted)
          update(draft.clientId, { state: 'failed' });
      } finally {
        flights.delete(draft.clientId);
        if (capturedGeneration !== generation || controller.signal.aborted) deps.removeFile(draft.uri);
      }
    });
    flights.set(draft.clientId, { controller, promise });
    return promise;
  }
  return {
    subscribe(listener: () => void) { observers.add(listener); return () => { observers.delete(listener); }; },
    getSnapshot: () => items,
    setContext(owner: string | null, coach?: string | null) {
      const nextCoach = coach === undefined && owner === ownerId ? coachId : coach ?? null;
      if (owner === ownerId && nextCoach === coachId) return;
      generation += 1;
      ownerId = owner; coachId = nextCoach;
      for (const item of items) {
        const flight = flights.get(item.draft.clientId);
        if (flight) flight.controller.abort();
        else if (item.state !== 'confirmed') deps.removeFile(item.draft.uri);
      }
      publish([]);
    },
    enqueue(draft: ChatVideoDraft) {
      if (!owned(draft)) { deps.removeFile(draft.uri); return Promise.resolve(); }
      if (items.some(item => item.draft.clientId === draft.clientId && item.state === 'confirmed')) return Promise.resolve();
      if (!items.some(item => item.draft.clientId === draft.clientId))
        publish([...items, { draft, state: 'sending', progress: 0 }]);
      return send(draft);
    },
    retry(clientId: string) {
      const item = items.find(item => item.draft.clientId === clientId);
      return item?.state === 'failed' ? send(item.draft) : Promise.resolve();
    },
    acknowledge(messages: readonly ChatMessage[]) {
      // Keep in-flight work until its own POST settles (it owns orphan cleanup).
      const remaining = items.filter(item => {
        if (item.state === 'sending' || !messages.some(message => message.client_id === item.draft.clientId && message.conversation_id === item.draft.conversationId)) return true;
        if (item.state === 'failed') deps.removeFile(item.draft.uri);
        return false;
      });
      if (remaining.length !== items.length) publish(remaining);
    },
  };
}
