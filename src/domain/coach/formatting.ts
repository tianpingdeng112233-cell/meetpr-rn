import { t } from '@/i18n';
export function relativeText(date: Date, now: Date): string {
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (seconds < 3600) return t('coach.shared.relative.minutesAgo %lld', [Math.max(1, Math.floor(seconds / 60))]);
  if (seconds < 86400) return t('coach.shared.relative.hoursAgo %lld', [Math.floor(seconds / 3600)]);
  return t('coach.shared.relative.daysAgo %lld', [Math.floor(seconds / 86400)]);
}
export function waitingText(date: Date, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (minutes < 60) return t('coach.bind.waiting.minutes %lld', [Math.max(1, minutes)]);
  if (minutes < 1440) return minutes % 60 ? t('coach.bind.waiting.hoursMinutes %lld %lld', [Math.floor(minutes / 60), minutes % 60]) : t('coach.bind.waiting.hours %lld', [minutes / 60]);
  return t('coach.bind.waiting.days %lld', [Math.floor(minutes / 1440)]);
}
export function decimalText(value: string | number): string {
  const text = String(value);
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}
export function oneRMTrio(squat?: string | null, bench?: string | null, deadlift?: string | null): string {
  const part = (value?: string | null) => value == null ? t('coach.applicationProfile.notProvided') : decimalText(value);
  return `S:${part(squat)}　B:${part(bench)}　D:${part(deadlift)}`;
}
