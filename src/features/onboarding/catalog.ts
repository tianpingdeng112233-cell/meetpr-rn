/** Wire tokens from peripheral-screens.md Appendix B; labels are display-only. */
export const UNIT_PREFERENCES = ['kg', 'lb'] as const;
export const GENDERS = ['male', 'female', 'other'] as const;
export const SQUAT_STANCES = ['high_bar', 'low_bar'] as const;
export const DEADLIFT_STYLES = ['conventional', 'sumo', 'both'] as const;
export const BENCH_GRIPS = ['narrow', 'standard', 'wide'] as const;
export const TRAINING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const GYM_TIERS = ['home_with_rack', 'commercial', 'professional'] as const;
export const MUSCLE_GROUPS = [
  'quad', 'hamstring', 'glute', 'back', 'chest', 'shoulder', 'triceps', 'biceps', 'core', 'calf',
] as const;
export const INJURY_AREAS = [
  'shoulder', 'elbow', 'wrist', 'lower_back', 'hip', 'knee', 'ankle', 'other',
] as const;

export type GymTier = (typeof GYM_TIERS)[number];
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type InjuryArea = (typeof INJURY_AREAS)[number];

export const UNIT_LABELS = { kg: '公斤 · 厘米', lb: '磅 · 英寸' } as const;
export const GENDER_LABELS = { male: '男', female: '女', other: '其他' } as const;
export const SQUAT_STANCE_LABELS = { high_bar: '高杠', low_bar: '低杠' } as const;
export const DEADLIFT_STYLE_LABELS = { conventional: '传统', sumo: '相扑', both: '两种都练' } as const;
export const BENCH_GRIP_LABELS = { narrow: '窄', standard: '标准', wide: '宽' } as const;
export const TRAINING_DAY_LABELS = {
  mon: '周一', tue: '周二', wed: '周三', thu: '周四', fri: '周五', sat: '周六', sun: '周日',
} as const;
export const GYM_TIER_LABELS = {
  home_with_rack: '家庭(含深蹲架)', commercial: '商业健身房', professional: '专业力量馆',
} as const;
export const GYM_TIER_SUBTITLES = {
  home_with_rack: '家里有深蹲架和杠铃,自己安排训练',
  commercial: '连锁 / 综合健身房 — 有架有杠,力量举专项器械通常没有',
  professional: '力量举专项馆 — 专项杆、微增片、专项机齐全,可做全部变式',
} as const;
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  quad: '股四头', hamstring: '腘绳肌', glute: '臀', back: '背(含竖脊肌)', chest: '胸',
  shoulder: '肩', triceps: '肱三头', biceps: '肱二头', core: '核心', calf: '小腿',
};
export const INJURY_AREA_LABELS: Record<InjuryArea, string> = {
  shoulder: '肩', elbow: '肘', wrist: '腕', lower_back: '腰', hip: '髋', knee: '膝', ankle: '踝', other: '其他',
};

export const EQUIPMENT_GROUPS = ['basics', 'dumbbellMax', 'machines', 'powerlifting'] as const;
export const EQUIPMENT_GROUP_LABELS = {
  basics: '基础', dumbbellMax: '哑铃最大重量', machines: '固定器械', powerlifting: '力量举专项',
} as const;
const ALL_TIERS: readonly GymTier[] = GYM_TIERS;
const HOME: readonly GymTier[] = ['home_with_rack'];
const COMMERCIAL: readonly GymTier[] = ['commercial'];
const PROFESSIONAL: readonly GymTier[] = ['professional'];
const GYMS: readonly GymTier[] = ['commercial', 'professional'];
const NO_PREFILL: readonly GymTier[] = [];

export const EQUIPMENT_CATALOG = [
  { token: 'barbell_dumbbell', group: 'basics', tiers: ALL_TIERS },
  { token: 'squat_bench_rack', group: 'basics', tiers: ALL_TIERS },
  { token: 'pullup_bar', group: 'basics', tiers: ALL_TIERS },
  { token: 'db_max_20', group: 'dumbbellMax', tiers: HOME },
  { token: 'db_max_40', group: 'dumbbellMax', tiers: GYMS },
  { token: 'db_max_40_plus', group: 'dumbbellMax', tiers: NO_PREFILL },
  { token: 'smith_machine', group: 'machines', tiers: COMMERCIAL },
  { token: 'cable_crossover', group: 'machines', tiers: GYMS },
  { token: 'lat_pulldown', group: 'machines', tiers: GYMS },
  { token: 'leg_press_machine', group: 'machines', tiers: GYMS },
  { token: 'leg_curl_extension', group: 'machines', tiers: GYMS },
  { token: 'seated_row', group: 'machines', tiers: GYMS },
  { token: 'landmine', group: 'machines', tiers: GYMS },
  { token: 'seal_row', group: 'machines', tiers: PROFESSIONAL },
  { token: 'hack_squat', group: 'machines', tiers: PROFESSIONAL },
  { token: 'power_bar_stiff', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'deadlift_bar', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'safety_bar', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'fractional_plates', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'lifting_platform', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'rack_pins_blocks', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'chains_bands', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'ghr', group: 'powerlifting', tiers: PROFESSIONAL },
  { token: 'belt_squat', group: 'powerlifting', tiers: PROFESSIONAL },
] as const;
export type EquipmentToken = (typeof EQUIPMENT_CATALOG)[number]['token'];
export const EQUIPMENT_TOKENS = EQUIPMENT_CATALOG.map(({ token }) => token);
export const EQUIPMENT_LABELS: Record<EquipmentToken, string> = {
  barbell_dumbbell: '杠铃 + 哑铃',
  squat_bench_rack: '深蹲架 + 卧推架',
  pullup_bar: '引体向上杆',
  db_max_20: '哑铃 ≤20kg',
  db_max_40: '哑铃 ≤40kg',
  db_max_40_plus: '哑铃 >40kg',
  smith_machine: '史密斯架',
  cable_crossover: '龙门架(大飞鸟)',
  lat_pulldown: '高位下拉',
  leg_press_machine: '倒蹬机 / 腿举机',
  leg_curl_extension: '腿弯举 / 腿屈伸',
  seated_row: '坐姿划船',
  landmine: '地雷架(含 T 杆划船)',
  seal_row: '海豹划船凳',
  hack_squat: '哈克深蹲机',
  power_bar_stiff: '力量举专项杆(硬杆)',
  deadlift_bar: '硬拉专项杆(软杆)',
  safety_bar: '特种杠(SSB / 六角等)',
  fractional_plates: '微增片(0.25kg 起)',
  lifting_platform: '举重台 / 硬拉台',
  rack_pins_blocks: '架上销 / 垫块',
  chains_bands: '链条 / 弹力带(变阻)',
  ghr: 'GHR(臀腿举)',
  belt_squat: '腰带深蹲机',
};

export function prefillEquipment(tier: GymTier): EquipmentToken[] {
  return EQUIPMENT_CATALOG.filter((item) => item.tiers.includes(tier)).map(({ token }) => token);
}

export function equipmentLabel(token: string): string {
  return Object.hasOwn(EQUIPMENT_LABELS, token) ? EQUIPMENT_LABELS[token as EquipmentToken] : token;
}
