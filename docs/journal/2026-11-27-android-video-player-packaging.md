# Android CN18 学员选片和反馈回看闪退

David 确认随下一班 Android 发版。Android 发版分支为 main，本卡使用现有版本号。

## 两条路径，同一个异常

11:20 录屏中，系统相册能播放 11 秒视频。点完成后，MeetPR 的「编辑视频」刚出现，用户尚未保存即退桌面。18:37 录屏中，学员从教练反馈封面打开回看时连续退出两次，第二次可见播放器弹层。

既往未复现的 CN18 演示包带有仓内 react-native-video 6.19.2 兼容补丁。点对点正式包的 SHA-256 为 dc5331550b9bbfa611508ffd8cf404ef8bd3e43391909b9853c83ac5e53eb303。反汇编其实物，ReactExoplayerView.initializePlayerCore 调用旧的 RNVLoadControl，后者依赖随包 Media3 已移除的构造器。正式 CN17 使用 DefaultLoadControl.Builder。

在 meetpr16（API 36、arm64）上以隔离 QA 包名和合成数据复跑。取 CN18 正式包的全部 DEX、原生库及资源，替换 QA manifest 和内置 JS 数据场景，使用本机测试签名。测试视频为合成的 11 秒 H.264，不需要学员账号或原片。

| 入口 | CN18 正式包原生代码的复现结果 |
| --- | --- |
| 训练组摄像机 → 相册 → 选片 → 完成 | 裁剪页打开后进程 7927 退出 |
| 教练 → 视频反馈 → 点击封面 | 播放器打开后进程 7737 退出 |

两者均由主线程抛出 java.lang.NoSuchMethodError。相同的最上层应用帧为 ReactExoplayerView$RNVLoadControl.<init>（568）和 ReactExoplayerView.initializePlayerCore（724），缺失构造器为 DefaultLoadControl(DefaultAllocator, int, int, int, int, int, boolean, int, boolean)。学员真机栈未采集。

## 回归与发版

干净的 npm ci 通过既有 postinstall 应用仓内 patch。打包脚本现检查最终 release APK 中实际调用的构造路径，检查失败会在复制交付 APK 前退出。Android CI 对组装好的 debug APK 执行同一检查。历史实物交叉验证为正式 CN17 通过、正式 CN18 拒绝。

在同一学员反馈场景换回含补丁的同版原生产物后，视频播放至 0:11 / 0:11，显示两条教练标注，原进程 8306 存活。之前同版演示验证也能从相册进入裁剪并显示 H.264 首帧。下一班候选的两条设备复测结果见本卡 PR。
