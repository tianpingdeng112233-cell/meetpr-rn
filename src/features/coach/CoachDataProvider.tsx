import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { coachRepository } from '@/api/domains/coach';
import { t } from '@/i18n';
import type { CoachConversation, CoachVideo } from '@/domain/coach/todo-list';
import { useCoachNow } from './CoachNowProvider';
import { CoachDataModel } from './CoachDataModel';
import { loadRosterRows } from './roster/load-roster';
const Context = createContext<CoachDataModel | null>(null);
// W2-c replaces these inputs with its video queue and coach-only chat context.
const videos: readonly CoachVideo[] = [];
const conversations: readonly CoachConversation[] = [];
export function CoachDataProvider({ children }: PropsWithChildren) {
  const now = useCoachNow();
  const cache = useQueryClient();
  const [model] = useState(() => new CoachDataModel({ ...coachRepository, queue: coachRepository.bindQueue, roster: async (timestamp, onCached) => loadRosterRows(await coachRepository.students(), timestamp, cache, undefined, onCached) }, now));
  useEffect(() => { model.advanceClock(now); }, [model, now]);
  useEffect(() => { void model.loadIfNeeded(); }, [model]);
  return <Context.Provider value={model}><QueueBanner />{children}</Context.Provider>;
}
function QueueBanner() {
  const { banner, model } = useCoachData();
  useEffect(() => {
    if (banner) Alert.alert(t(banner), undefined, [{ text: t('coach.chat.ok'), onPress: model.clearBanner }], { onDismiss: model.clearBanner });
  }, [banner, model]);
  return null;
}
export function useCoachData() {
  const model = useContext(Context);
  if (!model) throw new Error('CoachDataProvider is required');
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot, model.getSnapshot);
  return { ...snapshot, model, videos, conversations };
}
