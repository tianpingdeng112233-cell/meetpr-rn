#!/usr/bin/env node
// Development only: OpenCC s2twp + the approved glossary. No converter ships in the app.
const fs = require('node:fs');
const path = require('node:path');
const OpenCC = require('opencc-js');
const root = path.resolve(__dirname, '..');
const s2twp = OpenCC.Converter({ from: 'cn', to: 'twp' });
const glossary = fs.readFileSync(path.join(root, 'specs/094-zh-hant/GLOSSARY-zh-Hant.md'), 'utf8');
const [copyGlossary, aliasGlossary] = glossary.split('## 台湾动作写法别名');
const repsKeys = new Set(require('./i18n/reps-keys.json'));
const overrides = copyGlossary.split('\n').filter(line => line.startsWith('| ')).flatMap(line => {
  const [, source, target] = line.split('|').map(cell => cell.trim());
  if (['简体源', 'RPE / RIR / e1RM / PR', '次数（reps 义）', 'N 次（reps 单位）'].includes(source)) return [];
  if (source.startsWith('周（')) return [['周', '週']];
  if (source === '邮箱') return [['邮箱', '信箱']];
  if (source === '“ ”') return [['“', '「'], ['”', '」']];
  if (source === '‘ ’') return [['‘', '『'], ['’', '』']];
  // Parenthesized glossary notes describe the term; they are not source text.
  const sources = source.replace(/（.*）$/, '').split(' / ');
  const targets = target.split(' / ');
  return sources.map((word, index) => [word, targets[index] ?? targets[0]]);
});
// The glossary's compound example takes precedence over OpenCC's 釋出.
overrides.push(['发布计划', '發布課表']);
const phraseOverrides = require('./i18n/phrase-overrides-zh-Hant.json');
const protectedWords = ['MeetPR', '微信', 'App Store', 'TestFlight'];
const words = new Map([...overrides, ...protectedWords.map(word => [word, word])]);
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tokens = new RegExp(`\\{\\{?[^{}]+\\}?\\}|%@|%lld|${[...words.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')}`, 'g');
const placeholders = text => text.match(/\{\{?[^{}]+\}?\}|%@|%lld/g) ?? [];
function convert(text, key) {
  const saved = [];
  const source = repsKeys.has(key) ? text.replace(/次数/g, '下數').replace(/次/g, '下') : text;
  const scoped = phraseOverrides[key];
  const copyWords = scoped ? new Map([...words, ...Object.entries(scoped)]) : words;
  const pattern = scoped ? new RegExp(`${Object.keys(scoped).map(escape).join('|')}|${tokens.source}`, 'g') : tokens;
  const marked = source.replace(pattern, token => {
    saved.push(token === '邮箱' && /^(邮箱|邮箱地址)$/.test(text) ? '電子郵件' : copyWords.get(token) ?? token);
    return `\uE000${saved.length - 1}\uE001`;
  });
  const result = s2twp(marked).replace(/\uE000(\d+)\uE001/g, (_, index) => saved[Number(index)]);
  if (JSON.stringify(placeholders(text)) !== JSON.stringify(placeholders(result))) throw new Error(`Placeholders changed: ${text}`);
  return result;
}
function translate(value, key) {
  return typeof value === 'string' ? convert(value, key) : Object.fromEntries(Object.entries(value).map(([form, copy]) => [form, translate(copy, key)]));
}
function generate(check = false) {
  const catalog = {};
  // Match runtime precedence: RnExtras overrides the mirrored iOS catalogs.
  const names = ['Analytics', 'AppShell', 'ChatUI', 'CoachKit', 'CoreModels', 'DesignSystem', 'RepositoryContracts', 'StudentKit', 'RnExtras'];
  for (const name of names) {
    const entries = JSON.parse(fs.readFileSync(path.join(root, `src/i18n/catalog/${name}.json`), 'utf8'));
    for (const [key, entry] of Object.entries(entries)) if (entry.zh !== undefined) catalog[key] = translate(entry.zh, key);
  }
  // Conservative shared character set: source-only Han characters, excluding
  // every valid Traditional phrase/variant output (e.g. 皇后 and 公里).
  const pairs = dictionary => dictionary.split('|').map(entry => entry.split(' '));
  const traditionalCharacters = new Set([
    ...OpenCC.Locale.from.cn.flatMap(dictionary => pairs(dictionary).flatMap(([, ...targets]) => [...targets.join('')])),
    ...OpenCC.Locale.to.twp.flatMap(dictionary => pairs(dictionary).flatMap(([, ...targets]) => [...targets.join('')])),
  ]);
  const simplified = pairs(OpenCC.Locale.from.cn[0]).map(([source]) => source)
    .filter(source => [...source].length === 1 && !traditionalCharacters.has(source)).sort().join('') + '\n';
  const charFile = path.join(root, 'scripts/i18n/simplified-only.txt');
  if (check) {
    if (fs.readFileSync(charFile, 'utf8') !== simplified) throw new Error('Stale shared Simplified-only character set');
  } else fs.writeFileSync(charFile, simplified);
  const exerciseNames = JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n/exercise-names-zh.json'), 'utf8'));
  const exercises = Object.fromEntries(exerciseNames.map(name => [name, convert(name)]));
  // Ship only generated lookup data, never OpenCC or its conversion engine.
  const t2s = OpenCC.Converter({ from: 'twp', to: 'cn' });
  const search = Object.fromEntries(pairs(OpenCC.Locale.to.cn[0]).map(([traditional]) => [traditional, t2s(traditional)]));
  for (const dictionary of OpenCC.Locale.to.twp) {
    for (const [source, target] of pairs(dictionary)) search[target] = t2s(source);
  }
  for (const [source, target] of overrides) if (source !== target) search[target] = source;
  const s2hk = OpenCC.Converter({ from: 'cn', to: 'hk' });
  for (const source of exerciseNames) {
    for (const target of [convert(source), s2hk(source)]) {
      for (const char of target) if (t2s(char) !== char && !search[char]) search[char] = t2s(char);
    }
  }
  // 杆 and 杠 share 槓 in display copy. Fold all search targets to one spelling
  // so both canonical names and compound translations (including 槓桿) match.
  search['杆'] = '杠';
  for (const target of Object.keys(search)) search[target] = search[target].replace(/杆/g, '杠');
  const searchPattern = new RegExp(Object.keys(search).sort((a, b) => b.length - a.length).map(escape).join('|'), 'g');
  const normalizeAlias = name => name.toLowerCase().replace(searchPattern, word => search[word]);
  const aliases = Object.fromEntries(aliasGlossary.split('\n').filter(line => line.startsWith('| ')).flatMap(line => {
    const [, source, canonical] = line.split('|').map(cell => cell.trim());
    if (canonical === 'canonical') return [];
    return source.split(' / ').map(alias => [normalizeAlias(alias), normalizeAlias(canonical)]);
  }));
  const notes = JSON.parse(fs.readFileSync(path.join(root, 'scripts/i18n/android-release-notes-zh.json'), 'utf8'));
  const releaseNotes = Object.fromEntries(notes.map(copy => [copy, convert(copy)]));
  for (const [name, value] of Object.entries({ 'zh-Hant': catalog, 'exercise-names-zh-Hant': exercises, 'search-zh': search, 'exercise-aliases-zh': aliases, 'android-release-notes-zh-Hant': releaseNotes })) {
    const file = path.join(root, `src/i18n/generated/${name}.json`);
    const content = `${JSON.stringify(value, null, 2)}\n`;
    if (check) {
      if (fs.readFileSync(file, 'utf8') !== content) throw new Error(`Stale ${name}: run npm run i18n:zh-Hant`);
    } else fs.writeFileSync(file, content);
  }
}
if (require.main === module) generate(process.argv.includes('--check'));
module.exports = { convert, generate, overrides };
