import { getLocales } from 'expo-localization';

import exerciseAliases from './generated/exercise-aliases-zh.json';
import exerciseNames from './generated/exercise-names-zh-Hant.json';
import searchChinese from './generated/search-zh.json';
import traditional from './generated/zh-Hant.json';

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
export type Locale = 'en' | 'zh' | 'zh-Hant';
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
  'student.todayWorkoutScreen.copy020': 2,
};
let localeOverride: Locale | null = null;

export function getLocale(): Locale {
  if (localeOverride) return localeOverride;
  const locale = getLocales()[0];
  const parts = locale?.languageTag?.toLowerCase().split('-') ?? [];
  if (parts[0] !== 'zh' && locale?.languageCode !== 'zh') return 'en';
  return parts.includes('hant') || locale?.languageScriptCode === 'Hant' ||
    parts.some(part => ['tw', 'hk', 'mo'].includes(part)) ||
    ['TW', 'HK', 'MO'].includes(locale?.regionCode ?? '') ? 'zh-Hant' : 'zh';
}

export function getLocaleHeader(): 'zh-Hans' | 'zh-Hant' | 'en' {
  const locale = getLocale();
  return locale === 'zh' ? 'zh-Hans' : locale;
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
  const hant = traditional as Partial<Record<string, Translation>>;
  let copy = (locale === 'zh-Hant' ? hant[key] : entry?.[locale]) ?? entry?.zh ?? key;
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

const searchWords: Readonly<Record<string, string>> = searchChinese;
const searchPattern = new RegExp(Object.keys(searchWords).sort((a, b) => b.length - a.length)
  .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

/** Search only: never use this normalization for display or persisted user content. */
export function normalizeExerciseSearch(input: string): string {
  return input.trim().toLocaleLowerCase().replace(searchPattern, word => searchWords[word])
    // Ignore trailing numeric specifications, retaining named variants such as (PIN).
    .replace(/\s*[（(]\s*\d[^()（）]*[）)]\s*$/u, '').trim();
}

/** Aliases add matches without removing partial matches against the original name. */
export function matchesExerciseSearch(name: string, query: string): boolean {
  const normalizedName = normalizeExerciseSearch(name);
  const normalizedQuery = normalizeExerciseSearch(query);
  if (normalizedName.includes(normalizedQuery)) return true;
  const aliases: Readonly<Record<string, string>> = exerciseAliases;
  const resolve = (value: string) => Object.hasOwn(aliases, value) ? aliases[value] : value;
  return resolve(normalizedName).includes(resolve(normalizedQuery));
}

const canonicalNames = new Map(Object.entries(exerciseNames).map(([source, translated]) => [translated, source]));
type ExerciseName = { name: string; name_en: string | null; created_by_coach_id?: string | null };

/** Undo only generated system-name translations when creating a canonical sharing snapshot. */
export function canonicalExerciseName(exercise: ExerciseName): string {
  return exercise.created_by_coach_id === null ? canonicalNames.get(exercise.name) ?? exercise.name : exercise.name;
}

/** Only positively identified system catalog data is translated; custom/unknown names stay verbatim. */
export function exerciseDisplayName(exercise: ExerciseName): string {
  if (getLocale() === 'en') return exercise.name_en ?? exercise.name;
  if (getLocale() === 'zh-Hant' && exercise.created_by_coach_id === null) {
    return Object.hasOwn(exerciseNames, exercise.name) ? (exerciseNames as Record<string, string>)[exercise.name] : exercise.name;
  }
  return exercise.name;
}
