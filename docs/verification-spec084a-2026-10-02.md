# Spec 084 卡 A（安卓）· 收货记录 · 2026-10-02

卡：[CARD-A-android](../specs/084-walkthrough-polish/CARD-A-android.md)，口径见同目录 SPEC §2、§3、§5、§6。RN 基线 `44b6c80`（PR #68 顶）。实装方 Codex，收货方 Opus，无返修。

环境：AVD `meetpr`（Android 15）+ 本地合成 API 与合成账号，debug 签名 fixture 包。合成计划第 3 周的训练日在周一与周四（`day_of_week` 为 1、4）。未做真机验证，未在 Global 真账号上验证。

## 逐项结论

| 验收项 | 结论 | 证据 |
|---|---|---|
| §2 序号 | 通过。Today 页头 W3D1、周条 D1 / D2（修改前是 D1 / D4）；训练页页头、周条、Plan summary 一致；推荐日期仍是 Mon 9/21、Thu 9/24 | [Today](evidence/spec084a-20261002/today-ordinals-and-cards.png) |
| §3 卡片可点 | 通过。体重卡进 Basic information，改 84 保存后回 Today 即时显示 84 kg；系统返回等同取消，回 Today 不写。Meetday 空态卡进 Meet / notes，Cancel 回 Today | [体重编辑](evidence/spec084a-20261002/basic-info-editor-from-today.png)、[比赛编辑（Dark）](evidence/spec084a-20261002/meet-editor-from-today-dark.png) |
| §5 去横幅 | 通过。全新安装后记下第一组（原先会出 "First record" 横幅），训练页无横幅；休息计时照常开始 | [截图](evidence/spec084a-20261002/training-no-pr-banner-after-first-set.png) |
| §6 提醒默认日 | 通过。清空应用数据后首次打开，默认选中周一、周四（取自计划推荐日期），Profile 摘要同为 Mon·Thu；升级前已保存的 Mon·Wed·Fri 设置在新包上原样保留 | [截图](evidence/spec084a-20261002/reminder-default-from-plan.png) |
| D-31 RPE 刻度 | 通过。360×640 dp、字体 1.3× 下数字完整 | [截图](evidence/spec084a-20261002/rpe-scale-360dp-1.3x.png) |

## 没验到的

- "补加一个更早的训练日后重排"与教练端学员详情的序号：只有单测与读代码（教练端改走同一个 `dayCode` 入口）。
- Meetday 有值态卡片的点击：合成档案没有比赛日期，只验了空态；两态走同一个回调。
- 提醒默认日的两级回落（无计划 → 档案训练日 → 一三五）：单测覆盖。
- Progress 页在记组后出现对应点：没有单独打开看，本卡未改 Progress 与 PR 判定。

## 说明

Today 卡片进入的编辑页是 Profile 已有的编辑器，路由上落在 Profile 页并带返回目标；保存或取消后回到 Today。iOS 的做法是在 Today 的导航栈里推入同一个编辑页，用户看到的流程一致。

## 自动检查

收货方复跑：`npx jest --runInBand` 137 suites / 1003 tests、`npx tsc --noEmit`、`npm run lint` 通过。
