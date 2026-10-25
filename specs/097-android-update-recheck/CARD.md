# 卡 097 · 安卓 CN：切回前台重新检查更新 + 设置页显示版本号

先读仓根 `CONTEXT.md`（有则读）、`AGENTS.md`。级别 T1，2026-10-25 David 拍板（选 A + 显示版本号）。

## 背景
0.1.0(4) 发布后，内测学员打开 App 没看到更新提示。原因：`src/features/updates/AndroidUpdateSession.tsx` 每个进程只查一次（`completed` ref），只在冷启动时查；App 常驻后台、切回前台不会再查。另外 App 内没有任何地方显示版本号，系统「应用信息」只显示 versionName `0.1.0`，从 (1) 到 (4) 都一样，无法排查。

## 要做
1. **切回前台重新检查**：App 从后台回到 `active` 时，如果距上次**成功发出的检查**已超过 6 小时，就再查一次。冷启动行为不变（现有启用条件：bootstrapped + 隐私说明已确认）。
   - 同一个 versionCode 在本进程内已经弹过（不论点了「稍后再说」还是「下载」）就不再弹；出现更高的 versionCode 才再弹。
   - 检查失败、超时不影响使用（保持现有吞错语义），也不算作「已检查」——下次切回前台照常再试。
   - 上次检查时间只放内存即可（进程重启本来就会冷启动检查），不落盘。
2. **设置页显示版本号**：`src/features/settings/SettingsPage.tsx` 列表最底部一行居中小号灰字：`版本 0.1.0 (4)`（versionName + nativeBuildVersion），英文 `Version 0.1.0 (4)`，繁体走 094 生成流程。读不到时不显示该行。不加点击行为。
3. 两件只在安卓生效；iOS 不在本仓。

## 文件范围
`src/features/updates/*`、`src/features/settings/SettingsPage.tsx`、i18n 文案、对应 `__tests__`。不改 `latest.json` 结构、不改下载流程。

## 测试 seam（先红后绿）
- `AndroidUpdateSession` 组件测试：mock `AppState` 与 `checkForAndroidUpdate`：冷启动查一次；6 小时内切回前台不查；超过 6 小时切回前台再查；已弹过的 versionCode 不重复弹、更高 versionCode 会弹；上次失败后切回前台会重试。用 fake timers 控制时间。
- `SettingsPage` 一条：显示 `版本 0.1.0 (4)`；读不到 build 号时不显示。

## 验收（Opus 收货逐项过）
1. 上述测试全绿；全量 jest、tsc、lint 绿。
2. 模拟器（Opus 做）：冷启动弹更新提示 → 点「稍后再说」→ 切到后台 → 把系统时间往后拨 7 小时 → 切回前台，同一版本不再弹；把假的 latest.json 换成更高的 versionCode → 再切回前台会弹。
3. 设置页底部能看到版本号。

## 交付
JOURNAL 写 `docs/journal/2026-10-25-097-A.md`。不 commit、不 push。
