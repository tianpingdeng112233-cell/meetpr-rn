import { getLocales } from 'expo-localization';

import Analytics from './catalog/Analytics.json';
import AppShell from './catalog/AppShell.json';
import ChatUI from './catalog/ChatUI.json';
import CoachKit from './catalog/CoachKit.json';
import CoreModels from './catalog/CoreModels.json';
import DesignSystem from './catalog/DesignSystem.json';
import RepositoryContracts from './catalog/RepositoryContracts.json';
import StudentKit from './catalog/StudentKit.json';

const catalog = {
  ...Analytics, ...AppShell, ...ChatUI, ...CoachKit, ...CoreModels,
  ...DesignSystem, ...RepositoryContracts, ...StudentKit,
} as const;

export type TranslationKey = keyof typeof catalog;
export type Locale = 'en' | 'zh';
type Translation = string | { one?: string; other: string };
let localeOverride: Locale | null = null;

export function getLocale(): Locale {
  return localeOverride ?? (getLocales()[0]?.languageTag.toLowerCase().startsWith('zh') ? 'zh' : 'en');
}

/** Test/debug only; null restores device-language selection. */
export function setLocaleOverride(locale: Locale | null = null): void {
  localeOverride = locale;
}

export function t(key: TranslationKey, params: readonly (string | number)[] = []): string {
  const locale = getLocale();
  const table = catalog as Partial<Record<string, { en?: Translation; zh?: Translation }>>;
  // The xcstrings export flattens plural variants into sibling keys (`<key>.one`); pick
  // the singular form when the first parameter is exactly 1 (en only — zh has no plural).
  const singular = locale === 'en' && Number(params[0]) === 1 ? table[`${key}.one`] : undefined;
  const entry = singular ?? table[key];
  let copy = entry?.[locale] ?? entry?.zh ?? key;
  if (typeof copy !== 'string') {
    copy = locale === 'en' && Number(params[0]) === 1 ? copy.one ?? copy.other : copy.other;
  }
  let sequentialIndex = 0;
  return copy.replace(/\{(\d+)\}|%@|%lld/g, (placeholder, position: string | undefined) => {
    const value = params[position === undefined ? sequentialIndex++ : Number(position)];
    return value === undefined ? placeholder : String(value);
  });
}

/** Catalog names are canonical data, not UI translations. */
export function exerciseDisplayName(exercise: { name: string; name_en: string | null }): string {
  return getLocale() === 'en' ? exercise.name_en ?? exercise.name : exercise.name;
}
