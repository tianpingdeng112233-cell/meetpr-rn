import { restSecondsForRPE } from '@/features/settings/rest-timer';
import { t } from '@/i18n';

export function restExplanationRows() {
  return ([['training.restBelowSeven', 6], ['training.restBelowNine', 8], ['training.restNineOrAbove', 9]] as const)
    .map(([label, rpe]) => ({ label: t(label), duration: t('training.restMinutes', [restSecondsForRPE({ mode: 'automatic' }, rpe) / 60]) }));
}
