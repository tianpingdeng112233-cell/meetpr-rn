import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { font } from '@/design';
import { t } from '@/i18n';
import { presentBadge, type VideoBadgeForm } from './badge-presentation';
import { VideoBadgePalette as palette } from './badge-palette';
import { badgeWordmark } from './badge-wordmark';
import { VideoBadgeLogoMark } from './VideoBadgeLogoMark';
import type { VideoBadgeInfo } from './types';

export function VideoBadgeCard({ info, form, scale: s }: {
  info: VideoBadgeInfo;
  form: VideoBadgeForm;
  scale: number;
}) {
  const badge = presentBadge(info, form);
  if (!badge || !(s > 0)) return null;
  const { exerciseName, weightText, reps, rpeText, setOrdinal } = badge;
  const hasLoad = weightText !== null || reps !== null;
  // Artwork uses design units in both playback dp and export pixels.
  const number = (size: number) => [styles.number, font.body(size * s, 'semibold')];
  return <View style={{ alignSelf: 'flex-start', maxWidth: 452 * s, borderRadius: 22 * s,
    paddingHorizontal: 22 * s, paddingTop: 17 * s, paddingBottom: 19 * s, backgroundColor: palette.cardFill }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 23 * s }}>
      <VideoBadgeLogoMark size={23 * s} />
      <View style={{ marginLeft: 7 * s }}>
        <SvgXml xml={badgeWordmark} width={21 * s * 2443 / 605} height={21 * s} accessibilityLabel="MEETPR" />
      </View>
      {setOrdinal !== null ? <Text allowFontScaling={false} style={{ ...font.body(15 * s), includeFontPadding: false,
        marginLeft: 'auto', paddingLeft: 24 * s, color: palette.ordinal }}>
        {[t('chat.videoBadge.setPrefix'), setOrdinal, t('chat.videoBadge.setSuffix')].filter(value => value !== '').join(' ')}
      </Text> : null}
    </View>
    {exerciseName !== null ? <Text allowFontScaling={false} numberOfLines={1} ellipsizeMode="tail"
      style={{ ...font.body(19 * s, 'medium'), includeFontPadding: false, marginTop: 12 * s, color: palette.label }}>{exerciseName}</Text> : null}
    {hasLoad || rpeText !== null ? <View style={[styles.row, { marginTop: (exerciseName ? 5 : 12) * s, columnGap: 30 * s }]}>
      {hasLoad ? <View style={[styles.row, { columnGap: 7 * s }]}>
        {weightText !== null ? <>
          <Text allowFontScaling={false} style={number(38)}>{weightText}</Text>
          <Text allowFontScaling={false} style={[styles.unit, font.body(20 * s, 'medium')]}>kg</Text>
        </> : null}
        {reps !== null ? <Text allowFontScaling={false} style={number(weightText === null ? 38 : 29)}>{`× ${reps}`}</Text> : null}
      </View> : null}
      {rpeText !== null ? <View style={[styles.row, { columnGap: 6 * s }]}>
        <Text allowFontScaling={false} style={[styles.unit, font.body(17 * s, 'medium')]}>RPE</Text>
        <Text allowFontScaling={false} style={number(24)}>{rpeText}</Text>
      </View> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
  number: { color: palette.text, fontVariant: ['tabular-nums'], includeFontPadding: false },
  unit: { color: palette.unit, includeFontPadding: false },
});
