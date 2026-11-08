# 103 — 安卓学员聊天反馈卡竖拍封面

## 范围与基线

- 工作树：`meetpr-rn-wt-103b`，分支 `feat/103b-portrait-cover`，起点 `96c53d6`，开工工作区干净。
- 唯一验收依据：[SPEC §3 与验收 9–11](../../specs/103-chat-timestamps-video-poster/SPEC.md)。本卡只改 `StudentFeedbackChatCard` 大封面，未改导航、44dp `ChatSetCard`、依赖或后端。
- 已读根 `AGENTS.md`、`CONTEXT.md`、`CLAUDE.md`、`PLAN.md` 及工程规约；仓内未发现 `FOLLOWUPS.md`。
- 实装前核对 [Expo v57](https://docs.expo.dev/versions/v57.0.0/) 与 [Image onLoad/source 宽高接口](https://docs.expo.dev/versions/v57.0.0/sdk/image/#imageloadeventdata)。
- 本树无依赖目录，`node_modules` 链接到同机 `meetpr-rn-wt-106/node_modules`；两树 `package-lock.json` SHA-1 均为 `e75a82945776b7af37bb9016e53c7a8c6b8c2aea`。未修改依赖目录及锁文件。
- 按用户指令不 commit/push，不运行 adb；设备验收由 Opus 补。

## 实现

- `student-timeline.ts` 新增纯函数 `feedbackCoverSize(width, height, availableWidth)`：有效竖图返回高 240、宽 `max(135, 240 × width / height)`；横图、正方图、缺失或无效尺寸返回可用宽度 × 150。
- `ChatVideoCover` 在图片成功加载时向父级传宽高，失败时传 null；保留 `cover`、图片缓存、居中播放钮及右下时长。小缩略图调用方未接入尺寸变化。
- 反馈卡测量自身内宽；未知比例先横框，加载成功后按函数尺寸左对齐。竖框动作标签 `numberOfLines=1`、尾部省略、限制标签宽度。
- 成功图片尺寸按视频 id 存在模块内存 Map，跨滚动卸载、退出重进和签名 URL 续期复用。当前请求结果同时绑定视频 id 与 URL，空首图或失败仍回落横框；缓存不落盘。

## 先红后绿

原始日志在仓根 `scratch/103b/`：

| 行为 | 红测 | 绿测 |
| --- | --- | --- |
| 竖图 240dp 与最小宽 135dp | `size-portrait-red.log`：新增函数缺失，1 failed | `size-portrait-green.log`：12 passed |
| 横图、正方图、缺失及无效尺寸横框 | `size-fallback-red.log`：6 failed | `size-fallback-green.log`：18 passed |
| 页面 onLoad 后切竖框、标签截断 | `screen-portrait-red.log`：实际仍高 150，1 failed | `screen-portrait-green.log`：42 passed |
| 卸载重进保留比例、同视频新签名复用 | `screen-cache-red.log`：重进实际仍高 150，1 failed | `screen-cache-green.log`：42 passed |

页面同一用例另覆盖已缓存竖图的 403 失败、移除 poster 后回落横框。组件测试只证明 props/状态，不冒充 native 布局截图。

## 检查与独立审查

- `npx tsc --noEmit`：exit 0，`scratch/103b/tsc.log`。
- `npx expo lint`：exit 0，`scratch/103b/lint.log`。
- `npx jest --runInBand --watchman=false`：208 suites / 2240 tests 全绿，47.141 秒，exit 0；`scratch/103b/jest-full.log`。
- `git diff --check`：通过。
- 按 review-loop 完成一轮独立只读审查：Standards 0 findings；Spec 0 findings。两轴均无未决代码问题，无需返修；仅属代码自审，不替代 Opus 验收。
- 仓内缺 `docs/agents/issue-tracker.md`，已告知可用 `$setup-matt-pocock-skills` 配置；本次使用不依赖 tracker 的本地双轴入口。
- 主代理已读全部代码与测试 diff；完整交付 diff（含本 journal）保存在 `scratch/103b/changes.patch`。

## 验收交接（仅 SPEC 9–11）

| 条目 | 自动验证证据 | 留给 Opus 的设备验收 |
| --- | --- | --- |
| 9. 竖拍竖框、横拍横框、画面完整 | 尺寸四类纯函数测试与页面 onLoad 240dp 断言 | 在 `meetpr` AVD 检查实际竖横视频画面与裁切 |
| 10. 长标签单行、不溢出、播放钮可见 | 页面断言 `numberOfLines=1` 与 `maxWidth=100%`；播放钮现有暗底与位置保持 | 深浅色、放大字体、长动作名实际截断和播放钮可见性 |
| 11. 回滚、重进不再二次跳动 | 页面卸载/重进后未再次 onLoad 已为 240dp；新签名 URL 同样复用 | 实机来回滚动与退出重进，观察无二次尺寸跳动 |

未宣布上述设备验收通过；PARITY 等正典台账留 Opus 收货后定稿。

## 2026-11-08 返修 R1：封面动作标签白字

- 来源：David 转述 Opus 在 AVD `meetpr` 的设备验收：竖框/横框、截断、比例记忆均通过；唯一退回项为动作标签在浅色主题下深色字叠暗底，首图加载后难以辨认。该设备结果由验收方提供，本轮未自行运行 adb。
- 仅将 `StudentFeedbackChatCard` 中 `videoLabel(video)` 的文字颜色从 `colors.textPrimary` 改为 `colors.ctaTopHighlight`；该 token 的 light/dark 均为 `#FFFFFF`，与播放钮、时长角标一致。`colors.modalShadow` 暗底及其余样式保持原样。
- 在现有封面页面用例追加颜色断言 `toBe('#FFFFFF')`。先红：`scratch/103b/r1-label-red.log`，1 failed / 41 passed，实际 `#111827`，预期 `#FFFFFF`，exit 1；改色后绿：`scratch/103b/r1-jest-green.log`，页面与尺寸相关 Jest 共 2 suites / 60 tests 通过，exit 0。
- `npx tsc --noEmit`、`npx expo lint` 均 exit 0，日志分别为 `scratch/103b/r1-tsc.log`、`scratch/103b/r1-lint.log`；`git diff --check` 通过。
- 已对照返修前快照自审：本轮源码仅一处颜色替换、测试仅一条断言，符合定向 T0 样式返修范围。未重新运行独立双轴审查；原轮全量 Jest 结果不冒充本轮全量结果。
- 本轮未 commit/push。改后标签可读性的设备复验仍由 Opus 完成。
