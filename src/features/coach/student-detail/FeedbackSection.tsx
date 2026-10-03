import { View } from 'react-native';
import type { FeedbackItem } from '@/api/domains/feedback';
import { radius, useColors } from '@/design';
import { localDate } from '@/domain/coach/detail-week';
import { t } from '@/i18n';
import { Copy, Empty, SectionCard, styles } from './components';
import { dateText, relativeText } from './presentation';

export function FeedbackSection({ items, planExerciseName, now }: { items: readonly FeedbackItem[]; planExerciseName: (id: string | null) => string | null; now: Date }) {
  const colors = useColors();
  return <View style={styles.stack}>
    <View style={styles.between}><Copy mono size={12}>{t('coach.feedback.recordCount %lld', [items.length])}</Copy><Copy size={11} tone="textDisabled" style={{ flexShrink: 1 }}>{t('coach.feedback.writeFromVideo')}</Copy></View>
    {!items.length && <Empty title={t('coach.feedback.empty')} />}
    {items.map((item) => {
      const topic = planExerciseName(item.plan_exercise_id) ?? (item.video_id ? t('coach.feedback.videoFeedback') : item.day_date ? dateText(localDate(item.day_date)) : null);
      return <SectionCard key={item.id}><View style={styles.between}>
        <Copy mono size={11} tone="textTertiary">{relativeText(item.posted_at, now)}</Copy>
        {topic && <View style={{ borderWidth: 1, borderColor: colors.borderDefault, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4, flexShrink: 1 }}><Copy size={11}>{topic}</Copy></View>}
      </View><Copy style={{ lineHeight: 21 }}>{item.text}</Copy></SectionCard>;
    })}
  </View>;
}
