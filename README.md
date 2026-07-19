# meetpr-rn

MeetPR 安卓端(React Native / Expo SDK 57,Android-only)。目标:1:1 复刻 iOS 端 `release/1.0`,详见 [PLAN.md](./PLAN.md)(施工蓝图)与 [PARITY.md](./PARITY.md)(逐屏复刻台账)。协作纪律见 [AGENTS.md](./AGENTS.md)。

## 开发

```bash
npm ci
npm run android   # 需要本机 Android SDK 与模拟器/真机
npm run lint
npx tsc --noEmit
npm test
```

后端指向 staging(可用 `EXPO_PUBLIC_API_BASE_URL` 覆盖)。CI 在 ubuntu runner 上跑 lint/tsc/jest/assembleDebug。

> App icon 与启动屏目前为占位资产,正式品牌资产在 W4 分发前替换(见 PARITY W4)。
