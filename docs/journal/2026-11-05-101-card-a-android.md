# 101 Card A Android — 实装记录（2026-11-05）

**交付状态：代码与自测完成，等待 Opus 宿主验收；未 commit/push。最终 200 suites / 2078 tests 全绿，tsc/lint exit 0。§2 完成流程未改。完整文件清单、测试名、红绿原文、双轴自审及宿主步骤见下文。**

基线 `68b2b60`，分支 `feat/101-video-delivery`。开工只有派发卡未跟踪。已读根 AGENTS/CLAUDE/CONTEXT、SPEC 全文、Card A、PLAN、全局工程规约和 memory INDEX；仓内无 FOLLOWUPS。仅实现 §1/§3/§4，§2 完成流程与 spec 102 不改；不 commit/push，不改正典台账。

方法：TDD，使用卡里批准的留存决策、失败展示纯函数、manager 文件缺失、通知参数 seam；自审按 Standards / Spec 顺序独立检查（同一主代理上下文，遵用户要求）。

## 环境

- 开工 uptime load averages: 2.13 6.20 8.09。
- 初始无 node_modules，`jest: command not found` 不算红测。npm ci 网络被沙箱拒绝；改复制相邻 102 工作树的 node_modules，先 cmp 确认两份 package-lock.json 完全一致，无新依赖。
- ADB 启动失败：`could not install *smartsocket* listener: Operation not permitted`。当前会话无提权通道。模拟器亲验仍未完成，不能以单测替代。
- Expo 57 文档已读：https://docs.expo.dev/versions/v57.0.0/ 与 /sdk/notifications/。

## 红绿证据

### 留存护栏

命令：`npm test -- --runInBand --watch=false --watchman=false local-retention.test.ts`

```text

> meetpr-rn@1.0.0 test
> jest --runInBand --watch=false --watchman=false local-retention.test.ts

FAIL src/features/training/video-upload/__tests__/local-retention.test.ts
  ✓ keeps today by device calendar day and clears prior uploaded files only (2 ms)
  ✕ over 500 MiB only evicts delivered files and preserves prepared pending uploads (1 ms)
  ✓ delete and replace reclaim both original and prepared file without duplicate deletion (1 ms)
  ✓ playback chooses existing local file, otherwise fetches a fresh remote URL
  ✓ unprepared sources, including a just attached file, are protected under storage pressure
  ✓ source selection is local first, remote second, or unavailable (1 ms)

  ● over 500 MiB only evicts delivered files and preserves prepared pending uploads

    expect(received).toEqual(expected) // deep equality

    - Expected  - 1
    + Received  + 1

      Array [
    -   "new",
    +   "old",
      ]

      54 |       now,
      55 |     ),
    > 56 |   ).toEqual(['new']);
         |     ^
      57 | });
      58 | test('delete and replace reclaim both original and prepared file without duplicate deletion', () => {
      59 |   expect(

      at Object.toEqual (src/features/training/video-upload/__tests__/local-retention.test.ts:56:5)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 5 passed, 6 total
Snapshots:   0 total
Time:        0.826 s
Ran all test suites matching /local-retention.test.ts/i.
```

## David 追加口径（2026-11-05，本会话）

1. 允许新建 `video-upload-v2`：旧渠道 LOW/开启迁 DEFAULT；旧 NONE 保持 NONE；新建成功后删除旧渠道。应用级拒绝通知的权限保持原样，不强开。按 Android [渠道不可变规则](https://developer.android.com/develop/ui/compose/notifications/channels) 实装，在学员会话启动时迁移，发通知前也幂等确保渠道已建。
2. Opus 新拍的失败色替换 SPEC/卡原「橙系」：文字、图标 `danger`，顶部条底色 `dangerSoft`；无新增色值。Card A 已按明确授权更新该句；镜像 SPEC 正典留 Opus 同步。
3. 模拟器亲验本轮跳过，由 Opus 宿主执行；本记录提供步骤，未提供、未冒称截图。
4. 不 commit、不 push。

## 其它先红后绿记录

所有原始日志已落本 JOURNAL 同名目录，不依赖 `/tmp`。下方 red/green 命令均为 `npm test -- --runInBand --watch=false --watchman=false <suite>`。

| 行为 / 新增或替换测试名 | 红结果 | 绿结果 / 日志 |
| --- | --- | --- |
| `over 500 MiB only evicts delivered files and preserves prepared pending uploads`（替换旧误删期望） | expected `new`，received `old`；1 fail / 5 pass | 6/6；[red](2026-11-05-101-card-a-android/retention-red.log)、[green](2026-11-05-101-card-a-android/retention-green.log) |
| `retry now interrupts backoff and delivers the same set without waiting for its timer` | expected uploaded，received waiting；1 fail / 13 pass | 14/14；[red](2026-11-05-101-card-a-android/manager-retry-red.log)、[green](2026-11-05-101-card-a-android/manager-retry-green.log) |
| `a missing prepared file remains retryable and a Photos replacement attaches to the original set` | expected failed，received waiting；原 `setLogId` 仍在 | 15/15；[red](2026-11-05-101-card-a-android/manager-missing-red.log)、[green](2026-11-05-101-card-a-android/manager-missing-green.log) |
| `failure notification requests normal permission and publishes one DEFAULT aggregate with retry copy` | expected importance 3，received 2（LOW） | 1/1；[red](2026-11-05-101-card-a-android/notification-red.log)、[green](2026-11-05-101-card-a-android/notification-green.log)；后续迁移改用 v2 |
| `migrates legacy importance 2 to v2 importance 3 without reopening a disabled channel` | 旧实现未读取旧渠道，断言调用 0 次 | 与下一项共 3/3；[red](2026-11-05-101-card-a-android/channel-migration-red.log)、[green](2026-11-05-101-card-a-android/channel-migration-green.log) |
| `migrates legacy importance 0 to v2 importance 0 without reopening a disabled channel` | 同上；需保留 NONE | 同上，另断言创建早于删除 |
| `first failure including backoff and a suspended set log appears in day, exercise and set markers` | 模块已存在，故意恢复旧 `status === failed` 判断：count expected 2 received 1，漏 bench/waiting | 与下一项 2/2；[有效 red](2026-11-05-101-card-a-android/delivery-failures-behavior-red.log)、[green](2026-11-05-101-card-a-android/delivery-failures-behavior-green.log) |
| `manual retry keeps the failure visible until delivery, then removes all markers` | 同一错误判断：expected 1 received 0 | 同上；这次是行为失败。首次模块不存在的失败不作有效行为红证据 |

失败展示的有效红测是追加验证：临时把判断恢复成旧的“仅 failed 才失败”，确认两条断言真的抓住问题，再恢复新实现。不是把初次 `Cannot find module` 冒称行为红测。

补充回归：`all undelivered prepared files survive the 500 MiB limit on day %s`（当天、隔天两例）、`cold start after an upgrade preserves yesterday's failed file over 500 MiB and its retry identity`，与 manager/retention 共 24/24，[日志](2026-11-05-101-card-a-android/retention-cold-start-green.log)。新增 `a failed Photos save never claims the camera video has an album backup`、`denied notification permission stays denied and does not publish`、`delivery clears the single outstanding aggregate`，见最终全量。

### 7 套件 / 20 条失败逐项归因

首轮 [完整失败报告](2026-11-05-101-card-a-android/jest-initial-failures.log)：7 failed suites / 20 failed tests / 2044 total。不是负载超时；其中 4 套件有 20 条断言失败，另 3 套件在导入时崩溃、未计进 20 条。

| # | 套件 / 单项 | 判定与处理 |
| --- | --- | --- |
| 1 | set-save / completed summary replay: uploading | 断言同步：未失败正常上传不再显示图标，按 §3.5 改验无失败文案；送达后播放仍验 |
| 2 | set-save / completed summary replay: failed | 断言同步：改验“Not uploaded”而非旧组件类型；送达后回播放仍验 |
| 3 | camera-review / no interruption control | 断言同步：onUse 新增相册保存成功布尔值，原 URI 不变，期望 true |
| 4 | camera-review / inactive-only control | 同 #3；仍验预览与文件不丢 |
| 5 | camera-review / background and return | 同 #3；仍验切后台后原文件交付 |
| 6 | camera-review / background alone | 同 #3；不放宽文件归属断言 |
| 7 | camera-review / Retry after returning from background | 同 #3；新录制 URI 仍逐字匹配，删除旧文件仍验 |
| 8 | camera-review / moving handles then Use exports selected range | 同 #3；仍验相册保存的是裁剪后文件、原文件被释放 |
| 9 | camera-review / metadata preparation failure | 同 #3；回退原视频 URI 不变 |
| 10 | camera-review / thumbnails preparation failure | 同 #3；回退原视频 URI 不变 |
| 11 | camera-review / Use during thumbnail preparation | 同 #3；仍验不导出、晚到缩略图清理 |
| 12 | camera-review / untouched Use | 同 #3；仍验不导出、不压掉提示 |
| 13 | set-video-player / layout: failed | 断言同步：旧测试硬要求 wrap/不可收缩；稿 B 要同一行，改为不 wrap、44dp 按钮，窄屏图标保留无障碍名 |
| 14 | set-video-player / layout: uploading | 同 #13；仍验按钮命中区与单行标签 |
| 15 | set-video-player / layout: preparing | 同 #13；准备中文字仍不收缩 |
| 16 | set-video-player / layout: uploaded | 同 #13；已送达更换/删除按钮仍可用 |
| 17 | upload-status / integer percentages en | 断言同步：首次正常上传仍验百分比；进入 waiting 后按 §3 显示 Upload failed |
| 18 | upload-status / integer percentages zh | 同 #17，中文上传失败 |
| 19 | upload-status / native progress, saved session false | 断言同步：失败后的 retry 不清失败提示；送达后仍验 Delivered to coach |
| 20 | upload-status / native progress, saved session true | 同 #19，恢复分片 session 路径 |

三个导入失败是真回归，修生产代码，未加 native mock 掩盖：

- history/student-added-history、history/progress-details：新增恢复 hook 静态引入 manager→compressor→NitroModules，拖累只读展示入口。改成用户执行 retry/选片时动态加载 native/manager。
- analytics/root-layout：新增通知响应组件静态引入 manager 同样触发 NitroModules。恢复已有 root 的延迟加载策略，点击通知时才导入 manager。

第二轮 [失败报告](2026-11-05-101-card-a-android/jest-second-failures.log) 的两条 delivery-failures 失败来自有效红测临时旧判断被仍在执行的全量读到；已恢复，不作为新回归。另有 student-added-history 一条旧“22dp 仅播放列”布局断言：失败行需要“没传上”文本和图标，改验对应动作 100dp 尾列与失败文案，其它动作仍不占列；此项是 spec 结构变更的断言同步。后续最终全量在改动停止后重跑。

## 相机直拍核实

结论：RN 已有另存相册逻辑，不是无条件保证。`CameraRecorder.tsx` 的 Save to Photos 开关默认 true、记住用户偏好；使用录像时检查/请求视频相册权限，调用 `MediaLibrary.Asset.create(output)`。剪裁过时保存剪裁输出，未剪裁时保存原录制。关开关、拒权或写入失败都不会有相册备份；原逻辑会 toast。

本卡把真实成功结果从 onUse 传到 `SelectedVideo.savedToPhotos` / `VideoUploadRecord.savedToPhotos`，本机 schema 可选、老记录兼容，经过 prepared/source 清理后仍保留。只有 true 才显示「录像时它也存了一份到相册」。旧记录未知、导入视频、相册写入失败均不做该承诺。相册保存成功/失败边界有测试；真实 Android MediaStore 保存仍由宿主验收。

## Standards 自审（本人顺序复审，同一上下文）

依据 AGENTS/CLAUDE、工程规约、code-review skill 的 Standards 及 smell baseline；亲读全部修改与新增源码/测试，不调用子代理。审查基线 `68b2b60`，未提交 diff；spec 已在本地，不依赖未配置的 issue tracker。

- 单写者；无新依赖、后端、协议、迁移号改动；保留上传退避序列与既有完成/奖励入口。没有 commit/push。
- 失败状态由 `delivery-failures.ts` 统一；训练、回看、指示器共用。同组身份由原 `stableSetId`、已有 `setLogId` / logRequest 恢复，重选不另建一个目标组。
- 修复真回归：恢复/通知组件延迟加载 manager/native，避免只读历史和根入口过早加载 NitroModules；三套原先导入失败的测试恢复运行。
- 清扫复审发现原先 await stop 后再查状态可能取消同组新任务。清扫现只对已送达文件同步判定并删除，完全不取消未送达上传；不在资格检查与删除之间 yield。
- 使用 `danger/dangerSoft` 既有 token；按钮 ≥44dp；窄屏用图标保留 accessibilityLabel。Impeccable detector 对五个修改界面返回 `[]`，只代表机械检查，非模拟器视觉验收。
- 记录格式不改版本号，仅可选 savedToPhotos 字段；老版本持久化对象的冷启动测试已覆盖。未发现本卡新增的未解决规范阻塞项。

## Spec 自审（本人第二遍对照卡与最新口径）

- §1：500MB 只回收已送达；全未送达允许超限；隔日与冷启动留存有回归。文件缺失保留失败及目标组，重试弹层可选相册并回原组。prepare 阶段二次检查缺失也走新文案，不再要求先删除。
- §3：waiting/failed/带历史失败的 retry 都显示，首次正常上传不提醒；页顶条、完成动作标题、组行、历史日卡均已接线。送达清 error/retry 后标记自动消失。录入页三按钮同一行，最小屏用图标；保存组流程未加等待。
- §4：新渠道 v2，旧 LOW→DEFAULT、旧 NONE→NONE；创建后才删除旧渠道；全局权限拒绝不重开；网络 30 分钟/确定性立即沿既有 scheduler，不在 UI 首次失败时抢发通知。同一 identifier 聚合；送达/移除清掉聚合通知；点击通知跳训练并 retryAll。Android DEFAULT 的实际响铃/横幅仍由系统与用户设置决定。
- §2：`TodayWorkoutView.tsx`、完成按钮与奖励流没有修改；不存在等待送达/自动完成/完成通知的本卡实现。spec 102 无改动。
- 三语来自现有 catalog + zh-Hant 生成流程。颜色按本次 David/Opus 更新覆盖旧 SPEC 橙色。无新增相册保存承诺。
- 未解决验收：仅宿主模拟器/实机视觉与系统集成证据，按 David 最新指令移交 Opus。这里不宣布产品验收通过。

## Opus 宿主验收步骤（本轮没有截图）

使用本仓既有 AVD `meetpr`、CN 轨、无代理启动；按仓说明设置 JAVA_HOME / ANDROID_HOME 后 `npx expo run:android`。覆盖安装，勿清数据/卸载；使用获准的测试账号和测试录像，不删除用户真实视频。截图保存到 `docs/journal/2026-11-05-101-card-a-android/`，下面文件名是**建议目标，尚不存在**。

| 对应卡条目 | 操作与重点观察 | 建议截图名 |
| --- | --- | --- |
| 4 / 稿 A | 正在训练的一组加测试视频；断网等首次传输失败。周进度下方立刻出现计数条，完成动作标题/展开组尾出现 danger 图标。点立即重试，确认不等退避；恢复网络，确认送达后条与图标消失。另看一个首次正常上传的组，不出现失败提醒。 | `a-first-failure.png`、`a-delivered.png` |
| 5 / 稿 B | 打开失败组录入页，在最小支持屏宽及大字体下看“上传失败”和三个按钮同一行；分别点重试、更换、删除；每个触区 ≥44dp。保存该组无需等视频；按钮图标仍有无障碍名。 | `b-entry-narrow.png` |
| 6 / 历史 | 进入一个上线前已完成且有失败视频的训练日：日卡失败条、行尾“没传上”；重试送达后恢复播放。确认没有重新要求完成训练。 | `history-failed.png`、`history-delivered.png` |
| 8 / 留存 | 在基线版保留已准备未上传测试视频，合计超过500MiB（只用测试素材）。保存记录所指文件路径/大小；跨设备日历日后覆盖装本版，冷启动核对未送达文件和记录仍在。已送达老文件允许清除，线上回放仍可播放。 | `retention-after-upgrade.png`，另保留文件存在/大小输出 |
| 9 / 缺失 | 先制造待传测试视频；仅删除该条 record.localUri/source 指向的测试文件，再重试。看到带原动作/组号的缺失弹层；选相册视频后确认还是原 setLogId，服务端送达后原组可播放。取消选片/先不管均不删除原记录。多条缺失依次重选。 | `missing-file.png`、`missing-reselected.png` |
| 10 / 升级第一屏 | 基线版同时有 waiting、failed、uploaded 三类测试记录；覆盖装本版首次打开。前两者文件保留、可重试；正常无失败上传静默；已有完成日/已送达播放不受影响。 | `upgrade-first-screen.png` |
| 11 / 渠道开 | 基线版先触发旧 video-upload 渠道，保持开启（LOW）；覆盖装本版、启动学员会话。系统渠道列表确认只有新 v2，DEFAULT；点聚合失败通知应到训练并插队重试。 | `channel-enabled-v2.png`、`notification-aggregate.png` |
| 11 / 渠道关 | 另一个受控旧安装状态，手动关闭旧 video-upload 渠道后覆盖升级；确认 v2 仍关闭（NONE）、旧渠道删除。也验应用级通知被拒时不弹通知，页内失败仍显示。 | `channel-disabled-v2.png` |
| 11 / 三语深浅 | 简中、English、繁体各看顶部条、录入页、历史条、缺失弹层、通知；深浅色至少各一套。失败 danger 与品牌金区分；长英文、100dp 历史尾列不得挤掉组数据。 | `zh-light.png`、`en-dark.png`、`zh-hant-light.png` |
| 相机 / 保存相册 | Save to Photos 开启并授权：使用录像后相册确有视频；后续缺失弹层显示已保存说明。开关关/拒权/模拟写入失败：不显示已保存说明；失败仍可重试。 | `camera-album-saved.png`、`camera-no-album.png` |

高优先级边角：无 setLogId 的挂起视频在页顶有失败标记，补全并保存组后可继续传；相册选择取消保留旧记录；多个失败只一条聚合通知；系统杀进程再进 app 保留未送达文件。第 8/10 条的升级素材必须来自基线真实持久化，不用纯 Demo 代替。30 分钟通知可用已有 scheduler 的注入时钟 fixture 验时机，系统通知展示仍要实际 Android 记录。

## 其余红测原始输出（内嵌）

留存红输出已在前文内嵌；这里补 manager、通知、渠道迁移、有效失败展示红输出，完整 green 日志见上表链接。

### manager-retry-red.log

```text
> meetpr-rn@1.0.0 test
> jest --runInBand --watch=false --watchman=false manager-attach.test.ts

FAIL src/features/training/video-upload/__tests__/manager-attach.test.ts
  ✓ native upload rejection remains retryable and persists its message: fetch failed: Call to function 'NativeRequest.start' has been rejected. Cannot cast value for field 'headers' (5 ms)
  ✓ native upload rejection remains retryable and persists its message: Native upload arguments cannot be cast (1 ms)
  ✓ one attach retains the picker source through the immediate sweep and prepares the nonempty copy (2 ms)
  ✓ concurrent attaches of the same selection share one retained file and upload (1 ms)
  ✓ a rejected native copy is caught as VideoNativeError without deleting the picker source or publishing a phantom record (2 ms)
  ✓ Set log unavailable fails deterministically with readable attachment copy and keeps the source for retry (7 ms)
  ✓ Invalid set input fails deterministically with readable attachment copy and keeps the source for retry (1 ms)
  ✓ a native part deletion failure is deterministic and keeps the prepared video for retry (1 ms)
  ✓ a picker deletion failure returns VideoNativeError and keeps the original selection (2 ms)
  ✓ startup during an asynchronous retain cannot reclaim the not-yet-published copy (17 ms)
  ✓ transcode output is retained before its cache file and old source are reclaimed (3 ms)
  ✓ a late startup hydration cannot roll the retained source back to a stale picker URI (2 ms)
  ✓ an ensureSetLog transport failure still uses network backoff (1 ms)
  ✕ retry now interrupts backoff and delivers the same set without waiting for its timer (3 ms)

  ● retry now interrupts backoff and delivers the same set without waiting for its timer

    expect(received).toMatchObject(expected)

    - Expected  - 1
    + Received  + 1

      Object {
        "setLogId": "set-log",
    -   "status": "uploaded",
    +   "status": "waiting",
      }

      274 |   expect(useVideoUploadStore.getState().records['student:set'].status).toBe('waiting');
      275 |   await videoUploadManager.retry(id, async () => 'set-log');
    > 276 |   expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'uploaded', setLogId: 'set-log' });
          |                                                                 ^
      277 | });
      278 |

      at Object.toMatchObject (src/features/training/video-upload/__tests__/manager-attach.test.ts:276:65)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 13 passed, 14 total
Snapshots:   0 total
Time:        0.758 s
Ran all test suites matching /manager-attach.test.ts/i.
```

### manager-missing-red.log

```text
> meetpr-rn@1.0.0 test
> jest --runInBand --watch=false --watchman=false manager-attach.test.ts

FAIL src/features/training/video-upload/__tests__/manager-attach.test.ts
  ✓ native upload rejection remains retryable and persists its message: fetch failed: Call to function 'NativeRequest.start' has been rejected. Cannot cast value for field 'headers' (5 ms)
  ✓ native upload rejection remains retryable and persists its message: Native upload arguments cannot be cast (2 ms)
  ✓ one attach retains the picker source through the immediate sweep and prepares the nonempty copy (2 ms)
  ✓ concurrent attaches of the same selection share one retained file and upload (2 ms)
  ✓ a rejected native copy is caught as VideoNativeError without deleting the picker source or publishing a phantom record (1 ms)
  ✓ Set log unavailable fails deterministically with readable attachment copy and keeps the source for retry (2 ms)
  ✓ Invalid set input fails deterministically with readable attachment copy and keeps the source for retry (2 ms)
  ✓ a native part deletion failure is deterministic and keeps the prepared video for retry (1 ms)
  ✓ a picker deletion failure returns VideoNativeError and keeps the original selection (2 ms)
  ✓ startup during an asynchronous retain cannot reclaim the not-yet-published copy (2 ms)
  ✓ transcode output is retained before its cache file and old source are reclaimed (3 ms)
  ✓ a late startup hydration cannot roll the retained source back to a stale picker URI (2 ms)
  ✓ an ensureSetLog transport failure still uses network backoff (2 ms)
  ✓ retry now interrupts backoff and delivers the same set without waiting for its timer (1 ms)
  ✕ a missing prepared file remains retryable and a Photos replacement attaches to the original set (3 ms)

  ● a missing prepared file remains retryable and a Photos replacement attaches to the original set

    expect(received).toMatchObject(expected)

    - Expected  - 1
    + Received  + 1

      Object {
        "setLogId": "original-log",
    -   "status": "failed",
    +   "status": "waiting",
      }

      283 |   mockFiles.delete(failed.localUri!);
      284 |   await videoUploadManager.retry(id);
    > 285 |   expect(useVideoUploadStore.getState().records['student:set']).toMatchObject({ status: 'failed', setLogId: 'original-log' });
          |                                                                 ^
      286 |   expect(videoUploadManager.needsReselection(id)).toBe(true);
      287 |   mockFiles.set(source.uri, 350000);
      288 |   await videoUploadManager.replaceMissing(id, source);

      at Object.toMatchObject (src/features/training/video-upload/__tests__/manager-attach.test.ts:285:65)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 14 passed, 15 total
Snapshots:   0 total
Time:        0.575 s, estimated 1 s
Ran all test suites matching /manager-attach.test.ts/i.
```

### notification-red.log

```text
> meetpr-rn@1.0.0 test
> jest --runInBand --watch=false --watchman=false failure-notifier.test.ts

FAIL src/features/training/video-upload/__tests__/failure-notifier.test.ts
  ✕ failure notification requests normal permission and publishes one DEFAULT aggregate with retry copy (6 ms)

  ● failure notification requests normal permission and publishes one DEFAULT aggregate with retry copy

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "video-upload", ObjectContaining {"importance": 3}
    Received: "video-upload", {"enableVibrate": false, "importance": 2, "name": "Training video upload failed", "sound": null}

    Number of calls: 1

      20 |   notifyUploadFailures(() => 2);
      21 |   await jest.advanceTimersByTimeAsync(1000);
    > 22 |   expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('video-upload', expect.objectContaining({ importance: 3 }));
         |                                                     ^
      23 |   expect(Notifications.requestPermissionsAsync).toHaveBeenCalledWith();
      24 |   expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      25 |   expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({

      at Object.toHaveBeenCalledWith (src/features/training/video-upload/__tests__/failure-notifier.test.ts:22:53)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 1 total
Snapshots:   0 total
Time:        0.711 s
Ran all test suites matching /failure-notifier.test.ts/i.
```

### channel-migration-red.log

```text
> meetpr-rn@1.0.0 test
> jest --runInBand --watch=false --watchman=false failure-notifier.test.ts

FAIL src/features/training/video-upload/__tests__/failure-notifier.test.ts
  ✓ failure notification requests normal permission and publishes one DEFAULT aggregate with retry copy (7 ms)
  ✕ migrates legacy importance 2 to v2 importance 3 without reopening a disabled channel (3 ms)
  ✕ migrates legacy importance 0 to v2 importance 0 without reopening a disabled channel (1 ms)

  ● migrates legacy importance 2 to v2 importance 3 without reopening a disabled channel

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "video-upload"

    Number of calls: 0

      36 |   notifyUploadFailures(() => 1);
      37 |   await jest.advanceTimersByTimeAsync(1000);
    > 38 |   expect(Notifications.getNotificationChannelAsync).toHaveBeenCalledWith('video-upload');
         |                                                     ^
      39 |   expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('video-upload-v2', expect.objectContaining({ importance: expectedImportance }));
      40 |   expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('video-upload');
      41 |   expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(Notifications.deleteNotificationChannelAsync).mock.invocationCallOrder[0]);

      at toHaveBeenCalledWith (src/features/training/video-upload/__tests__/failure-notifier.test.ts:38:53)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

  ● migrates legacy importance 0 to v2 importance 0 without reopening a disabled channel

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: "video-upload"

    Number of calls: 0

      36 |   notifyUploadFailures(() => 1);
      37 |   await jest.advanceTimersByTimeAsync(1000);
    > 38 |   expect(Notifications.getNotificationChannelAsync).toHaveBeenCalledWith('video-upload');
         |                                                     ^
      39 |   expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('video-upload-v2', expect.objectContaining({ importance: expectedImportance }));
      40 |   expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith('video-upload');
      41 |   expect(jest.mocked(Notifications.setNotificationChannelAsync).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(Notifications.deleteNotificationChannelAsync).mock.invocationCallOrder[0]);

      at toHaveBeenCalledWith (src/features/training/video-upload/__tests__/failure-notifier.test.ts:38:53)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

Test Suites: 1 failed, 1 total
Tests:       2 failed, 1 passed, 3 total
Snapshots:   0 total
Time:        1.64 s
Ran all test suites matching /failure-notifier.test.ts/i.
```

### delivery-failures-behavior-red.log

```text
> meetpr-rn@1.0.0 test
> jest --runInBand --watch=false --watchman=false delivery-failures.test.ts

FAIL src/features/training/video-upload/__tests__/delivery-failures.test.ts
  ✕ first failure including backoff and a suspended set log appears in day, exercise and set markers (5 ms)
  ✕ manual retry keeps the failure visible until delivery, then removes all markers (1 ms)

  ● first failure including backoff and a suspended set log appears in day, exercise and set markers

    expect(received).toEqual(expected) // deep equality

    - Expected  - 3
    + Received  + 1

      Object {
    -   "count": 2,
    +   "count": 1,
        "exerciseIds": Array [
    -     "bench",
          "squat",
        ],
        "setIds": Array [
    -     "waiting",
          "no-log",
        ],
      }

       9 |     { stableSetId: 'sending', exerciseId: 'bench', upload: { ...EMPTY_VIDEO_UPLOAD, status: 'uploading' as const } },
      10 |   ];
    > 11 |   expect(videoDeliveryFailures(rows)).toEqual({ count: 2, setIds: ['waiting', 'no-log'], exerciseIds: ['bench', 'squat'] });
         |                                       ^
      12 | });
      13 |
      14 | test('manual retry keeps the failure visible until delivery, then removes all markers', () => {

      at Object.toEqual (src/features/training/video-upload/__tests__/delivery-failures.test.ts:11:39)

  ● manual retry keeps the failure visible until delivery, then removes all markers

    expect(received).toBe(expected) // Object.is equality

    Expected: 1
    Received: 0

      16 |   const retrying = videoUploadReducer(failed, { type: 'retry' });
      17 |   const row = { stableSetId: 'set', exerciseId: 'bench', upload: retrying };
    > 18 |   expect(videoDeliveryFailures([row]).count).toBe(1);
         |                                              ^
      19 |   expect(videoDeliveryFailures([{ ...row, upload: videoUploadReducer(retrying, { type: 'succeeded', attachmentId: 'video' }) }]).count).toBe(0);
      20 | });
      21 |

      at Object.toBe (src/features/training/video-upload/__tests__/delivery-failures.test.ts:18:46)

Test Suites: 1 failed, 1 total
Tests:       2 failed, 2 total
Snapshots:   0 total
Time:        0.67 s, estimated 1 s
Ran all test suites matching /delivery-failures.test.ts/i.
```

## 修改文件清单

- `src/app/_layout.tsx`
- `src/features/history/HistoryEntriesView.tsx`
- `src/features/history/__tests__/student-added-history.test.tsx`
- `src/features/training/WorkoutBody.tsx`
- `src/features/training/__tests__/set-save.test.tsx`
- `src/features/training/video-upload/CameraRecorder.tsx`
- `src/features/training/video-upload/CompletedVideoReplay.tsx`
- `src/features/training/video-upload/VideoAttachmentControls.tsx`
- `src/features/training/video-upload/VideoStatusIcon.tsx`
- `src/features/training/video-upload/__tests__/camera-review.test.tsx`
- `src/features/training/video-upload/__tests__/local-retention.test.ts`
- `src/features/training/video-upload/__tests__/manager-attach.test.ts`
- `src/features/training/video-upload/__tests__/set-video-player.test.tsx`
- `src/features/training/video-upload/__tests__/upload-status.test.tsx`
- `src/features/training/video-upload/failure-notifier.ts`
- `src/features/training/video-upload/local-retention.ts`
- `src/features/training/video-upload/manager.ts`
- `src/features/training/video-upload/model.ts`
- `src/features/training/video-upload/native.ts`
- `src/features/training/video-upload/store.ts`
- `src/i18n/catalog/RnExtras.json`
- `src/i18n/catalog/StudentKit.json`
- `src/i18n/generated/zh-Hant.json`
- `src/notifications/handler.ts`
- `src/features/training/video-upload/VideoDeliveryRecovery.tsx`
- `src/features/training/video-upload/VideoFailureSummary.tsx`
- `src/features/training/video-upload/VideoUploadNotificationSession.tsx`
- `src/features/training/video-upload/__tests__/delivery-failures.test.ts`
- `src/features/training/video-upload/__tests__/failure-notifier.test.ts`
- `src/features/training/video-upload/delivery-failures.ts`
- `specs/101-video-delivery-guarantee/CARD-a-android.md`（开工前已存在的未跟踪派发卡；本次仅按新授权改颜色口径）。
- 本 JOURNAL 与同名证据目录。

可审源代码差异：[implementation.patch](2026-11-05-101-card-a-android/implementation.patch)（包含新增源码/测试；不包含 JOURNAL 的重复日志）。

## 自审追加：更换附件失败也不能吞掉新录像

同属 §1 的现存风险：attach 先留存新素材并消费临时源，再删除旧附件；若删除旧附件接口失败，旧 catch 会删除新 retained 文件，导致新录像未被记录且副本被清掉。

新增 `replacement deletion failure retains the new video and retries the same set after restart`，先红：上传管理器拒绝返回 offline，不能进入持久化重试。修后先写入新 retained/source 与旧 attachmentId（复用既有字段），持久化成功后才回收用户明确更换的旧本机文件；旧远端附件删除由 run 内既有错误分类/退避处理，失败保留新素材。重启 hydrate 后 retry 仍挂原 setLogId。没有修改上传协议/分片/后端，也未新增持久化字段。

[红](2026-11-05-101-card-a-android/replacement-retention-red.log)、[绿](2026-11-05-101-card-a-android/replacement-retention-green.log)（manager + handover + upload-status，3 suites / 28 tests）。Standards / Spec 定向复审：已确认旧附件清理失败不再阻止新素材留存；明确更换才回收旧本机文件；网络失败仍按原退避处理。

```text
> meetpr-rn@1.0.0 test
> jest --runInBand --watch=false --watchman=false manager-attach.test.ts

FAIL src/features/training/video-upload/__tests__/manager-attach.test.ts
  ✓ native upload rejection remains retryable and persists its message: fetch failed: Call to function 'NativeRequest.start' has been rejected. Cannot cast value for field 'headers' (176 ms)
  ✓ native upload rejection remains retryable and persists its message: Native upload arguments cannot be cast (12 ms)
  ✓ one attach retains the picker source through the immediate sweep and prepares the nonempty copy (3 ms)
  ✓ concurrent attaches of the same selection share one retained file and upload (3 ms)
  ✓ a rejected native copy is caught as VideoNativeError without deleting the picker source or publishing a phantom record (3 ms)
  ✓ Set log unavailable fails deterministically with readable attachment copy and keeps the source for retry (3 ms)
  ✓ Invalid set input fails deterministically with readable attachment copy and keeps the source for retry (3 ms)
  ✓ a native part deletion failure is deterministic and keeps the prepared video for retry (2 ms)
  ✓ a picker deletion failure returns VideoNativeError and keeps the original selection (3 ms)
  ✓ startup during an asynchronous retain cannot reclaim the not-yet-published copy (5 ms)
  ✓ transcode output is retained before its cache file and old source are reclaimed (15 ms)
  ✓ a late startup hydration cannot roll the retained source back to a stale picker URI (30 ms)
  ✓ an ensureSetLog transport failure still uses network backoff (2 ms)
  ✓ retry now interrupts backoff and delivers the same set without waiting for its timer (6 ms)
  ✓ a missing prepared file remains retryable and a Photos replacement attaches to the original set (22 ms)
  ✓ cold start after an upgrade preserves yesterday's failed file over 500 MiB and its retry identity (2 ms)
  ✕ replacement deletion failure retains the new video and retries the same set after restart (5 ms)

  ● replacement deletion failure retains the new video and retries the same set after restart

    expect(received).resolves.toBeUndefined()

    Received promise rejected instead of resolved
    Rejected to value: [TypeError: offline]

      312 |   mockFiles.set(source.uri, 400000);
      313 |   jest.mocked(uploadsRepository.remove).mockRejectedValueOnce(new TypeError('offline'));
    > 314 |   await expect(videoUploadManager.attach(id, source, async () => 'original-log')).resolves.toBeUndefined();
          |               ^
      315 |   const record = useVideoUploadStore.getState().records['student:set'];
      316 |   expect(record.status).toBe('waiting');
      317 |   expect(mockFiles.get(record.source!.uri)).toBe(400000);

      at expect (node_modules/expect/build/index.js:113:15)
      at Object.<anonymous> (src/features/training/video-upload/__tests__/manager-attach.test.ts:314:15)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)

Test Suites: 1 failed, 1 total
Tests:       1 failed, 16 passed, 17 total
Snapshots:   0 total
Time:        3.875 s
Ran all test suites matching /manager-attach.test.ts/i.
```

最终回归运行前负载曾到 198.11 / 109.03 / 58.51。改动中的长全量曾读到新增 replacement 红测的旧实现，不作为最终结果。源代码停止改动后最终命令使用 `--silent --testTimeout=30000`：只关闭已有大量 act/Expo 日志，并把高负载下的单项超时从 5 秒提高至 30 秒，不跳过任何套件或断言。最终依据 `jest-full-final.log`。

复审中的长全量最终为 200 suites / 2078 tests，仅新增 replacement 红测那一条失败（它在修复落地前已加载旧 manager），其余 2077 通过；该运行保存在 `jest-during-replacement-review.log`，不是最终绿证据。定向 replacement 修复已绿，随后 `jest-full-final.log` 在源代码固定后从头运行。

## 最终验证（源码冻结后的运行）

命令：`npm test -- --runInBand --watch=false --watchman=false --silent --testTimeout=30000`。运行前 load 53.64 / 81.91 / 60.50；结束 31.24 / 61.23 / 56.21。2078 项全部执行，没有 skip；高负载仅延长单项超时。

```text
PASS src/features/video-player/__tests__/scrub-state.test.ts

Test Suites: 200 passed, 200 total
Tests:       2078 passed, 2078 total
Snapshots:   0 total
Time:        183.59 s, estimated 241 s
tsc exit=0
> meetpr-rn@1.0.0 lint
> expo lint

lint exit=0
```

- [全量 Jest 原始输出](2026-11-05-101-card-a-android/jest-full-final.log)
- [tsc 原始输出](2026-11-05-101-card-a-android/tsc.log) / [lint 原始输出](2026-11-05-101-card-a-android/lint.log)
- `git diff --check` 通过，HEAD 仍 `68b2b60`。`TodayWorkoutView.tsx` / 完成按钮无 diff；无 commit/push。
- 30 个源码/测试/文案文件改动（含新增），详见文件清单及 implementation.patch。
- 截图：无；按 David 追加指令交 Opus 宿主执行。不把组件测试和 detector 当作视觉验收。
- 原始失败展示模块缺失日志保留为 `delivery-failures-initial-module-error.log`，只记开发过程，不作为有效红；有效红使用上方已内嵌的两个失败断言。
- 尚需验收/有疑问：真实 Android 渠道迁移、横幅/声音及多语言深浅色小屏效果、真实相册写入/重选、覆盖升级持久化文件与首次屏。操作步骤已列；没有其它未决产品选择。
