import { Text, View } from 'react-native';
import { font, MeetPRMark } from '@/design';
import { t } from '@/i18n';
import { presentBadge } from './badge-presentation';
import { VideoBadgePalette as palette } from './badge-palette';
import { VideoBadgeLogoMark } from './VideoBadgeLogoMark';
import type { VideoBadgeInfo } from './types';

export function VideoBadgeCard({ info, width, includesCoachAttribution = false }: {
  info: VideoBadgeInfo;
  width: number;
  includesCoachAttribution?: boolean;
}) {
  const badge = presentBadge(info);
  // Android rejects a 0 font size (and letterSpacing on it); wait for a measured width.
  if (!(width > 0)) return null;
  const s = width / 468;
  const suffix = t('chat.videoBadge.setSuffix');
  return <View style={{ width, gap: 10 * s, paddingTop: 13 * s, paddingHorizontal: 14 * s, paddingBottom: 14 * s,
    borderRadius: 14 * s, backgroundColor: palette.cardFill, borderColor: palette.cardStroke, borderWidth: Math.max(1, s) }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 * s }}>
      <VideoBadgeLogoMark size={22 * s} />
      {/* Convert the 16*s slot height to the canonical 16pt / 24dp scale. */}
      <MeetPRMark fontSize={16 * s * (16 / 24)} strokeColor={palette.ink}
        fillColor={palette.wordmarkCounter} accessibilityLabel="MEETPR" />
      <View style={{ flex: 1, minWidth: 8 * s }} />
      {badge.setOrdinal !== null ? <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 * s }}>
        <Text style={{ ...font.mono(10 * s), color: palette.muted }}>{t('chat.videoBadge.setPrefix')}</Text>
        <Text style={{ ...font.display(13 * s, 'extraBold'), color: palette.text }}>{badge.setOrdinal}</Text>
        {suffix ? <Text style={{ ...font.mono(10 * s), color: palette.muted }}>{suffix}</Text> : null}
      </View> : null}
    </View>
    {badge.exerciseName !== null ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}
      style={{ ...font.body(14 * s, 'bold'), letterSpacing: -0.14 * s, color: palette.text }}>{badge.exerciseName}</Text> : null}
    {badge.hasLoad || badge.rpeText !== null ? <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 9 * s }}>
      {badge.weightText !== null ? <>
        <Text style={{ ...font.display(30 * s, 'extraBold'), fontVariant: ['tabular-nums'], letterSpacing: -0.6 * s, color: palette.text }}>{badge.weightText}</Text>
        <Text style={{ ...font.mono(14 * s), color: palette.muted, paddingBottom: 3 * s }}>kg</Text>
      </> : null}
      {badge.reps !== null ? <Text style={{ ...font.display(20 * s, 'extraBold'), fontVariant: ['tabular-nums'], color: palette.dim, paddingBottom: s }}>{`× ${badge.reps}`}</Text> : null}
      <View style={{ flex: 1, minWidth: 8 * s }} />
      {badge.rpeText !== null ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 * s, paddingHorizontal: 9 * s,
        height: 22 * s, borderRadius: 11 * s, backgroundColor: `${palette.gold}26`, borderColor: `${palette.gold}6B`, borderWidth: Math.max(1, s) }}>
        <Text style={{ ...font.mono(9 * s), letterSpacing: 0.9 * s, color: palette.gold }}>RPE</Text>
        <Text style={{ ...font.display(15 * s, 'extraBold'), color: palette.gold }}>{badge.rpeText}</Text>
      </View> : null}
    </View> : null}
    {includesCoachAttribution && badge.coachName !== null ? <Text numberOfLines={1}
      style={{ ...font.mono(10 * s, 'medium'), color: palette.muted }}>{t('chat.videoBadge.coach %@', [badge.coachName])}</Text> : null}
  </View>;
}
