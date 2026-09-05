import { Screen } from '@/design';
import { t } from '@/i18n';
import { Copy, pageContent } from '@/features/coach/ui';
// W2-c owns receiving, video queue and coach chat activation. studentId is its conversation intent.
export default function CoachMessages() {
  return <Screen style={pageContent}><Copy display size={34}>{t('coach.chat.messages')}</Copy></Screen>;
}
