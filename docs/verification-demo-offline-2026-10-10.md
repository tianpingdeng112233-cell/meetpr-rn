# 离线演示包收货记录 · 2026-10-10

卡：`specs/demo-offline/CARD.md`（含返修一）。分支 `feat/demo-offline`，基线 `integration/walkthrough-demo-20261010`（main@aeb1020 + #80 #81 #82 #83 #84 #85）。

## 结论

通过。`EXPO_PUBLIC_DEMO_MODE=1` 构建的包在模拟器（AVD `meetpr`，Android 15）开飞行模式全程可用；不设该变量时现有 167 个测试文件 / 1520 条测试零修改全绿。

- 自动化：171 suites / 1540 tests 绿，`tsc --noEmit` 0 错，`expo lint` 0 错。
- 实屏（飞行模式）：首次启动只出现使用数据告知，点掉后直接进 Today，不出现登录页；Today（周条、概览卡、体重 83.50、Meet 37 天 · IPF · 83 kg、营养占位）、Training（周条、主项卡与教练备注、辅助项记录卡含"上次"一栏、Training history）、Progress（列表四行、e1RM 四段含 Total、历史三格、强度页、反馈列表）、Profile（身份卡、五行及 About me / Health & recovery / Settings 子页）、与教练的聊天（含训练卡消息）均有内容。
- 写入：记一组主项后进度前进并起休息计时；连记 6 组后 hero 卡切到辅助项记录卡；杀进程重开回到种子状态，且不再出现告知与登录页。
- 日志：`ReactNativeJS` 无网络报错。

## 范围例外（已接受）

卡外多改三个非界面文件的存储入口（`features/settings/storage.ts`、`features/training/storage.ts`、`features/training/video-upload/store.ts`），演示时改用内存存储，否则训练状态与 e1RM 缓存会跨冷启动残留，和"冷启动回到种子"矛盾。不设开关时仍是原来的 AsyncStorage。

## 未实屏

Meet 编辑页与体重页保存回显、"全部按计划完成"、完成当天训练、聊天发消息、录制 / 选片上传与回放（以上有 S3 写后读测试，未在屏上点）；中文界面；深色；真机。

## 已知现象

- 聊天页顶部显示 Online（演示下没有实时连接，这是该页现有的显示逻辑）。
- 应用开着跨过零点，数据仍停在前一天的种子，杀进程重开即更新。

## 出包

打包侧把应用 ID 换成 `com.meetpr.app.demo`、名称换成 `MeetPR Demo`（只在本机验收树临时替换，不入仓），与正式包并存，debug 签名，仅供内部看界面，不对外分发。脚本 `~/Projects/scratch/rn-demo-20261010/pack.sh WORKTREE <apk> 1 http://demo.invalid`。

## 后续（2026-10-10 晚更新）

#80–#86 已获 David 放行并合入 main（#82 开了检查通过后自动合并）。本功能已挪到新基线：分支 `feat/demo-offline-mode`（= `fix/wordmark-unify@ae0e64c`，即七个 PR 全部合入后的代码树，加上演示模式的四个提交），173 suites / 1578 tests 全绿；从它出的演示包在模拟器飞行模式下四个 tab 冒烟正常，David 此前在真机上验过同源码的上一版包（「验收全部通过」）。对 main 开 PR（T2，等放行）。旧分支 `feat/demo-offline` 与 `integration/walkthrough-demo-20261010` 只用于出包，PR 合并后可删。
