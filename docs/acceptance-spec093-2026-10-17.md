# Spec 093 代码验收（Claude，2026-10-17）

对象：Codex 交付的 `docs/verification-spec093-2026-10-17.md`（分支 `verify/093-android-invites`）及 6 个 PR。范围是**代码与本地证据**；国内 staging 部署与整条链路实测尚未进行（等 David 批准部署清单），不在本次验收内。

## 结论：代码验收通过，附 2 个合并前条件

| PR | 结论 | 我核对了什么 |
|---|---|---|
| backend #298（B0 记录） | 通过 | 只改文档；B0 已由 David 实测通过 |
| backend #299（B） | 通过 | 新接口全挂在 `COACH_ONBOARDING_ENABLED` 开关后，默认关；管理接口在 admin 角色 + 实时查库之后；审批在一个事务里建号、建码、发设密令牌，邮箱已是学员时拒绝且不转换；设密令牌 32 字节随机、只存哈希、7 天、单次有效、按 purpose 与六位找回码隔离；公开查码只返回有效性与教练名、限速；迁移 0075 只加表加列。CI 两项绿 |
| plan-web #109（W0） | 通过 | 登录兼容手机号、管理台邮箱列与搜索、网页忘记密码四状态截图 |
| plan-web #110（W） | 通过 | 落地页按设备分流、失效码、审批确认与结果、入驻完成页复制消息与二维码；截图亲看。plan-web 无 CI |
| iOS #366（I1/I2） | 通过（待 CI） | CN 走邮箱登录注册找回，Apple/Google 只在 Global 显示；邀请消息与认码与安卓一致。`Swift Build & Test` 验收时仍在跑 |
| RN #95（R-verify） | 通过（待 CI） | Codex 补的两处修复（长消息粘贴撑高、填对码后清掉旧提示）正确并有测试；全量 180 套件 1718 条通过；截图亲看。`android-build` 验收时仍在跑 |

**合并前条件**：① iOS #366 的 `Swift Build & Test` 变绿；② RN #95 的 `android-build` 变绿。

## 不阻塞的问题（建议顺手改或登记）

1. 落地页第 3 步写「点『粘贴』」，App 按钮实际叫「粘贴邀请码」。改成一致。
2. 安装链接是构建时变量（`VITE_CN_TESTFLIGHT_URL` / `VITE_CN_ANDROID_URL`），换链接要重新构建并换装网页，不是「改配置即可」。可接受，部署清单里要写明这两个值。
3. 已审批但还没设密码的教练，登录被拒依赖 bcrypt 拒绝占位哈希，没有专门的测试。风险低，建议补一条。
4. 被拒绝的申请人不能用同一邮箱再申请（唯一索引覆盖所有状态）。若想允许再申请，需另开小卡。
5. iOS 模拟器早期误连真实 staging，给一个合成邮箱发了 3 次注册验证码，没有建号。Codex 已如实披露，无需处理。
6. `w-admin-applications.jpg` 显示「待处理」却带「操作成功」提示，属于截图时序问题；`w-admin-approved.jpg` 正确。

## 接下来

1. 两个 CI 变绿后，按序合并：backend #298 → #299 → plan-web #109 → #110 → iOS #366 → RN #95。
2. David 批准 Codex 的部署清单（新的全库备份 → 0075 → 后端配置 `COACH_ONBOARDING_ENABLED=true`、`COACH_ONBOARDING_URL` → plan-web 带两个安装链接构建换装），Codex 执行并在 staging 走完整条链路。
3. David 手动验三项（两端忘记密码、QQ/163 收信、iOS 老用户升级）。
4. 以上都过，再发 iOS TestFlight 与安卓 APK。B0 已完成，iOS 发包前置已满足；网页落地页上线后，带「复制整段邀请消息」的 App 包才能发。
