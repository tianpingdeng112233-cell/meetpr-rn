import type { OnboardingUpsertInput } from '@/api/domains/onboarding';
import { MEET_FEDERATIONS, formatMeetClass, parseMeetClass, type MeetFederation } from '@/domain/meet/weight-class';

import { onboardingDateBounds } from './model';

export function meetPatch({ competitionDate, federation, weightClass }: {
  competitionDate: string;
  federation: MeetFederation;
  weightClass: string;
}): OnboardingUpsertInput {
  return {
    is_competing: true,
    competition_date: competitionDate,
    target_weight_class: formatMeetClass(federation, weightClass),
  };
}

export function removeMeetPatch(): OnboardingUpsertInput {
  return { is_competing: false, competition_date: null, target_weight_class: null };
}

export function invalidMeetFields({ competitionDate, federation, weightClass }: {
  competitionDate?: string | null;
  federation?: string | null;
  weightClass?: string | null;
}, now = new Date()): ('competitionDate' | 'federation' | 'weightClass')[] {
  const invalid: ('competitionDate' | 'federation' | 'weightClass')[] = [];
  const bounds = onboardingDateBounds(now).competition;
  const parsedDate = new Date(`${competitionDate}T00:00:00Z`);
  if (!competitionDate || !/^\d{4}-\d{2}-\d{2}$/.test(competitionDate)
    || !Number.isFinite(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== competitionDate
    || competitionDate < bounds.minDate || competitionDate > bounds.maxDate) {
    invalid.push('competitionDate');
  }
  if (!MEET_FEDERATIONS.some((known) => known === federation)) invalid.push('federation');
  if (!parseMeetClass(`${federation} · ${weightClass} kg`)) invalid.push('weightClass');
  return invalid;
}
