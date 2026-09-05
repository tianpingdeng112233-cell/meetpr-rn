import { getCalendars, getLocales } from 'expo-localization';
import type { CoachStudent } from '@/api/domains/coach';
import { addDays, localDate, localDay } from '@/domain/coach/detail-week';
import { t, type TranslationKey } from '@/i18n';

export const deviceLocale = () => getLocales()[0]?.languageTag ?? 'en-US';
export function dateText(date: Date, full = false): string {
  return new Intl.DateTimeFormat(deviceLocale(), full ? { year: 'numeric', month: '2-digit', day: '2-digit' } : { month: '2-digit', day: '2-digit' }).format(date);
}
export function relativeText(value: string, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 1000));
  if (seconds < 3600) return t('coach.shared.relative.minutesAgo %lld', [Math.max(1, Math.floor(seconds / 60))]);
  if (seconds < 86400) return t('coach.shared.relative.hoursAgo %lld', [Math.floor(seconds / 3600)]);
  return t('coach.shared.relative.daysAgo %lld', [Math.floor(seconds / 86400)]);
}
export function statusPresentation(student: CoachStudent, now: Date): { label: string; tone: 'success' | 'danger' | 'gold500' } | null {
  if (student.status === 'in_evaluation' && student.evaluationEndAt) {
    const hours = Math.max(0, Math.floor((new Date(student.evaluationEndAt).getTime() - now.getTime()) / 3600000));
    const days = Math.floor(hours / 24);
    return { label: days > 0 ? t('coach.detail.evaluationDays %lld', [days]) : t('coach.detail.evaluationHours %lld', [hours]), tone: 'gold500' };
  }
  if (student.status === 'abnormal') return { label: t('coach.detail.needsAttention'), tone: 'danger' };
  if (student.status === 'active') return { label: t('coach.detail.active'), tone: 'success' };
  return null;
}
export function naturalWeekNumber(now: Date): number {
  const locale = (typeof Intl.Locale === 'function' ? new Intl.Locale(deviceLocale()) : {}) as Intl.Locale & { getWeekInfo?: () => { firstDay: number; minimalDays: number }; weekInfo?: { firstDay: number; minimalDays: number } };
  const info = (locale.getWeekInfo?.() ?? locale.weekInfo) as { firstDay: number; minimalDays?: number } | undefined;
  const firstDay = info ? info.firstDay % 7 : (getCalendars()[0]?.firstWeekday ?? 1) - 1;
  // Hermes versions without weekInfo still expose the device's first weekday.
  const minimalDays = info?.minimalDays ?? (['AD','AT','AX','BE','BG','CH','CZ','DE','DK','EE','ES','FI','FJ','FO','FR','GB','GF','GG','GI','GP','GR','IE','IM','IS','IT','JE','LI','LT','LU','MC','MQ','NL','NO','PL','PT','RE','RU','SE','SJ','SK','SM','VA'].includes(locale.region ?? getLocales()[0]?.regionCode ?? '') ? 4 : 1);
  const firstWeek = (year: number) => {
    const january = new Date(year, 0, 1);
    const offset = (january.getDay() - firstDay + 7) % 7;
    return addDays(january, -offset + (7 - offset < minimalDays ? 7 : 0));
  };
  let year = now.getFullYear();
  if (now < firstWeek(year)) year -= 1;
  else if (now >= firstWeek(year + 1)) year += 1;
  const start = firstWeek(year);
  const days = (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000;
  return Math.floor(days / 7) + 1;
}
export function videoDayTitle(day: string, now: Date): string {
  if (day === localDay(now)) return t('coach.video.today');
  if (day === localDay(addDays(now, -1))) return t('coach.video.yesterday');
  return dateText(localDate(day));
}
const muscleKeys: Record<string, TranslationKey> = {
  quad: 'coach.shared.muscle.quadriceps', hamstring: 'coach.shared.muscle.hamstrings', glute: 'coach.shared.muscle.glutes',
  quadriceps: 'coach.shared.muscle.quadriceps', hamstrings: 'coach.shared.muscle.hamstrings', glutes: 'coach.shared.muscle.glutes', back: 'coach.shared.muscle.back', chest: 'coach.shared.muscle.chest', shoulder: 'coach.shared.muscle.shoulder', shoulders: 'coach.shared.muscle.shoulder', triceps: 'coach.shared.muscle.triceps', core_and_lower_back: 'coach.shared.muscle.coreAndLowerBack', core: 'coach.shared.muscle.coreAndLowerBack',
};
export const muscleLabel = (value: string) => muscleKeys[value] ? t(muscleKeys[value]) : value;
