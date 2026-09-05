import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, font, useColors } from '@/design';
import { t } from '@/i18n';
import type { PlanDetail } from '@/api/domains/plans';
import {
  currentWeekDays,
  cursorDay,
  recommendedDate,
  sequenceDays,
} from '@/domain/plan/sequence';
import {
  dayName,
  daySummary,
  recommendedDateText,
} from '@/domain/plan/presentation';
import type { ExerciseMetadataResolver } from './exercise-metadata';

export function TrainingCalendarView({
  plan,
  selectedDayID,
  onSelectDay,
  resolveExerciseMetadata,
}: {
  plan: PlanDetail;
  selectedDayID: string | null;
  onSelectDay: (id: string) => void;
  resolveExerciseMetadata: ExerciseMetadataResolver;
}) {
  const colors = useColors();
  const currentWeek = currentWeekDays(plan.days)[0]?.week_number ?? 1;
  const cursor = cursorDay(plan.days);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const sorted = sequenceDays(plan.days);
  const weeks = [
    ...new Set(
      sorted
        .filter((day) => day.week_number >= currentWeek)
        .map((day) => day.week_number),
    ),
  ];
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Text style={{ color: colors.textSecondary, ...font.mono(12) }}>{t('student.trainingCalendarView.copy001')}</Text>
        <Text style={{ color: colors.textMuted, ...font.mono(11) }}>
          {t('student.trainingCalendarView.copy002', [
            sorted.filter((day) => day.completed_at != null).length,
            sorted.length,
          ])}
        </Text>
      </View>
      {weeks.map((week) => {
        const days = sorted.filter((day) => day.week_number === week);
        const open = expanded[week] ?? week === currentWeek;
        const done = days.filter((day) => day.completed_at != null).length;
        return (
          <View key={week} style={{ gap: 7 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() =>
                setExpanded((current) => ({ ...current, [week]: !open }))
              }
              style={{
                backgroundColor: colors.bgStack,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.borderHairline,
                minHeight: 44,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 14,
                paddingVertical: 11,
                gap: 10,
              }}
            >
              <Text
                style={{ color: colors.textSecondary, ...font.display(13) }}
              >
                W{week}
              </Text>
              {week === currentWeek ? (
                <Text style={{ color: colors.goldText, ...font.mono(10, 'bold'), letterSpacing: 0.6, backgroundColor: colors.goldSoft, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 }}>{t('student.trainingCalendarView.copy006')}</Text>
              ) : null}
                <Text
                  numberOfLines={1}
                  style={{ color: colors.textMuted, ...font.body(13), flex: 1 }}
                >
                  {days
                    .map((day) => dayName(day, resolveExerciseMetadata, true))
                    .join(' · ')}
                </Text>
                <Text style={{ color: colors.textMuted, ...font.mono(11) }}>
                  {t(
                    week === currentWeek
                      ? 'student.trainingCalendarView.copy003'
                      : 'student.trainingCalendarView.copy005',
                    week === currentWeek
                      ? [done, days.length]
                      : [
                          days.length,
                          recommendedDateText(recommendedDate(plan, days[0])),
                        ],
                  )}
                </Text>
              <MaterialCommunityIcons name="chevron-right" size={10} color={colors.textDim} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
            </Pressable>
            {open
              ? <Card style={{ paddingHorizontal: 13, paddingVertical: 0, borderRadius: 14, overflow: 'hidden' }}>{days.map((day) => {
                  const done = day.completed_at != null;
                  const current = day.id === cursor?.id;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: day.id === selectedDayID,
                      }}
                      key={day.id}
                      onPress={() => onSelectDay(day.id)}
                    >
                      <View
                        style={{
                          paddingVertical: 10,
                          backgroundColor: day.id === selectedDayID ? `${colors.goldRGB}14` : 'transparent',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <View
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: current
                              ? `${colors.goldRGB}1F`
                              : colors.bgInset,
                          }}
                        >
                          <Text
                            style={{
                              color: current
                                ? colors.gold500
                                : colors.textPrimary,
                              ...font.mono(12),
                            }}
                          >
                            D{day.day_of_week}
                          </Text>
                        </View>
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text
                            style={{
                              color: colors.textPrimary,
                              ...font.body(13, 'bold'),
                            }}
                          >
                            {dayName(day, resolveExerciseMetadata, true)}
                          </Text>
                          <Text
                            style={{
                              color: colors.textMuted,
                              ...font.mono(10),
                            }}
                          >
                            {daySummary(day)}
                          </Text>
                          <Text
                            style={{ color: colors.textDim, ...font.body(10) }}
                          >
                            {t('student.dashboardPrimaryAction.copy009', [
                              recommendedDateText(recommendedDate(plan, day)),
                            ])}
                          </Text>
                        </View>
                        {done ? <MaterialCommunityIcons name="check-circle" color={colors.success} size={16} /> : <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: current ? 0 : 1, borderColor: colors.textGhost, backgroundColor: current ? colors.gold500 : 'transparent' }} />}
                      </View>
                    </Pressable>
                  );
                })}</Card>
              : null}
          </View>
        );
      })}
    </View>
  );
}
