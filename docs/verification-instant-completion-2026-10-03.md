# 长按完成后立即弹奖励页 · 收货记录 · 2026-10-03

卡：[INSTANT-COMPLETION-CARD](../specs/build22-parity/INSTANT-COMPLETION-CARD.md)。来源：David 真机反馈"长按完成后奖励页没弹，重开才弹"。实装方 Codex，收货方 Opus，无返修。

复现（修复前）：把完成请求延迟 8 秒，页面先本地显示已完成，奖励页 8 秒后才出现。

模拟器收货（本地合成 API）：

| 场景 | 结果 |
|---|---|
| 完成请求延迟 8 秒 | 长按后 1.5 秒内已在奖励页，显示 "Sending to your coach…"；请求返回后变为 "Sam received your training log"。[截图](evidence/instant-completion-20261003/sending-then-received.png) |
| 完成请求返回 503 | 奖励页关闭，页面回到未完成，弹出失败提示；去掉故障后再次长按正常完成。[截图](evidence/instant-completion-20261003/failure-rolls-back.png) |

没验到的：30 秒超时分支只有单测；真机未验。失败提示的标题沿用现有的 "Failed to load"，不太贴切，未在本卡范围内改。

自动检查（合并 #71 后）：jest 141 suites / 1027 tests、tsc、lint 通过（合并上传分支时为 142 / 1039）。
