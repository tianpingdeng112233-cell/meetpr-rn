import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';
import { FeedbackPressable as Pressable } from '@/design/FeedbackPressable';
import { font, useColors } from '@/design';
import { t } from '@/i18n';
import { dayCode } from '@/domain/plan/sequence';
import { recommendedDateText } from '@/domain/plan/presentation';
import type { DashboardWeekDay } from './types';

function WeekRecommendationLabel() {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <MaterialCommunityIcons name="calendar-blank-outline" size={11} color={colors.textDisabled} />
      <Text numberOfLines={1} style={{ ...font.mono(11), color: colors.textMuted }}>
        {t('student.dashboardWeekCalendar.copy014')}
      </Text>
    </View>
  );
}

export function WeekCalendar({
  headerStyle,
  weekNumber,
  cells,
  selectedDayID,
  onSelect,
}: {
  headerStyle: 'progress' | 'currentWeek';
  weekNumber: number;
  cells: DashboardWeekDay[];
  selectedDayID: string | null;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  if (!cells.length) return null;
  const done = cells.filter((cell) => cell.status === 'done').length;
  return (
    <View style={{ gap: 10 }}>
      {headerStyle === 'progress' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ ...font.mono(13), color: colors.textSecondary }}>{t('student.dashboardWeekCalendar.copy012')}</Text>
            <Text style={{ ...font.mono(11, 'bold'), color: colors.textSecondary }}>{done} / {cells.length}</Text>
          </View>
          <WeekRecommendationLabel />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...font.display(14), color: colors.textPrimary }}>W{weekNumber}</Text>
            <Text style={{ ...font.mono(10, 'bold'), letterSpacing: 0.6, color: colors.goldText, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: `${colors.gold500}24` }}>
              {t('student.dashboardWeekCalendar.copy013')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ ...font.mono(11), color: colors.textMuted }}>{done} / {cells.length}</Text>
            <View style={{ width: 1, height: 10, backgroundColor: colors.borderStrong }} />
            <WeekRecommendationLabel />
          </View>
        </View>
      )}
      <WeekGrid days={cells} selectedDayID={selectedDayID} onSelect={onSelect} />
    </View>
  );
}

export function WeekGrid({
  days,
  selectedDayID,
  onSelect,
}: {
  days: DashboardWeekDay[];
  selectedDayID: string | null;
  onSelect: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {days.map(({ day, status, date }) => (
        <Pressable
          key={day.id}
          accessibilityRole="button"
          accessibilityLabel={`${dayCode(day)} ${recommendedDateText(date)}`}
          accessibilityState={{ selected: selectedDayID === day.id }}
          onPress={() => onSelect(day.id)}
          style={{
            minWidth: 0,
            flex: 1,
            minHeight: 58,
            borderRadius: 12,
            alignItems: 'center',
            padding: 6,
            justifyContent: 'center',
            gap: 5,
            backgroundColor:
              status === 'current'
                ? `${colors.goldRGB}1F`
                : status === 'done'
                  ? colors.surfaceCard
                  : colors.bgInset,
            borderWidth: status === 'current' ? 1.5 : 0,
            borderColor: colors.gold500,
          }}
        >
          {status === 'done' ? <MaterialCommunityIcons name="check" size={11} color={colors.success} /> : <View style={{ width: 7, height: 7, borderRadius: 3.5, borderWidth: status === 'current' ? 0 : 1, borderColor: colors.textGhost, backgroundColor: status === 'current' ? colors.gold500 : 'transparent' }} />}
          <Text style={{ color: status === 'current' ? colors.textPrimary : colors.textMuted, ...font.mono(10, status === 'current' ? 'bold' : 'semibold') }}>D{day.day_of_week}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: status === 'current' ? colors.textSecondary : colors.textMuted, ...font.mono(10) }}>{recommendedDateText(date)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
