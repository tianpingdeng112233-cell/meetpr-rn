import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { font, radius, Screen, spacing, useColors } from '@/design';
import { t } from '@/i18n';
import { useCoachData } from '../CoachDataProvider';
import { Copy, EmptyState, Icon, pageContent, rowStyle } from '../ui';
import { useState } from 'react';
import { isAbnormal, resolveRosterState } from './roster-state';
import { StudentRosterRow } from './StudentRosterRow';
import { CoachApplicationCard } from './CoachApplicationCard';
import { AcceptBindRequestSheet } from './AcceptBindRequestSheet';
import { useApplicationActions } from './use-application-actions';
export function StudentRosterScreen() {
  const data = useCoachData();
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const actions = useApplicationActions();
  const filtered = data.rows.filter(row => row.student.displayName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const state = resolveRosterState(data.rosterState, filtered, search);
  return <Screen edges={['top', 'left', 'right']}><ScrollView importantForAccessibility={data.rosterState === 'failed' ? 'no-hide-descendants' : 'auto'} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={() => void data.model.refresh()} tintColor={colors.gold500} />} contentContainerStyle={pageContent}>
    <Copy display size={34}>{t('coach.shell.students')}</Copy>
    <View style={[rowStyle, { paddingHorizontal: spacing.space3, gap: spacing.space2, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderDefault, borderRadius: radius.control }]}><Icon name="search" size={17} tone="textDisabled" /><TextInput accessibilityLabel={t('coach.roster.searchStudents')} placeholder={t('coach.roster.searchStudents')} placeholderTextColor={colors.textDisabled} value={search} onChangeText={setSearch} style={{ ...font.body(14), flex: 1, color: colors.textPrimary, minHeight: spacing.minimumHitTarget }} />{search ? <Pressable accessibilityRole="button" accessibilityLabel={t('coach.roster.clearSearch')} onPress={() => setSearch('')} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="close-circle" tone="textDisabled" /></Pressable> : null}</View>
    {data.applications.length ? <><Copy mono size={12} tone="gold500">{t('coach.roster.sectionCount %@ %lld', [t('coach.roster.newStudentRequests'), data.applications.length])}</Copy>{data.applications.map(item => <CoachApplicationCard key={item.id} item={item} busy={actions.busy} onAccept={() => actions.openAccept(item)} onReject={() => actions.reject(item)} onProfile={() => router.push({ pathname: '/(coach)/application/[requestId]', params: { requestId: item.id, studentId: item.studentId, displayName: item.displayName, submittedAt: item.submittedAt.toISOString() } })} />)}</> : null}
    {state === 'loading' ? <View testID="coach.roster.loading" style={{ paddingVertical: spacing.point32, alignItems: 'center', gap: spacing.space2 }}><ActivityIndicator color={colors.gold500} /><Copy>{t('coach.roster.loadingStudents')}</Copy></View> : state === 'emptyRoster' ? <EmptyState title={t('coach.roster.noStudents')} subtitle={t('coach.roster.noStudentsSubtitle')} /> : state === 'noMatches' ? <EmptyState search title={t('coach.roster.noMatchingStudents')} /> : <>
      {([false, true] as const).map(abnormal => {
        const rows = filtered.filter(row => isAbnormal(row) === abnormal);
        if (abnormal && !rows.length) return null;
        return <View key={String(abnormal)} style={{ gap: spacing.point14 }}><Copy mono size={12} tone={abnormal ? 'danger' : 'textTertiary'}>{t('coach.roster.sectionCount %@ %lld', [t(abnormal ? 'coach.roster.abnormal' : 'coach.roster.active'), rows.length])}</Copy>{rows.map(row => <StudentRosterRow key={row.student.id} row={row} onPress={() => router.push({ pathname: '/(coach)/student/[studentId]', params: { studentId: row.student.id } })} />)}</View>;
      })}
    </>}
  </ScrollView>
    {data.rosterState === 'failed' ? <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgBase, paddingHorizontal: spacing.space5 }}><Icon name="warning-outline" tone="danger" size={32} /><Copy size={17} weight="bold">{t('coach.roster.loadFailed')}</Copy><Copy tone="textTertiary" style={{ textAlign: 'center' }}>{t('coach.roster.error.load')}</Copy><Pressable accessibilityRole="button" onPress={() => void data.model.refresh()} style={{ minHeight: 44, justifyContent: 'center' }}><Copy>{t('coach.detail.retry')}</Copy></Pressable></View> : null}
    <AcceptBindRequestSheet item={actions.acceptTarget} busy={actions.busy} onClose={actions.closeAccept} onConfirm={() => void actions.confirmAccept()} />
  </Screen>;
}
