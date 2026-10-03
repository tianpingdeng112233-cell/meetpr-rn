import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { inviteCodesRepository, type InviteCodesRepository } from '@/api/domains/invite-codes';
import { useSessionStore } from '@/api/session';
import { inviteClipboard, type InviteClipboard } from './clipboard';
import { InviteCodesModel } from './invite-card-state';

export type InviteDependencies = { repository?: InviteCodesRepository; clipboard?: InviteClipboard; clock?: () => number };

export function useInviteCodes({ repository = inviteCodesRepository, clipboard = inviteClipboard, clock = Date.now }: InviteDependencies = {}) {
  const userID = useSessionStore(state => state.user?.id);
  // Session identity is part of the lifetime so one coach's list cannot reach another.
  const model = useMemo(() => ({ userID, value: new InviteCodesModel(repository, clipboard) }), [repository, clipboard, userID]).value;
  const snapshot = useSyncExternalStore(model.subscribe, model.getSnapshot);
  const [now, setNow] = useState(clock);
  useFocusEffect(useCallback(() => {
    setNow(clock());
    void model.reload();
    const timer = setInterval(() => setNow(clock()), 1_000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') { setNow(clock()); void model.reload(); }
    });
    return () => { clearInterval(timer); subscription.remove(); model.clearCopied(); };
  }, [clock, model]));
  useEffect(() => {
    if (!snapshot.copiedCodeID) return;
    const timer = setTimeout(model.clearCopied, 2_000);
    return () => clearTimeout(timer);
  }, [model, snapshot.copiedCodeID, snapshot.copyRevision]);
  return { model, snapshot, now };
}
