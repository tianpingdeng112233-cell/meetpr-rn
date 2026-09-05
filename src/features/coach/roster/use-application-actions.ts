import { useState } from 'react';
import { Alert } from 'react-native';
import type { CoachApplication } from '@/api/domains/coach';
import { t } from '@/i18n';
import { AnalyticsEvent, track } from '@/analytics';
import { useCoachData } from '../CoachDataProvider';
export function useApplicationActions(onProcessed?: () => void) {
  const { model, busy } = useCoachData();
  const [acceptTarget, setAcceptTarget] = useState<CoachApplication | null>(null);
  return {
    busy, acceptTarget, openAccept: setAcceptTarget, closeAccept: () => setAcceptTarget(null),
    confirmAccept: async () => {
      if (!acceptTarget) return;
      const accepted = await model.accept(acceptTarget);
      setAcceptTarget(null);
      if (accepted) {
        void track(AnalyticsEvent.CoachIntakeAction, { stage: 'accepted_skip', student_id: acceptTarget.studentId });
        onProcessed?.();
      }
    },
    reject: (item: CoachApplication) => Alert.alert(t('coach.roster.rejectConfirmation'), undefined, [
      { text: t('coach.roster.cancel'), style: 'cancel' },
      { text: t('coach.roster.reject'), style: 'destructive', onPress: () => { void model.reject(item).then(processed => { if (processed) { void track(AnalyticsEvent.CoachIntakeAction, { stage: 'rejected', student_id: item.studentId }); onProcessed?.(); } }); } },
    ]),
  };
}
