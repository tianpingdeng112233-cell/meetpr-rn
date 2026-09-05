import { t } from '@/i18n';
import type AsyncStorage from '@react-native-async-storage/async-storage';

import { VIDEO_UPLOAD_CONSENT_KEY } from './model';

export const VIDEO_UPLOAD_CONSENT_TITLE = t('student.videoPrivacyCopy.copy001');
export const VIDEO_UPLOAD_CONSENT_MESSAGE = t(
  'student.videoPrivacyCopy.copy002',
);

type ConsentStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
type ConsentPrompt = (input: {
  title: string;
  message: string;
  acceptLabel: string;
  declineLabel: string;
}) => Promise<boolean>;

export async function requestVideoUploadConsent(
  storage: ConsentStorage,
  prompt: ConsentPrompt,
): Promise<boolean> {
  if ((await storage.getItem(VIDEO_UPLOAD_CONSENT_KEY)) === 'true') {
    return true;
  }

  const accepted = await prompt({
    title: t('student.videoPrivacyCopy.copy001'),
    message: t('student.videoPrivacyCopy.copy002'),
    acceptLabel: t('student.videoPrivacyCopy.copy003'),
    declineLabel: t('student.videoPrivacyCopy.copy004'),
  });
  if (accepted) {
    await storage.setItem(VIDEO_UPLOAD_CONSENT_KEY, 'true');
  }
  return accepted;
}
