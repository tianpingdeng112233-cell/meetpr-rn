const { expect, test } = require('@jest/globals');
const fs = require('node:fs');
const path = require('node:path');
const { convert, generate, overrides } = require('../../../scripts/generate-zh-hant.cjs');
const root = path.dirname(require.resolve('../../../package.json'));
const generated = require('../generated/zh-Hant.json');
const placeholders = text => (text.match(/\{\{?[^{}]+\}?\}|%@|%lld/g) ?? []).sort();

test('all Traditional copy has the same keys, plural structure and placeholders as Simplified', () => {
  const source = {};
  for (const name of ['Analytics', 'AppShell', 'ChatUI', 'CoachKit', 'CoreModels', 'DesignSystem', 'RepositoryContracts', 'StudentKit', 'RnExtras']) {
    Object.assign(source, JSON.parse(fs.readFileSync(path.join(root, `src/i18n/catalog/${name}.json`), 'utf8')));
  }
  expect(Object.keys(generated).sort()).toEqual(Object.keys(source).filter(key => source[key].zh !== undefined).sort());
  const check = (zh, hant) => {
    expect(typeof hant).toBe(typeof zh);
    if (typeof zh === 'string') expect(placeholders(hant)).toEqual(placeholders(zh));
    else {
      expect(Object.keys(hant).sort()).toEqual(Object.keys(zh).sort());
      Object.keys(zh).forEach(key => check(zh[key], hant[key]));
    }
  };
  Object.entries(source).forEach(([key, entry]) => { if (entry.zh !== undefined) check(entry.zh, generated[key]); });
});

test('generated Traditional artifacts contain zero Simplified-only characters', () => {
  const forbidden = new Set(fs.readFileSync(path.join(root, 'scripts/i18n/simplified-only.txt'), 'utf8').trim());
  expect(forbidden.size).toBeGreaterThan(1000);
  const hits = [];
  const artifacts = { ...generated,
    ...require('../generated/exercise-names-zh-Hant.json'),
    ...require('../generated/android-release-notes-zh-Hant.json'),
  };
  for (const [key, value] of Object.entries(artifacts)) {
    for (const char of JSON.stringify(value)) if (forbidden.has(char)) hits.push(`${key}: ${char}`);
  }
  expect(hits).toEqual([]);
});

test('every approved glossary override wins over OpenCC with longest phrases first', () => {
  for (const [source, expected] of overrides) {
    expect(convert(`測試：${source}。`)).toBe(`測試：${expected}。`);
  }
  expect(convert('邮箱')).toBe('電子郵件');
  expect(convert('请检查邮箱')).toBe('請檢查信箱');
  expect(convert('退出登录，视频反馈，退让组，个人记录，减载周')).toBe('登出，影片反饋，回退組，個人紀錄，減量週');
  expect(convert('相扑硬拉，传统硬拉，罗马尼亚硬拉，高杠/低杠')).toBe('相撲硬舉，傳統硬舉，羅馬尼亞硬舉，高槓/低槓');
  expect(convert('“微信” ‘MeetPR’ %@ %lld {name} {{count}} App Store TestFlight')).toBe('「微信」 『MeetPR』 %@ %lld {name} {{count}} App Store TestFlight');
});

test('committed generation is deterministic and current', () => {
  expect(() => generate(true)).not.toThrow();
});

test('v2.2 generated copy uses 發布 and 取得, including placeholders', () => {
  expect({
    publish: generated['coach.import.publishToStudent'],
    publishedTo: generated['coach.import.publishedTo'],
    getCode: generated['auth.getCode'],
    resend: generated['auth.resend'],
  }).toEqual({
    publish: '發布給學員',
    publishedTo: '已發布給 {student}',
    getCode: '取得驗證碼',
    resend: '重新取得',
  });
});

test('v2.1 converts equipment 杆 to 槓 while preserving lever 杠杆 as 槓桿', () => {
  // Synthetic copy exercises the converter shared by UI copy and exercise names.
  expect(convert('选择EZ杆，检查杠杆式器械：{name}')).toBe('選擇EZ槓，檢查槓桿式器械：{name}');
  expect(convert('EZ杆二头弯举')).toBe('EZ槓二頭彎舉');
  expect(convert('坐姿杠杆臂屈伸')).toBe('坐姿槓桿臂屈伸');
  expect(convert('T杆、六角杆、安全杆、地雷杆、专项杆、软杆/硬杆、低杆位、引体向上杆、过杆'))
    .toBe('T槓、六角槓、安全槓、地雷槓、專項槓、軟槓/硬槓、低槓位、引體向上槓、過槓');
});

test('v2.1 generated UI copy and exercise names use the approved bar terms', () => {
  expect(generated['coach.bind.equipment.deadliftBar']).toBe('硬舉專項槓(軟槓)');
  expect(generated['coach.bind.equipment.powerBar']).toBe('健力專項槓(硬槓)');
  expect(generated['coach.bind.equipment.pullupBar']).toBe('引體向上槓');
  const exercises = require('../generated/exercise-names-zh-Hant.json');
  expect(exercises['EZ杆二头弯举']).toBe('EZ槓二頭彎舉');
  expect(exercises['坐姿杠杆臂屈伸']).toBe('坐姿槓桿臂屈伸');
});


test('v2 generated copy uses 課表, 反饋 and reps-only 下數 / 下', () => {
  expect(convert('发布计划，训练计划，计划编辑器，视频反馈，反馈备注')).toBe('發布課表，課表，課表編輯器，影片反饋，反饋備註');
  expect(generated['coach.planning.common.reps']).toBe('下數');
  expect(generated['coach.planning.count.setsAndReps %lld %@ %lld']).toBe('%lld 組 %@ %lld 下');
  expect(generated['student.feedbackVideoPresentation.copy002']).toBe('{0}kg×{1}下');
  expect(generated['student.todayWorkoutTypes.copy004']).toBe('處方下數需在 1–12 下之間');
  expect(generated['student.accessory.useLast']).toBe('第 {0} 組填入上次數值');
  expect(generated['auth.rateLimited']).toBe('嘗試次數過多，請稍後重試');
  expect(generated['student.trainingHistoryView.copy018']).toBe('訓練次數');
  expect(generated['student.workoutCompletionFlowView.copy007']).toBe('連續第 {0} 次訓練');
  expect(convert('第2次，次日，每周3次')).toBe('第2次，次日，每週3次');
  // Input aliases must never rewrite display copy or catalog canonical names.
  expect(convert('滑轮下拉')).toBe('滑輪下拉');
});
