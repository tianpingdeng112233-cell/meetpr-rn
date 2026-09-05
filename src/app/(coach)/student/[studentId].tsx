import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/design';
import { t } from '@/i18n';
import { useCoachData } from '@/features/coach/CoachDataProvider';
import { Action, Copy, pageContent } from '@/features/coach/ui';
// W2-b replaces this destination while retaining the agreed route identity.
export default function StudentDetailPlaceholder() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const { rows } = useCoachData();
  const router = useRouter();
  return <Screen style={pageContent}><Action label={t('coach.detail.backToStudents')} onPress={() => router.back()} /><Copy display size={32}>{rows.find(row => row.student.id === studentId)?.student.displayName ?? t('coach.shell.students')}</Copy></Screen>;
}
