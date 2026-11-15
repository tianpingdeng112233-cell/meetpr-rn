# 安卓训练页撤销完成固定底栏

- 日期：2026-11-15；任务：David 的 T0/T1 UI 修复卡。
- Worktree：`/Users/david/Projects/apps/meetpr-rn-wt-undo-dock`。
- 分支：`fix/undo-completion-dock`；开工 HEAD / 本地 `origin/main` 均为 `7a707adeb733e85a2783b3a551c5470862cb7414`，工作区干净。
- 首先在指定根目录创建并删除临时文件，写权限验证通过；随后先读根 `CONTEXT.md`。所有工作与写入限定此 worktree，未 commit、push 或运行 adb。

## 改动

- `TodayWorkoutView.tsx`：已完成日也显示现有 `workout-completion-dock`，共享绝对定位、背景、上边线、内边距、`onLayout` 测高和滚动底部留白。
- 底栏先显示原 `DayCompletionBanner`，点击仍进入回顾；`dayState.canUndo` 为真时，其下显示居中的 MaterialCommunityIcons `undo-variant` 和原 `copy023` 文案，12 号、`colors.textMuted`，整行高度至少 `spacing.minimumHitTarget`。按钮保留 role / label，pending 时禁用并向无障碍暴露禁用状态，调用原 `completeDay(true)`。
- 删除滚动内容顶部的完成文字与撤销 link、底部的横幅；`training.completedDay` testID 迁到底栏内。未完成日仍显示原视频/同步/长按完成控件，与完成态互斥。
- `WorkoutBody.tsx` 不改：当前 `TodayWorkoutView` 直接渲染 `AllDayBody`，二者均不引用 `WorkoutBody`；旧完成卡的 undo 不在当前页渲染路径内。
- 不改导航、tab、i18n key、撤销规则、网络接口、存储或旧组件。除本 JOURNAL 外只改 training 下的一个实现文件与两个既有测试文件。

## 验证

依赖缺失，先执行 `npm ci --cache .npm-cache`；网络连接被沙箱拒绝：`connect EPERM 127.0.0.1:18083`。将本机已有 npm 缓存只读复制到本 worktree 后，执行 `npm ci --offline --cache .npm-cache --no-audit --no-fund` 成功，安装 1100 个包并成功应用既有 react-native-video patch；未更改 package / lock 文件。

测试命令统一使用本 worktree 下的 npm 缓存；Jest 使用 `--runInBand --watchman=false`，临时目录也指向本 worktree，避免沙箱外写入和 Watchman。

| 阶段 | 命令 | 结果 |
| --- | --- | --- |
| Red，实现前 | `npx jest src/features/training/__tests__/completion-entry.test.tsx src/features/training/__tests__/all-day-view.test.tsx --runInBand --watchman=false` | 2 suites，5 failed / 73 passed；新增完成态 dock 断言收到 undefined，失败原因符合预期 |
| Green，实现后 | 同上 | 2 suites，78 / 78 passed |
| training 回归（含后补 pending 乐观撤销用例） | `npx jest src/features/training --runInBand --watchman=false` | 82 suites，921 / 921 passed，exit 0 |
| 类型检查（含后补用例） | `npx tsc --noEmit` | 通过，exit 0 |
| 全仓回归 | `npx jest --runInBand --watchman=false` | 219 suites，2349 / 2349 passed，exit 0；最终无失败，无新增失败 |
| 改动文件 lint | `npx eslint src/features/training/TodayWorkoutView.tsx src/features/training/__tests__/completion-entry.test.tsx src/features/training/__tests__/all-day-view.test.tsx` | 通过，exit 0 |
| diff / 布局静态扫描 | `git diff --check`；Impeccable `detect --json --scope layout src/features/training/TodayWorkoutView.tsx` | 通过；检测结果 `[]` |

测试覆盖：横幅与撤销都在底栏、滚动内无重复入口/完成文字、已完成/未完成互斥、8 天后只显示横幅、撤销 DELETE 后恢复长按入口、pending 期间乐观恢复未完成态且只有一次 DELETE、实测底栏高度变化更新滚动 padding；原回顾打开与保存测试保持通过。

补充用例校正：第一次 training 全套为 81 suites passed / 1 failed（920 passed / 1 failed）。失败的是本次后补用例误认为 pending 时撤销行持续显示；`useDayCompletion.onMutate` 原本就会乐观清除 `completed_at`，使该行消失。按原行为修正测试，未改 mutation 或训练页实现；这不是基线既有失败。按钮在仍处于完成态的 pending 渲染中保留 `disabled` 和无障碍禁用属性，随后按既有缓存更新切回长按控件。

## 独立审查

按 `review-loop` 完成一轮独立只读双轴审查，范围为上述三个 training 文件相对 HEAD 的未提交 diff，需求源为本次任务卡。

- Standards：无发现；复用设计 token、现有图标库与 FeedbackPressable，无新增依赖或无关重构。
- Spec：无发现；底栏状态、测高留白、撤销条件/交互与旧 WorkoutBody 路径判断均符合任务卡。pending 用例校正后定向补审通过，实现未发生变化。
- 仓内缺 `docs/agents/issue-tracker.md`，未声称执行依赖 tracker 的 Matt code-review 流程；已告知可用 `$setup-matt-pocock-skills` 补齐。本地 review-loop 直接使用任务卡，不依赖 tracker。

## 未验证 / 收货交接

- 按任务要求未运行 adb、构建安装或模拟器截图；收货方需在 Android AVD `meetpr` 亲看完成/不可撤销/未完成三态、深浅色与大字体，验证最后一个动作可滚到无遮挡位置并截图。单测证明 padding 随测高更新，不代替视觉验收。
- 未做真实后端联调、CI、发包；未宣称完成视觉收货。`PARITY.md` 留收货方在模拟器验收后更新，本轮按任务限定范围不改。
- 已按仓规阅读 [Expo SDK 57 文档](https://docs.expo.dev/versions/v57.0.0/)，未引入新 Expo API。

## 实现 diff（完整，零上下文）

```diff
diff --git a/src/features/training/TodayWorkoutView.tsx b/src/features/training/TodayWorkoutView.tsx
index 6dfa29a..adc25df 100644
--- a/src/features/training/TodayWorkoutView.tsx
+++ b/src/features/training/TodayWorkoutView.tsx
@@ -26,0 +27 @@ import { useQueryClient } from '@tanstack/react-query';
+import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
@@ -52 +53 @@ import { useSessionStore } from '@/api/session';
-import { AppButton, Card, Screen, font, radius, spacing, typography, useColors, type Colors } from '@/design';
+import { Card, Screen, font, radius, spacing, typography, useColors, type Colors } from '@/design';
@@ -781 +782 @@ export function TodayWorkoutView() {
-  const stickyCompletion = (editable || waitingForVideos) && (state.kind === 'loaded');
+  const stickyCompletion = (editable || waitingForVideos || (!showEmpty && dayState?.kind === 'completed')) && (state.kind === 'loaded');
@@ -830 +830,0 @@ export function TodayWorkoutView() {
-            {dayState?.kind === 'completed' ? <View testID="training.completedDay"><Text style={styles.emptySub}>{t('student.trainingWeekStrip.completed')}</Text>{dayState.canUndo ? <AppButton variant="link" label={t('student.todayWorkoutScreen.copy023')} disabled={undoCompletion.isPending} onPress={() => void completeDay(true)} /> : null}</View> : null}
@@ -850,6 +849,0 @@ export function TodayWorkoutView() {
-            {dayState?.kind === 'completed' ? (
-              <DayCompletionBanner
-                count={realDrafts.length}
-                onPress={() => setCompletionPhase('review')}
-              />
-            ) : null}
@@ -864 +858,13 @@ export function TodayWorkoutView() {
-        <VideoCompletionControl studentId={studentId} videos={completionVideos} waiting={waitingForVideos}
+        {dayState?.kind === 'completed' ? <View testID="training.completedDay">
+          <DayCompletionBanner count={realDrafts.length} onPress={() => setCompletionPhase('review')} />
+          {dayState.canUndo ? <Pressable
+            accessibilityRole="button"
+            accessibilityLabel={t('student.todayWorkoutScreen.copy023')}
+            accessibilityState={{ disabled: undoCompletion.isPending }}
+            disabled={undoCompletion.isPending}
+            onPress={() => void completeDay(true)}
+            style={styles.undoCompletion}>
+            <MaterialCommunityIcons name="undo-variant" size={spacing.point14} color={colors.textMuted} />
+            <Text style={styles.undoCompletionText}>{t('student.todayWorkoutScreen.copy023')}</Text>
+          </Pressable> : null}
+        </View> : <VideoCompletionControl studentId={studentId} videos={completionVideos} waiting={waitingForVideos}
@@ -867 +873 @@ export function TodayWorkoutView() {
-        </VideoCompletionControl>
+        </VideoCompletionControl>}
@@ -929,0 +936,2 @@ const createStyles = (colors: Colors) =>
+    undoCompletion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: spacing.minimumHitTarget },
+    undoCompletionText: { ...font.body(12), color: colors.textMuted },
```

原始运行日志仅保留在本 worktree 的 `node_modules/.cache/undo-dock/`（git ignored）；安装临时 `.npm-cache` 已清理。

## 收货（2026-11-15，Opus）

演示包（applicationId com.meetpr.app.undodock）装 meetpr-cn-accept@5574：昨天已完成日底栏=横幅+居中「↺ 撤销完成」；11/8 超窗口只剩横幅；滚到底最后一个动作不被挡。截图见 evidence/undo-dock/。
