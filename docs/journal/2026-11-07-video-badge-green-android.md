# Android 组号视频徽标改绿

- 日期：2026-11-07。分支：`fix/set-video-badge-green`；起始 HEAD 与本地 `origin/main` 均为 `34bb09c044b52367313cdd5da8452f559c204929`。
- 首个命令在当前 worktree 创建并删除 `.write-probe`，退出码 0；初始工作区干净。已读根目录 CONTEXT、AGENTS、CLAUDE 与 Expo SDK 57 文档；仓内无 FOLLOWUPS.md。
- 按本次 T0 指令，只修改徽标颜色、既有测试及本 JOURNAL；未安装依赖，未 commit/push。

## 改动与范围核对

- `AccessoryLogCard.tsx` 组号单元格的 `row.hasVideo` 摄像机图标由 `colors.goldText` 改为 `colors.success`。
- 主题经 `useColors()` 解析 `src/design/tokens.ts`：success 浅色为 `#15803D`、深色为 `#5E9E78`，与完成勾选使用同一 token。
- 检索学员训练代码的 `hasVideo`、视频/摄像机图标和状态组件，未发现其他需要改绿的组号视频徽标。共享表格路径覆盖使用该徽标的自加记录与负重/自重行；`free_weight && !allowsRIR` 独立分支没有现成徽标，不新增。`WorkoutBody` 的组行/额外组使用 `SetVideoUploadIndicator`，送达状态本已使用 success。
- 失败/重试提示色、录视频引导行图标与视频状态判断均保持原样。
- `accessory-log-card.test.tsx` 在既有视频场景中新增一条断言：`Set 1 details` 内的 `video-outline` 颜色等于 `colors.success`。

## Red → Green 与检查

定向命令：`npm test -- --runInBand --watchman=false --testTimeout=30000 src/features/training/__tests__/accessory-log-card.test.tsx`。

- Red：只加断言，退出码 1；Expected `#15803D`，Received `#9A4A06`。`Test Suites: 1 failed, 1 total`；`Tests: 1 failed, 22 passed, 23 total`。日志：`/tmp/video-badge-red.log`。
- Green：改色后退出码 0；`Test Suites: 1 passed, 1 total`；`Tests: 23 passed, 23 total`。日志：`/tmp/video-badge-green.log`。
- 全量 `npm test -- --runInBand --watchman=false --testTimeout=30000`：退出码 0；`Test Suites: 208 passed, 208 total`；`Tests: 2205 passed, 2205 total`；Snapshots 0；107.476 s。日志：`/tmp/video-badge-jest.log`。
- `npx tsc --noEmit`：PASS，退出码 0。日志：`/tmp/video-badge-tsc.log`。
- `npm run lint`：PASS，退出码 0。日志：`/tmp/video-badge-lint.log`。
- `git diff --check`：PASS。自审 Standards：使用既有主题 token；Spec：一处改色、一条断言，无范围外改动。

## 验证例外

尝试通过 `adb devices -l` 访问 Android 模拟器时，ADB 无法启动：`could not install *smartsocket* listener: Operation not permitted`，随后 `adb: failed to check server version: cannot connect to daemon`。因此本次未完成模拟器目视验证或截图，不将测试通过表述为视觉验收通过。
