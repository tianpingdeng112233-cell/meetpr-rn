# Backend iOS 假设排查(2026-07-19,staging 分支现场侦察)

> 结论:安卓接入**近乎零后端改动**,唯一必改是埋点平台枚举。行号为侦察当日快照,动手前现场核实。

## 零改动项 ✅
- **Auth**:`verifyBearerToken` 只校验 Bearer/HS256/aud/iss/exp,不读 User-Agent/X-Platform/版本 header;token 签发无客户端分支。refresh body 同时接受 `refresh_token`(iOS)与 `refreshToken`(web),包容性写法,安卓任选。
- **多设备会话(0039)**:sessions 表无 device/platform 列;上限 5 个按 `last_used_at` 最旧撤销,平台无关,安卓登录不踢人不被拒。
- **OSS 上传**:initiate/complete 仅鉴权,content-type 白名单含 `video/mp4`,安卓直传通过。
- **CORS/FORCE_HTTPS/legacy-token**:对原生客户端中性;FORCE_HTTPS 当前关;新客户端全新 token 不走 legacy 路径。

## 必改(一张 backend 小卡,P1)❌
- `src/db/types.ts:124` `EVENT_PLATFORMS = ['ios']` → 加 `'android'`,自动传导至 `events/schemas.ts` 信封枚举。否则安卓埋点批量上报 400 **全批丢弃**。DB 层 0029 是自由 text 无 CHECK,不用迁移。
- ⚠️ RN 客户端在后端改动上线前**必须显式传 `platform`**,不可省略——省略会被 `.default('ios')` 误标污染数据。

## 推迟项(v1 不做,防复活提醒:推送在 iOS 端也未做)
- 设备注册 `devices.ts` `z.literal('ios')` + 0042 `CHECK(platform='ios')`:安卓注册 token 会 400。仅在将来做推送时放宽(需新迁移 + FCM/厂商通道,现 APNs-only 且 `PUSH_ENABLED=false` 全链休眠)。
