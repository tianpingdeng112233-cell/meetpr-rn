import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/design';
import { hasVideoDeliveryFailure } from './delivery-failures';
import type { VideoUploadRecord } from './model';

// The height excludes font leading, so half of the transfer fills half of the camera.
const width = 20;
const height = width * 29 / 45;
const camera = 'M6 1.4h20a4.7 4.7 0 0 1 4.7 4.7v17a4.7 4.7 0 0 1-4.7 4.7H6a4.7 4.7 0 0 1-4.7-4.7v-17A4.7 4.7 0 0 1 6 1.4ZM31 10.3l10.7-7.1q1.9-1.2 1.9 1.3v20q0 2.3-1.9 1.1L31 18.5Z';

type CameraState = 'empty' | 'sending' | 'delivered' | 'failed';

export function setVideoCameraState(record: VideoUploadRecord, delivered: boolean, preparing = false): CameraState {
  if (delivered) return 'delivered';
  if (record.status === 'uploading') return 'sending';
  if (hasVideoDeliveryFailure(record)) return 'failed';
  return record.status === 'none' && !preparing ? 'empty' : 'sending';
}

export function SetVideoCamera({ state, fraction }: { state: CameraState; fraction: number }) {
  const colors = useColors();
  const color = { empty: colors.textMuted, sending: colors.gold500, delivered: colors.success, failed: colors.danger }[state];
  return <View accessible={false} style={{ width, height }}>
    <Svg width={width} height={height} viewBox="0 0 45 29" accessible={false}>
      <Path d={camera} stroke={color} strokeWidth={2.6} strokeLinejoin="round" fill={fraction >= 1 ? color : 'none'} />
    </Svg>
    {fraction > 0 && fraction < 1 ? <View testID="set-video-fill" pointerEvents="none"
      style={{ position: 'absolute', bottom: 0, width, height: height * fraction, overflow: 'hidden' }}>
      <Svg width={width} height={height} viewBox="0 0 45 29" accessible={false} style={{ position: 'absolute', bottom: 0 }}>
        <Path d={camera} fill={color} />
      </Svg>
    </View> : null}
  </View>;
}
