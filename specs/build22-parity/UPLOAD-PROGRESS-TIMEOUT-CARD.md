# 任务卡：分片上传改为"无进度超时"并显示上传进度

开工先读 `CONTEXT.md`（如存在）、`AGENTS.md`、本卡与 `docs/diagnose-upload-cellular-2026-10-03.md`。

- 级别：T1。基线：`feat/084c-chat-video-rest`（PR #71 顶），分支 `fix/upload-progress-timeout`。
- 来源：David 2026-10-03 真机复验——带视频的组从 Wi‑Fi 切到流量后一直显示 Sending（十分钟以上），重开后过一会才成功。排障已在模拟器上复现根因（见上面的排障记录 Phase 4）。
- **不 commit、不 push**。只在 `docs/CODEX-JOURNAL.md` 末尾追加本卡一节。本仓已公开。

## 根因（已复现）

`src/features/training/video-upload/multipart.ts` 对每个分片设了 60 秒的**总时长**超时（`setTimeout(..., 60_000)`），而分片固定 5 MiB（`VIDEO_PART_SIZE_BYTES`，Global 的 R2 要求非末片 ≥ 5 MiB，不能调小）。上行慢时（模拟器限速 300 kbps 复现）一个分片传不完 60 秒就被掐断从头再来，永远完成不了；配合重试退避 60 / 120 / 300 / 600 / 900 秒，界面长时间停在 Sending。

## 要做的

1. 分片超时改为**无进度超时**：用上传任务的进度回调（`FileSystem.createUploadTask` 的回调里有已发送字节数）跟踪进度，连续 **30 秒**没有新增已发送字节才判这片超时（沿用现有 `PartUploadError(408)` 与取消路径）；有进度就不掐。另设一个宽松的绝对上限（单片 10 分钟）防止永远挂着。阈值做成常量放在现有常量处。
2. 上传进度：把字节级进度（已完成分片字节 + 当前分片已发送字节）/ 总字节，经现有 `onProgress` 送到上传记录；组录入页视频行的状态在上传中显示为 `Sending · 42%`（中文"发送中 · 42%"），整数百分比，0% 时只显示 Sending。不改其他状态文案。
3. 不改：分片大小、重试退避表、网络变化触发重传的逻辑（另行排查）、压缩阶段。

## 约束

- 不改后端契约与本地持久化结构（上传记录若需要存进度，用现有字段或只放内存）；不加依赖。
- 守仓内 eslint 与 TypeScript 配置；新增文案中英文同步并过 i18n 守卫。

## 测试 seam（先红后绿）

1. `multipart.ts`：用假的上传任务——(a) 持续有进度、总耗时超过 60 秒的分片**不会**超时并成功完成（先在现状下看它红）；(b) 30 秒无进度判超时；(c) 超过绝对上限判超时。用 jest 假定时器。
2. 视频行状态文案：上传中带百分比、0% 不带。

## 验收清单（Opus 收货）

- [ ] 模拟器限速 300 kbps、经虚拟网卡上传 2.7 MB 分片：不再每 60 秒从头重来，一次传完，界面百分比递增，最终 Delivered to coach。
- [ ] 正常网速上传不受影响。
- [ ] 分片挂住不回（无进度）时约 30 秒后重试，最终成功。
- [ ] `npx jest --runInBand` 全量、`npx tsc --noEmit`、`npm run lint` 通过。

## Out of Scope

iOS（后台 URLSession，另评估）；网络变化触发重传的判定；"Processing" 压缩阶段卡住（另查）。
