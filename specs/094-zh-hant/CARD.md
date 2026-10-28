# 卡 094-Android — RN 安卓：繁体中文（zh-Hant）

先读仓根 `CONTEXT.md`、`AGENTS.md`，再读同目录 `SPEC.md`（共用规格）与 `GLOSSARY-zh-Hant.md`。

## 目标
系统语言为繁体中文时，安卓 App 全部显示台湾用语繁体；简体、英文零变化。

## 文件范围（预期）
- `src/i18n/index.ts`：`Locale` 扩为 `'en' | 'zh' | 'zh-Hant'`。判定：`getLocales()[0]` 的 `languageTag` 或 `languageScriptCode === 'Hant'`、或 region ∈ {TW, HK, MO} 且语言 zh → `zh-Hant`；其他 zh → `zh`；其余 en。回退链：`zh-Hant → zh → key`。
- `src/i18n/catalog/*.json`：每条加 `zh-Hant`（或另建并行繁体目录，择一，保持 `t()` 取值简单），由开发期脚本从 `zh` 生成（OpenCC s2twp + 覆写表），可重跑幂等，产物入仓；占位符与复数结构一致。
- `src/features/onboarding/catalog.ts` 及动作库展示/搜索：繁体界面显示繁体名；搜索输入繁→简规范化后再匹配；存储不变。
- 速记/中文解析（若有）同样先繁→简规范化。
- API 客户端：所有请求带 `Accept-Language: zh-Hans|zh-Hant|en`。
- 安卓通知渠道名、休息倒计时通知文案、版本更新提醒文案也走繁体。
- 日期/星期：繁体显示「週」。

## 约束
- 不改界面结构、导航、tab；不加语言设置项。
- 用户自写内容原样。
- 不改版本号、不出包。

## 验收（安卓相关）
SPEC 验收清单 1–6（通知部分）、8–10 条中安卓部分。

## 测试 seam（先红后绿）
1. `src/i18n/__tests__/t.test.ts`：`zh-Hant-TW`、`zh-HK`、`zh-Hant` → 繁体取值；`zh-CN` → 简体不变；缺繁体回退简体。
2. 与 `no-literal-zh.test.ts` 同型新增：所有 catalog 的 zh-Hant 值无简体特有字、占位符与 zh 一致、覆写表每条生效。
3. 动作搜索现有测试加繁体输入用例。

## 交付
- 分支 `feat/094-zh-hant`（本 worktree），原子 commit；不 push、不开 PR。
- 全量 `npm test`、lint、typecheck 绿，记入 `docs/CODEX-JOURNAL.md` 末尾（改动、命令、结果、偏离与疑问）。
