import type AsyncStorage from '@react-native-async-storage/async-storage';

import { VIDEO_UPLOAD_CONSENT_KEY } from './model';

export const VIDEO_UPLOAD_CONSENT_TITLE = '视频上传须知';
export const VIDEO_UPLOAD_CONSENT_MESSAGE =
  '你上传的训练视频将仅你绑定的教练可见。MeetPR 不会向其他人公开你的视频。';

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
    title: VIDEO_UPLOAD_CONSENT_TITLE,
    message: VIDEO_UPLOAD_CONSENT_MESSAGE,
    acceptLabel: '同意上传',
    declineLabel: '不上传',
  });
  if (accepted) {
    await storage.setItem(VIDEO_UPLOAD_CONSENT_KEY, 'true');
  }
  return accepted;
}
