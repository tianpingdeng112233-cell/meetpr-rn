import { useState } from 'react';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';
import { font, useColors } from '@/design';
import { videoDuration } from './student-timeline';

/** Fills an existing cover; the parent retains its fallback, geometry and playback action. */
export function ChatVideoCover({ posterURL, durationSeconds, compact = false }: {
  posterURL?: string | null; durationSeconds?: number | null; compact?: boolean;
}) {
  const colors = useColors();
  const duration = videoDuration(durationSeconds);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
    {posterURL ? <PosterImage key={posterURL} url={posterURL} /> : null}
    <View style={{ width: compact ? 26 : 42, height: compact ? 26 : 42, borderRadius: compact ? 13 : 21,
      backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: compact ? 0 : 1.5, borderColor: `${colors.ctaTopHighlight}BF`, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="play" size={compact ? 20 : 15} color={colors.ctaTopHighlight} />
    </View>
    {duration ? <Text testID="chat.videoDuration" style={{ position: 'absolute', bottom: compact ? 0 : 8, right: compact ? 0 : 9,
      ...font.mono(10), color: colors.ctaTopHighlight, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: compact ? 2 : 6, paddingVertical: compact ? 0 : 2, borderRadius: 5 }}>{duration}</Text> : null}
  </View>;
}

function PosterImage({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return failed ? null : <Image source={{ uri: url }} contentFit="cover" cachePolicy="memory-disk" accessible={false}
    onLoad={() => setLoaded(true)} onError={() => setFailed(true)} style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]} />;
}
