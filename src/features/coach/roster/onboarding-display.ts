import type { OnboardingProfile } from '@/api/domains/onboarding';
import { t, type TranslationKey } from '@/i18n';
import { decimalText } from '@/domain/coach/formatting';
import { parseDay } from '@/domain/coach/calendar';
import catalog from '@/i18n/catalog/CoachKit.json';
export type Profile = Partial<OnboardingProfile>;
export function age(birthDate: string | null | undefined, now: Date): number | null {
  if (!birthDate) return null;
  const birth = parseDay(birthDate);
  let years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
  return Number.isFinite(years) && years >= 0 ? years : null;
}
export function trainingYearsText(years: number): string {
  return years < 1 ? t('coach.bind.training.lessThanOne') : years >= 10 ? t('coach.bind.training.tenPlus') : t('coach.bind.training.years %lld', [years]);
}
const muscleAliases: Record<string, string> = { quad: 'quadriceps', hamstring: 'hamstrings', glute: 'glutes', core: 'coreAndLowerBack' };
const equipmentAliases: Record<string, string> = { leg_press_machine: 'legPress', power_bar_stiff: 'powerBar' };
/** Unknown vocabulary stays visible, as required for newer/retired equipment tokens. */
export function vocabulary(group: 'gender' | 'gym' | 'equipment' | 'injury' | 'muscle', value: string): string {
  const suffix = group === 'muscle' && muscleAliases[value] ? muscleAliases[value] : group === 'equipment' && equipmentAliases[value] ? equipmentAliases[value] : value.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
  const key = group === 'muscle' ? `coach.shared.muscle.${suffix}` : `coach.bind.${group}.${suffix}`;
  return Object.prototype.hasOwnProperty.call(catalog, key) ? t(key as TranslationKey) : value;
}
export function basicInfo(profile: Profile, now: Date, includeHeight = false): string {
  const years = age(profile.birth_date, now);
  return [profile.gender ? vocabulary('gender', profile.gender) : null, years == null ? null : t(includeHeight ? 'coach.applicationProfile.age' : 'coach.roster.age %lld', [years]), includeHeight && profile.height_cm != null ? `${decimalText(profile.height_cm)} cm` : null, profile.weight_kg != null ? `${decimalText(profile.weight_kg)} kg` : null].filter(Boolean).join(' · ');
}
