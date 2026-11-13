# Spec 109 · Android 原生证据

2026-11-13，主代理指定既有 `emulator-5570`（AVD `meetpr16`），独立QA包 `com.meetpr.global.historyqa`，Metro8094，`EXPO_PUBLIC_DEMO_MODE=1` / Global。

- 原生APK由主代理构建成功：518 tasks，6m49s；此处为实际安装运行截图，不是HTML或Jest渲染。
- 屏幕1080×2400px，当前已有density 480，等效**360dp宽**。未更改分辨率/密度；仅在QA包Settings切换浅深色。
- 同一演示session中顺次操作Cable Row：历史各组60kg；第二组改次数为11；第一组改重量62.5kg；第三组改重量65kg。截图反映各阶段实际状态。
- 最新批准样式：只有历史预填数字为金色、编辑时数字右侧显示 `Last`（CN翻译为`上次`）；不重复重量。手改或保存本次记录后标记消失，重量普通色。教练明确重量的原处方差异gold规则保持。

| 文件 | 实际观察 |
|---|---|
| [dark-browse.png](dark-browse.png) | 第1/3组历史60金色；第2组已保存60×11，重量普通色；无编辑格/键盘 |
| [dark-edit.png](dark-edit.png) | 第1组进入编辑，60右侧仅Last，其余字段无历史提示 |
| [dark-manual-edit.png](dark-manual-edit.png) | 第1组输入62.5后立即普通色且无Last，仍在编辑态 |
| [dark-manual-browse.png](dark-manual-browse.png) | 收起后第1组62.5普通色，第2组60×11保持，第3组仍60金色 |
| [dark-saved-reps.png](dark-saved-reps.png) | 仅把第2组次数改11，仍停留Reps编辑；其60已成为本次记录，Last与金色即时消失 |
| [light-browse.png](light-browse.png) | 浅色下第1组62.5和第2组60为实际普通色，第3组60仍历史金色 |
| [light-edit.png](light-edit.png) | 第3组60右侧Last，小字未截断，次数/RPE字段保持原样 |
| [light-manual-edit.png](light-manual-edit.png) | 第3组输入65，立即去标、普通色；前两组62.5/60未联动 |
| [light-manual-browse.png](light-manual-browse.png) | 收起后65保持普通色，另两组重量未变化 |

只改次数/RPE去标同时有两个公开UI seam回归；教练具体重量、saved null、bodyweight/pct/range、lb、跨session/当前day兄弟slot等边界由Jest/HTTP seam覆盖。最终完整219 suites /2348 tests绿，见本卡[JOURNAL](../../journal/2026-11-13-109-android.md)。

## 范围与现场备注

此为演示fixture，不代表真实账号或Global线上联调；未清正式包数据、未新建/重启AVD、未操作另一任务的5556设备。QA冷启动会重建内存seed，旧快照可能在后续查询刷新时被seed替换，不能把跨冷启动的demo记录当线上持久化证据；上述最终截图在同一最终JS session内取证。

最初从屏幕下半部打开编辑时曾被键盘遮住当前组，滚动后可见；最终第3组编辑图也手动上滚到可见位置。这属于本卡未改动的原滚动/键盘可见性路径，未做基线对照诊断，不据此宣称该路径已修复。此次仅确认360dp下新横排数字/徽标本身没有截断。
