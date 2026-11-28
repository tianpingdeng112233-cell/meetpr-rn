# 安卓视频上传期间继续播放音乐

学员要求打开相机或从相册上传视频时，手机里的音乐能继续播放。基线为 main 的 bcd128f。拍摄回看、相册裁剪和聊天发送前预览均使用 react-native-video 6.19.2，其安卓默认行为会在播放时申请 AUDIOFOCUS_GAIN。本次对这些上传预览及聊天待发送缩略图启用 disableFocus。麦克风继续采集现场声音。范围限于安卓上传流程。

## 模拟器复现与验收

AVD meetpr，Android API 35。独立测试应用循环播放音频，持有系统音频焦点，收到焦点丢失事件即暂停。通过 adb logcat 与 dumpsys audio 同时检查回调、焦点持有者及播放器状态。

- 修前在既有训练 Demo 的组行打开相机并完成录像。进入回看时，系统日志记录 ReactExoplayerView 请求 gain=1，音乐进程收到 focus=-1，状态变为 paused。
- 修后使用本分支的 production JS bundle 与同版本播放器的既有安卓原生 QA 壳。音乐进程在取景、录制、[自动回看](../evidence/android-upload-music/camera-review.png)、系统选片、选定视频以及[裁剪预览播放](../evidence/android-upload-music/album-preview.png)各阶段均为 started，焦点持有者仍为音乐应用。播放裁剪预览时，系统同时显示两个应用的音轨为 started。
- 首次修后录制在模拟器编码阶段返回 ERROR_NO_VALID_DATA。重试成功生成五秒录像并进入回看，音乐在两次尝试中持续播放。
- 聊天选片预览通过组件回归验证。当前设备验收使用独立模拟播放器，学员实体手机和实际音乐应用尚待验证。

## 测试与审查

三条预览路径的音频焦点断言修前失败，修后 119 项相关测试通过。全量 232 套、2532 项 Jest 测试通过，TypeScript、Expo lint 和 git diff --check 通过。

Standards 与 Spec 分别由独立只读 reviewer 审查，无待返修项。P1 下一班安卓包候选。
