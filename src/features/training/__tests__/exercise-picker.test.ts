import { afterEach, expect, test } from '@jest/globals';
import { exerciseTags, filterStudentExercises } from '../exercise-picker';
import type { Exercise } from '@/api/domains/exercises';
import translatedNames from '@/i18n/generated/exercise-names-zh-Hant.json';
import { exerciseDisplayName, setLocaleOverride } from '@/i18n';
afterEach(() => setLocaleOverride(null));
const exercise = (patch: Partial<Exercise> = {}): Exercise => ({ id: 'curl', name: '哑铃弯举', name_en: 'Dumbbell curl', exercise_type: 'accessory', main_lift_family: null, is_competition_lift: false, competition_stance: null, muscle_groups: ['biceps'], equipment: null, movement_pattern: null, created_by_coach_id: null, created_at: '', ...patch });
test.each(['squat', 'bench', 'deadlift'] as const)('picker family %s includes main lifts and variations', family => {
  for (const exercise_type of ['main_lift', 'main_lift_variation']) expect(exerciseTags(exercise({ exercise_type, main_lift_family: family }))).toContain(family);
});
test.each([
  ['core', 'core'], ['chest', 'chest'], ['back', 'back'], ['shoulder', 'shoulders'], ['biceps', 'biceps'], ['triceps', 'triceps'], ['trap', 'traps'], ['traps', 'traps'], ['forearm', 'forearms'], ['quad', 'quads'], ['glute', 'glutes'], ['hamstring', 'hamstrings'], ['calf', 'calves'], ['adductor', 'adductors'], ['hip', 'hips'], ['grip', 'forearms'], ['hip_flexor', 'hips'], ['tibialis', 'calves'], ['mobility', 'other'], ['cardio', 'other'],
])('picker muscle %s maps to %s', (muscle, tag) => expect(exerciseTags(exercise({ muscle_groups: [muscle] }))).toEqual(['all', tag]));
test('picker combines bilingual search and one tag; multi-muscle and missing metadata remain predictable', () => {
  expect(exerciseTags(exercise({ muscle_groups: ['biceps', 'forearm'] }))).toEqual(['all', 'biceps', 'forearms']);
  expect(exerciseTags(exercise({ muscle_groups: null }))).toEqual(['all']);
  expect(filterStudentExercises([exercise()], 'biceps', '弯举')).toHaveLength(1);
  expect(filterStudentExercises([exercise()], 'all', 'DUMBBELL')).toHaveLength(1);
  expect(filterStudentExercises([exercise()], 'quads', 'curl')).toHaveLength(0);
});

test.each([
  ['臥推', '卧推'], ['硬舉', '相扑硬拉'], ['相撲硬舉', '相扑硬拉'],
  ['二頭彎舉', '二头弯举'], ['啞鈴', '哑铃弯举'], ['槓鈴', '杠铃划船'],
  ['肩部觸控', '熊爬肩部触摸'],
])('search %s finds canonical %s without changing stored data', (query, name) => {
  const item = exercise({ name });
  expect(filterStudentExercises([item], 'all', query)).toEqual([item]);
  expect(item.name).toBe(name);
});

test('Traditional catalog names display locally while custom names remain verbatim', () => {
  setLocaleOverride('zh-Hant');
  expect(exerciseDisplayName(exercise({ name: '相扑硬拉' }))).toBe('相撲硬舉');
  expect(exerciseDisplayName(exercise({ name: '卧推' }))).toBe('臥推');
  expect(exerciseDisplayName(exercise({ name: '哑铃弯举', created_by_coach_id: 'coach' }))).toBe('哑铃弯举');
  expect(exerciseDisplayName({ name: '我的卧推', name_en: null })).toBe('我的卧推');
});

test('search works with Traditional backend names and Simplified input too', () => {
  const item = exercise({ name: '相撲硬舉' });
  expect(filterStudentExercises([item], 'all', '相扑硬拉')).toEqual([item]);
});

test('every generated catalog display name can find its original canonical exercise', () => {
  for (const [name, displayName] of Object.entries(translatedNames)) {
    expect(filterStudentExercises([exercise({ name })], 'all', displayName).map(item => item.name)).toEqual([name]);
  }
});

// Synthetic catalog rows; no coach plan content is used here.
test.each([
  ['滑輪下拉', '高位下拉'],
  ['窄臥推', '窄握卧推'], ['槓鈴窄臥推', '窄握卧推'],
  ['不碰胸暫停臥推', 'spoto 卧推'], ['不碰胸暫停1秒臥推', 'spoto 卧推'],
  ['不碰胸暫停1秒槓鈴臥推', 'spoto 卧推'], ['不碰胸臥推', 'spoto 卧推'],
  ['保護槓重啟深蹲', '架上(PIN)深蹲'], ['保護槓重啟槓鈴深蹲', '架上(PIN)深蹲'],
  ['彈力繩臥推', '弹力带卧推'], ['彈力繩槓鈴臥推', '弹力带卧推'],
  ['彈力繩相撲硬舉', '弹力带辅助相扑硬拉'],
  ['屈體划船', '杠铃划船'], ['槓鈴屈體划船', '杠铃划船'],
  ['槓鈴早安', '早安式'],
  ['後腳抬高蹲', '后脚抬高分腿蹲'], ['啞鈴後腳抬高蹲', '后脚抬高分腿蹲'],
  ['不碰胸暫停1秒槓鈴臥推（2cm)', 'spoto 卧推'],
  ['不碰胸暂停1秒杠铃卧推(2cm)', 'spoto 卧推'],
])('v2 alias %s finds %s without rewriting the catalog', (query, name) => {
  const item = exercise({ name });
  const before = { ...item };
  expect(filterStudentExercises([item], 'all', query)).toEqual([item]);
  expect(item).toEqual(before);
});

test('v2 search leaves ambiguous aliases unmatched and preserves display specifications', () => {
  const items = [exercise({ name: '绳索下压' }), exercise({ name: '上斜卧推' })];
  expect(filterStudentExercises(items, 'all', 'Cable三頭伸展')).toEqual([]);
  expect(filterStudentExercises(items, 'all', '槓鈴上斜窄臥推')).toEqual([]);
  const custom = exercise({ name: '不碰胸暫停臥推（3cm)', created_by_coach_id: 'synthetic-coach' });
  setLocaleOverride('zh-Hant');
  expect(exerciseDisplayName(custom)).toBe('不碰胸暫停臥推（3cm)');
  expect(filterStudentExercises([custom], 'all', '不碰胸暂停卧推')).toEqual([custom]);
  expect(filterStudentExercises([exercise({ name: '架上(PIN)深蹲' })], 'all', 'PIN')).toHaveLength(1);
});

test('v2 aliases extend search while retaining original name substrings', () => {
  const custom = exercise({ name: '不碰胸暫停臥推（3cm)', created_by_coach_id: 'synthetic-coach' });
  for (const query of ['暫停', '暂停', '不碰胸', 'spoto', '不碰胸暂停卧推']) {
    expect(filterStudentExercises([custom], 'all', query)).toEqual([custom]);
  }
  expect(custom.name).toBe('不碰胸暫停臥推（3cm)');
});
