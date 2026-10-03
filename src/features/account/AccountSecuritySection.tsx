import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ToastAndroid } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useQueryClient } from '@tanstack/react-query';
import { accountRepository } from '@/api/domains/account';
import { setsRepository } from '@/api/domains/sets';
import { exercisesRepository } from '@/api/domains/exercises';
import { ApiError } from '@/api/client';
import { useSessionStore } from '@/api/session';
import { AppButton, TextField } from '@/design';
import { t } from '@/i18n';
import { MyProfileDivider, MyProfileGroupCard, MyProfileSectionLabel, MyProfileValueRow, ProfileModal, ProfileText } from '@/features/profile/components';
import { csvFileName, trainingLogCSV } from './csv';
type Action = 'password' | 'export' | 'delete';
export function AccountSecuritySection({ studentId }: { studentId: string }) {
  const [action, setAction] = useState<Action | null>(null);
  return <>
    <MyProfileSectionLabel>{t('student.myProfileView.copy014')}</MyProfileSectionLabel>
    <MyProfileGroupCard><MyProfileValueRow title={t('student.accountSecuritySheets.copy001')} onPress={() => setAction('password')} /><MyProfileDivider /><MyProfileValueRow title={t('student.accountSecuritySheets.copy002')} onPress={() => setAction('export')} /><MyProfileDivider /><MyProfileValueRow danger title={t('student.accountSecuritySheets.copy003')} onPress={() => setAction('delete')} /></MyProfileGroupCard>
    {action === 'password' ? <ChangePasswordSheet onClose={() => setAction(null)} /> : null}
    {action === 'export' ? <ExportDataSheet studentId={studentId} onClose={() => setAction(null)} /> : null}
    {action === 'delete' ? <DeleteAccountScreen onClose={() => setAction(null)} /> : null}
  </>;
}
function utf8Length(value: string): number {
  return [...value].reduce((count, char) => { const code = char.codePointAt(0)!; return count + (code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4); }, 0);
}
function ChangePasswordSheet({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState('');
  const validation = utf8Length(oldPassword) > 72 || utf8Length(newPassword) > 72 ? t('appShell.auth.invalidPassword') : newPassword && newPassword.length < 8 ? t('student.accountSecurityViewModels.copy003') : confirm && newPassword !== confirm ? t('student.accountSecurityViewModels.copy004') : '';
  const valid = oldPassword.length >= 8 && newPassword.length >= 8 && utf8Length(oldPassword) <= 72 && utf8Length(newPassword) <= 72 && newPassword === confirm;
  const submit = async () => {
    if (!valid || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try { await accountRepository.changePassword({ old_password: oldPassword, new_password: newPassword }); ToastAndroid.show(t('student.accountSecuritySheets.copy004'), ToastAndroid.LONG); onClose(); }
    catch (failure) { setError(t(failure instanceof ApiError && failure.code === 'PASSWORD_MISMATCH' ? 'student.accountSecurityViewModels.copy005' : 'student.accountSecurityViewModels.copy006')); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <ProfileModal sheet title={t('student.accountSecuritySheets.copy001')} onClose={onClose} busy={busy}>
    <TextField label={t('student.accountSecuritySheets.copy014')} secureTextEntry autoCapitalize="none" autoCorrect={false} value={oldPassword} onChangeText={setOldPassword} editable={!busy} />
    <TextField label={t('student.accountSecuritySheets.copy015')} secureTextEntry autoCapitalize="none" autoCorrect={false} value={newPassword} onChangeText={setNewPassword} editable={!busy} />
    <TextField label={t('student.accountSecuritySheets.copy016')} secureTextEntry autoCapitalize="none" autoCorrect={false} value={confirm} onChangeText={setConfirm} editable={!busy} />
    {validation || error ? <ProfileText error>{validation || error}</ProfileText> : null}
    <AppButton label={t(busy ? 'student.accountSecuritySheets.copy018' : 'student.accountSecuritySheets.copy019')} disabled={!valid || busy} onPress={() => void submit()} />
  </ProfileModal>;
}
function DeleteAccountScreen({ onClose }: { onClose: () => void }) {
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState(false);
  const client = useQueryClient();
  const required = t('student.accountSecurityViewModels.copy001');
  const submit = async () => {
    if (word !== required || submitting.current) return;
    submitting.current = true; setBusy(true); setError(false);
    try { await accountRepository.deleteAccount(); client.clear(); await useSessionStore.getState().logout(); }
    catch { setError(true); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <ProfileModal title={t('student.accountSecuritySheets.copy003')} onClose={onClose} busy={busy}>
    <ProfileText>{t('student.accountSecuritySheets.copy005')}</ProfileText>
    {(['student.accountSecuritySheets.copy006', 'student.accountSecuritySheets.copy007', 'student.accountSecuritySheets.copy008', 'student.accountSecuritySheets.copy009'] as const).map((key) => <ProfileText key={key}>• {t(key)}</ProfileText>)}
    <TextField label={t('student.accountSecuritySheets.copy010', [required])} value={word} onChangeText={setWord} autoCapitalize="none" autoCorrect={false} editable={!busy} />
    {error ? <ProfileText error>{t('student.accountSecurityViewModels.copy002')}</ProfileText> : null}
    <AppButton variant="danger" label={t(busy ? 'student.accountSecuritySheets.copy011' : 'student.accountSecuritySheets.copy012')} disabled={word !== required || busy} onPress={() => void submit()} />
  </ProfileModal>;
}
function ExportDataSheet({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);
  const file = useRef<File | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([setsRepository.range(studentId, { from: '1970-01-01', to: '9999-12-31', scope: 'all' }), exercisesRepository.list()]).then(([{ logs }, { exercises }]) => {
      if (!active || useSessionStore.getState().user?.id !== studentId) return;
      const output = new File(Paths.cache, csvFileName());
      output.create({ overwrite: true });
      output.write(trainingLogCSV(logs, new Map(exercises.map((exercise) => [exercise.id, exercise]))));
      file.current = output; setState('ready');
    }).catch(() => { if (active) setState('failed'); });
    return () => { active = false; if (file.current?.exists) file.current.delete(); file.current = null; };
  }, [studentId, attempt]);
  const share = async () => {
    if (!file.current || sharing) return;
    setSharing(true);
    try { if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable'); await Sharing.shareAsync(file.current.uri, { mimeType: 'text/csv', dialogTitle: t('student.exportDataSheet.copy007') }); }
    catch { setState('failed'); }
    finally { setSharing(false); }
  };
  return <ProfileModal sheet title={t('student.exportDataSheet.copy007')} onClose={onClose} busy={sharing}>
    {state === 'loading' ? <><ActivityIndicator /><ProfileText>{t('student.exportDataSheet.copy002')}</ProfileText></> : state === 'failed' ? <><ProfileText error>{t('student.exportDataSheet.copy001')}</ProfileText><AppButton label={t('student.exportDataSheet.copy003')} onPress={() => { setState('loading'); setAttempt((n) => n + 1); }} /></> : <><ProfileText>{t('student.exportDataSheet.copy004')}</ProfileText><ProfileText>{t('student.exportDataSheet.copy005')}</ProfileText><AppButton label={t('student.exportDataSheet.copy006')} disabled={sharing} onPress={() => void share()} /></>}
  </ProfileModal>;
}
