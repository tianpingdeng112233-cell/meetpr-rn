import { getLocales } from 'expo-localization';

import Analytics from './catalog/Analytics.json';
import AppShell from './catalog/AppShell.json';
import ChatUI from './catalog/ChatUI.json';
import CoachKit from './catalog/CoachKit.json';
import CoreModels from './catalog/CoreModels.json';
import DesignSystem from './catalog/DesignSystem.json';
import RepositoryContracts from './catalog/RepositoryContracts.json';
import RnExtras from './catalog/RnExtras.json';
import StudentKit from './catalog/StudentKit.json';

const catalog = {
  ...Analytics, ...AppShell, ...ChatUI, ...CoachKit, ...CoreModels,
  ...DesignSystem, ...RepositoryContracts, ...StudentKit,
  // Android-only copy with no iOS counterpart; English approved by Claude, zh mirrors the RN literal.
  ...RnExtras,
} as const;

export type TranslationKey = keyof typeof catalog;
export type Locale = 'en' | 'zh';
type Translation = string | { one?: string; other: string };
// Mirrors StudentStrings.Key.countIndex and CoachKit plural arguments; unlisted keys count their first parameter.
const PLURAL_COUNT_INDEX: Record<string, number> = {
  'coach.roster.sectionCount %@ %lld': 1,
  'coach.today.notTrainedTitle %@ %lld': 1,
  'coach.today.trainingDaysCompleted %lld %lld': 1,
  'coach.inbox.pendingVideosAccessibility %@ %lld': 1,
  'coach.workspace.defaultDraftName %@ %lld': 1,
  'coach.workspace.draftSummary %@ %@ %lld': 2,
  'coach.workspace.publishedSummary %@ %lld': 1,
  'student.dashboardPrimaryAction.copy007': 1,
  'student.feedbackVideoPresentation.copy002': 1,
  'student.growthE1Rmcard.copy005': 1,
  'student.historyEntriesView.copy004': 1,
  'student.onboardingSummaryFormatter.copy005': 1,
  'student.trainingCalendarView.copy002': 1,
  'student.trainingCalendarView.copy003': 1,
  'student.todayWorkoutScreen.copy020': 2,
};
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
  const entries = catalog as Partial<Record<string, { en?: Translation; zh?: Translation }>>;
  const isOne = locale === 'en' && Number(params[PLURAL_COUNT_INDEX[key] ?? 0]) === 1;
  const entry = (isOne ? entries[`${key}.one`] : undefined) ?? entries[key];
  let copy = entry?.[locale] ?? entry?.zh ?? key;
  if (typeof copy !== 'string') {
    copy = isOne ? copy.one ?? copy.other : copy.other;
  }
  let sequentialIndex = 0;
  const namedIndexes = new Map<string, number>();
  return copy.replace(/\{(\d+)\}|\{([a-zA-Z]\w*)\}|%@|%lld/g, (placeholder, position: string | undefined, name: string | undefined) => {
    if (name && !namedIndexes.has(name)) namedIndexes.set(name, sequentialIndex++);
    const value = params[name ? namedIndexes.get(name)! : position === undefined ? sequentialIndex++ : Number(position)];
    return value === undefined ? placeholder : String(value);
  });
}

/** Catalog names are canonical data, not UI translations. */
export function exerciseDisplayName(exercise: { name: string; name_en: string | null }): string {
  return getLocale() === 'en' ? exercise.name_en ?? exercise.name : exercise.name;
}
