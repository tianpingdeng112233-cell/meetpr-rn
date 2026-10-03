import * as Clipboard from 'expo-clipboard';

export interface InviteClipboard {
  setString(value: string): Promise<void>;
}

// Keep failures visible: never show "Copied" without a successful native write.
export const inviteClipboard: InviteClipboard = {
  async setString(value) {
    await Clipboard.setStringAsync(value);
  },
};
